import { createHash } from 'node:crypto'
import type pg from 'pg'
import { AppError } from '../../shared/errors/AppError.js'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'
import { ErrorRefs } from '../../shared/errors/errorRefs.js'
import { resolveInitialConveyorStepPlannedQuantity } from '../../shared/activityOperationalQuantity.js'
import { findTeamById } from '../teams/teams.repository.js'
import { collaboratorActiveForOperations } from './conveyorAssignments.service.js'
import {
  insertConveyorNodeAssignee,
  newAssignmentId,
} from './conveyorAssignments.repository.js'
import {
  findConveyorById,
  insertConveyorNode,
  listConveyorNodesByConveyorId,
  newNodeId,
} from './conveyors.repository.js'
import {
  loadConveyorStructureWithAssignees,
  mapDetailRowToApi,
  mergeConveyorMetadata,
  revalidateStructureOptions,
} from './conveyors.service.js'
import type { ConveyorDetailApi } from './conveyors.dto.js'
import type { PatchConveyorStructureBody } from './conveyors.schemas.js'
import { detectSyntheticSubtreeRollupInCreatePayload } from './conveyorCreateDiagnostics.js'
import {
  assertStructureDiffOwnershipAndHierarchy,
  buildStructureDiff,
  type StructureDiff,
  type StructureDiffCurrentNode,
} from './conveyor-structure-diff.js'
import {
  listActiveConveyorNodesForDiff,
  recomputeAndUpdateConveyorTotals,
  softDeleteConveyorNodeAssigneesForNodes,
  softDeleteConveyorNodes,
  updateConveyorNodeCadastralFields,
} from './conveyor-structure-diff.repository.js'
import { parseIdempotencyKeyHeader } from './conveyor-step-abort.service.js'
import { getConveyorOperationalEventByIdempotencyKey } from './operational-events/conveyor-operational-events.repository.js'
import { serviceCreateConveyorOperationalEvent } from './operational-events/conveyor-operational-events.service.js'
import type { ConveyorOperationalEventRow } from './operational-events/conveyor-operational-events.types.js'

export { parseIdempotencyKeyHeader }

function computeStructureDiffFingerprint(
  conveyorId: string,
  body: PatchConveyorStructureBody,
): string {
  const canonical = JSON.stringify({
    conveyorId,
    originType: body.originType,
    baseId: body.baseId ?? null,
    baseCode: body.baseCode ?? null,
    baseName: body.baseName ?? null,
    baseVersion: body.baseVersion ?? null,
    matrixRootItemId: body.matrixRootItemId ?? null,
    options: body.options,
  })
  return createHash('sha256').update(canonical, 'utf8').digest('hex')
}

function readFingerprint(metadataJson: Record<string, unknown> | null): string | null {
  const fp = metadataJson?.fingerprint
  return typeof fp === 'string' && fp.trim() ? fp.trim() : null
}

function eventMatchesStructureUpdate(
  event: Pick<ConveyorOperationalEventRow, 'event_type' | 'conveyor_id' | 'metadata_json'>,
  expected: { conveyorId: string; fingerprint: string },
): boolean {
  return (
    event.event_type === 'CONVEYOR_STRUCTURE_UPDATED' &&
    event.conveyor_id === expected.conveyorId &&
    readFingerprint(event.metadata_json) === expected.fingerprint
  )
}

async function assertAssigneesValidForInserts(
  pool: pg.Pool,
  inserts: StructureDiff['inserts'],
): Promise<void> {
  const collaboratorIds = new Set<string>()
  const teamIds = new Set<string>()
  for (const insert of inserts) {
    if (insert.kind !== 'STEP') continue
    for (const a of insert.assignees ?? []) {
      const t = a.type ?? 'COLLABORATOR'
      if (t === 'TEAM') {
        if (a.teamId) teamIds.add(a.teamId)
        continue
      }
      if (a.collaboratorId) collaboratorIds.add(a.collaboratorId)
    }
  }
  for (const cid of collaboratorIds) {
    const ok = await collaboratorActiveForOperations(pool, cid)
    if (!ok) {
      throw new AppError(
        'Colaborador de alocação inexistente, inativo ou indisponível.',
        422,
        ErrorCodes.VALIDATION_ERROR,
      )
    }
  }
  for (const tid of teamIds) {
    const t = await findTeamById(pool, tid)
    if (!t || !t.is_active || t.deleted_at) {
      throw new AppError(
        'Time de alocação inexistente ou inativo.',
        422,
        ErrorCodes.VALIDATION_ERROR,
      )
    }
  }
}

type LockedConveyorForDiffRow = {
  id: string
  metadata_json: unknown
  origin_register: 'MANUAL' | 'BASE' | 'HYBRID'
  base_ref_snapshot: string | null
  base_code_snapshot: string | null
  base_name_snapshot: string | null
  base_version_snapshot: number | null
}

async function lockConveyorForStructureDiff(
  client: pg.PoolClient,
  conveyorId: string,
): Promise<LockedConveyorForDiffRow> {
  const r = await client.query<LockedConveyorForDiffRow>(
    `
    SELECT id::text, metadata_json, origin_register,
           base_ref_snapshot, base_code_snapshot, base_name_snapshot, base_version_snapshot
      FROM conveyors
     WHERE id = $1::uuid AND deleted_at IS NULL
     FOR UPDATE
    `,
    [conveyorId],
  )
  const row = r.rows[0]
  if (!row) {
    throw new AppError('Esteira não encontrada.', 404, ErrorCodes.NOT_FOUND)
  }
  return row
}

/** Aplica os inserts na ordem recebida (pai sempre antes do filho — garantido pela travessia do payload). */
async function applyStructureDiffInserts(
  client: pg.PoolClient,
  conveyorId: string,
  inserts: StructureDiff['inserts'],
  currentActiveNodes: StructureDiffCurrentNode[],
): Promise<void> {
  const newIdByClientKey = new Map<string, string>()
  const rootIdByRef = new Map<string, string>(
    currentActiveNodes.map((n) => [n.id, n.root_id]),
  )

  function resolveParentId(ref: string | null): string | null {
    if (ref === null) return null
    return newIdByClientKey.get(ref) ?? ref
  }

  for (const insert of inserts) {
    const parentId = resolveParentId(insert.parentClientKey)
    const id = newNodeId()
    const levelDepth = insert.kind === 'OPTION' ? 0 : insert.kind === 'AREA' ? 1 : 2
    const rootId = insert.kind === 'OPTION' ? id : rootIdByRef.get(parentId!) ?? id

    newIdByClientKey.set(insert.clientKey, id)
    rootIdByRef.set(id, rootId)
    rootIdByRef.set(insert.clientKey, rootId)

    await insertConveyorNode(client, {
      id,
      conveyor_id: conveyorId,
      parent_id: parentId,
      root_id: rootId,
      node_type: insert.kind,
      source_origin: insert.sourceOrigin,
      code: null,
      name: insert.titulo.trim(),
      description: null,
      order_index: insert.orderIndex,
      level_depth: levelDepth,
      is_active: true,
      planned_minutes: insert.kind === 'STEP' ? insert.plannedMinutes ?? 0 : null,
      planned_quantity: insert.kind === 'STEP' ? resolveInitialConveyorStepPlannedQuantity() : 1,
      default_responsible_id: null,
      required: insert.kind === 'STEP' ? insert.required ?? true : true,
      source_key: insert.kind === 'STEP' ? insert.sourceKey ?? null : null,
      metadata_json: null,
      operational_status: insert.kind === 'STEP' ? 'PENDING' : null,
      operational_completed_at: null,
      operational_completed_by: null,
    })

    if (insert.kind === 'STEP') {
      const assignees = insert.assignees ?? []
      for (let i = 0; i < assignees.length; i++) {
        const a = assignees[i]!
        const t = a.type ?? 'COLLABORATOR'
        await insertConveyorNodeAssignee(client, {
          id: newAssignmentId(),
          conveyor_id: conveyorId,
          conveyor_node_id: id,
          assignment_type: t,
          collaborator_id: t === 'COLLABORATOR' ? a.collaboratorId ?? null : null,
          team_id: t === 'TEAM' ? a.teamId ?? null : null,
          is_primary: a.isPrimary,
          assignment_origin: a.assignmentOrigin ?? 'manual',
          order_index: a.orderIndex ?? i,
          metadata_json: null,
        })
      }
    }
  }
}

async function applyStructureDiffUpdates(
  client: pg.PoolClient,
  conveyorId: string,
  updates: StructureDiff['updates'],
): Promise<void> {
  for (const u of updates) {
    await updateConveyorNodeCadastralFields(client, {
      conveyorId,
      id: u.id,
      orderIndex: u.orderIndex,
      name: u.titulo,
      plannedMinutes: u.kind === 'STEP' ? u.plannedMinutes ?? null : null,
      required: u.kind === 'STEP' ? u.required ?? true : null,
    })
  }
}

async function applyStructureDiffRemovals(
  client: pg.PoolClient,
  conveyorId: string,
  removals: StructureDiff['removals'],
): Promise<void> {
  const allIds: string[] = []
  for (const r of removals) {
    allIds.push(r.id, ...r.cascadeNodeIds)
  }
  if (allIds.length === 0) return
  await softDeleteConveyorNodes(client, { conveyorId, nodeIds: allIds })
  await softDeleteConveyorNodeAssigneesForNodes(client, { conveyorId, nodeIds: allIds })
}

async function loadDetail(pool: pg.Pool, conveyorId: string): Promise<ConveyorDetailApi> {
  const rowAfter = await findConveyorById(pool, conveyorId)
  if (!rowAfter) {
    throw new AppError('Esteira não encontrada.', 404, ErrorCodes.NOT_FOUND)
  }
  const nodesAfter = await listConveyorNodesByConveyorId(pool, conveyorId)
  const structureAfter = await loadConveyorStructureWithAssignees(pool, conveyorId, nodesAfter)
  return mapDetailRowToApi(rowAfter, structureAfter)
}

export type StructureDiffApplySummary = {
  insertCount: number
  updateCount: number
  removeCount: number
  reorderCount: number
}

export type StructureDiffApplyResult = {
  detail: ConveyorDetailApi
  idempotent: boolean
  summary: StructureDiffApplySummary
}

/**
 * PATCH /conveyors/:id/structure — diff incremental que preserva IDs, funciona
 * em qualquer status operacional e nunca faz hard-delete de nó (soft-delete via
 * `conveyor_nodes.deleted_at`). Substitui o antigo `serviceReplaceConveyorStructure`
 * (replace destrutivo).
 */
export async function serviceApplyConveyorStructureDiff(
  pool: pg.Pool,
  input: {
    conveyorId: string
    actorAppUserId: string
    idempotencyKey: string
    body: PatchConveyorStructureBody
  },
): Promise<StructureDiffApplyResult> {
  revalidateStructureOptions(input.body.options)

  const officialRollup = detectSyntheticSubtreeRollupInCreatePayload(input.body)
  if (officialRollup.length > 0) {
    throw new AppError(
      'A estrutura contém uma etapa sintética de Matriz. Remova o item agregado e mantenha apenas as atividades reais.',
      422,
      ErrorCodes.CONVEYOR_SYNTHETIC_ROLLUP_STEP,
      { findings: officialRollup },
      {
        errorRef: ErrorRefs.CONVEYOR_CREATE_FAILED,
        category: 'BUSINESS',
        severity: 'warning',
      },
    )
  }

  const fingerprint = computeStructureDiffFingerprint(input.conveyorId, input.body)

  const client = await pool.connect()
  let idempotent = false
  let summary: StructureDiffApplySummary = {
    insertCount: 0,
    updateCount: 0,
    removeCount: 0,
    reorderCount: 0,
  }

  try {
    await client.query('BEGIN')
    const conveyor = await lockConveyorForStructureDiff(client, input.conveyorId)

    const existingEvent = await getConveyorOperationalEventByIdempotencyKey(
      client,
      input.idempotencyKey,
    )

    if (existingEvent) {
      if (!eventMatchesStructureUpdate(existingEvent, { conveyorId: input.conveyorId, fingerprint })) {
        throw new AppError(
          'Idempotency-Key já utilizada em outra operação.',
          409,
          ErrorCodes.CONFLICT,
        )
      }
      idempotent = true
      const meta = existingEvent.metadata_json
      summary = {
        insertCount: Number(meta?.insertCount ?? 0),
        updateCount: Number(meta?.updateCount ?? 0),
        removeCount: Number(meta?.removeCount ?? 0),
        reorderCount: Number(meta?.reorderCount ?? 0),
      }
      await client.query('COMMIT')
    } else {
      const currentActiveNodes = await listActiveConveyorNodesForDiff(client, input.conveyorId)

      assertStructureDiffOwnershipAndHierarchy({
        conveyorId: input.conveyorId,
        currentActiveNodes,
        requestedOptions: input.body.options,
      })

      const diff = buildStructureDiff({
        conveyorId: input.conveyorId,
        currentActiveNodes,
        requestedOptions: input.body.options,
      })

      await assertAssigneesValidForInserts(pool, diff.inserts)

      await applyStructureDiffInserts(client, input.conveyorId, diff.inserts, currentActiveNodes)
      await applyStructureDiffUpdates(client, input.conveyorId, diff.updates)
      await applyStructureDiffRemovals(client, input.conveyorId, diff.removals)

      const metaNext = mergeConveyorMetadata(conveyor.metadata_json, {
        matrixRootItemId:
          input.body.matrixRootItemId === undefined ? undefined : input.body.matrixRootItemId,
      })

      await recomputeAndUpdateConveyorTotals(client, input.conveyorId, {
        origin_register: input.body.originType,
        base_ref_snapshot: input.body.baseId ?? null,
        base_code_snapshot: input.body.baseCode ?? null,
        base_name_snapshot: input.body.baseName ?? null,
        base_version_snapshot: input.body.baseVersion ?? null,
        metadata_json: metaNext,
      })

      summary = diff.summary

      const occurredIso = new Date().toISOString()
      const ev = await serviceCreateConveyorOperationalEvent(client, {
        conveyorId: input.conveyorId,
        nodeId: null,
        eventType: 'CONVEYOR_STRUCTURE_UPDATED',
        previousValue: null,
        newValue: null,
        reason: 'STRUCTURE_DIFF_APPLIED',
        source: 'USER_ACTION',
        occurredAt: occurredIso,
        createdBy: input.actorAppUserId,
        idempotencyKey: input.idempotencyKey,
        metadataJson: {
          fingerprint,
          insertCount: diff.summary.insertCount,
          updateCount: diff.summary.updateCount,
          removeCount: diff.summary.removeCount,
          reorderCount: diff.summary.reorderCount,
          idempotencyKey: input.idempotencyKey,
        },
      })
      if (!ev.created) {
        if (!eventMatchesStructureUpdate(ev.event, { conveyorId: input.conveyorId, fingerprint })) {
          throw new AppError(
            'Idempotency-Key já utilizada em outra operação.',
            409,
            ErrorCodes.CONFLICT,
          )
        }
      }
      idempotent = !ev.created

      await client.query('COMMIT')
    }
  } catch (e) {
    try {
      await client.query('ROLLBACK')
    } catch {
      /* ignore */
    }
    throw e
  } finally {
    client.release()
  }

  const detail = await loadDetail(pool, input.conveyorId)
  return { detail, idempotent, summary }
}
