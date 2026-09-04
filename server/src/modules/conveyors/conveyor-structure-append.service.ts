import type pg from 'pg'
import { AppError } from '../../shared/errors/AppError.js'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'
import { ErrorRefs } from '../../shared/errors/errorRefs.js'
import {
  resolveActivityPlannedTotalMinutes,
  resolveInitialConveyorStepPlannedQuantity,
} from '../../shared/activityOperationalQuantity.js'
import { findTeamById } from '../teams/teams.repository.js'
import { appUserHasPermission } from '../permissions/permissions.repository.js'
import { parseIdempotencyKeyHeader } from './conveyor-step-abort.service.js'
import {
  computeStructureAppendFingerprint,
  fingerprintInputFromAppendBody,
  LATE_STRUCTURE_APPEND_REASON_CODE,
} from './conveyor-structure-append.fingerprint.js'
import { detectSyntheticSubtreeRollupInCreatePayload } from './conveyorCreateDiagnostics.js'
import { collaboratorActiveForOperations } from './conveyorAssignments.service.js'
import {
  insertConveyorNodeAssignee,
  newAssignmentId,
} from './conveyorAssignments.repository.js'
import type { ConveyorDetailApi } from './conveyors.dto.js'
import {
  findConveyorById,
  insertConveyorNode,
  listConveyorNodesByConveyorId,
  newNodeId,
  type ConveyorDetailRow,
} from './conveyors.repository.js'
import type {
  PostConveyorAreaBody,
  PostConveyorOptionBody,
  PostConveyorStepBody,
  PostConveyorStructureItemBody,
} from './conveyors.schemas.js'
import {
  loadConveyorStructureWithAssignees,
  mapDetailRowToApi,
} from './conveyors.service.js'
import { getConveyorOperationalEventByIdempotencyKey } from './operational-events/conveyor-operational-events.repository.js'
import { serviceCreateConveyorOperationalEvent } from './operational-events/conveyor-operational-events.service.js'
import type { ConveyorOperationalEventRow } from './operational-events/conveyor-operational-events.types.js'

export { parseIdempotencyKeyHeader }

function assertUniqueOrderIndices(
  items: readonly { orderIndex: number }[],
  label: string,
): void {
  const seen = new Set<number>()
  for (const it of items) {
    if (seen.has(it.orderIndex)) {
      throw new AppError(
        `${label}: orderIndex duplicado.`,
        422,
        ErrorCodes.VALIDATION_ERROR,
      )
    }
    seen.add(it.orderIndex)
  }
}

function revalidateOption(option: PostConveyorOptionBody): void {
  const areas = [...option.areas].sort((a, b) => a.orderIndex - b.orderIndex)
  assertUniqueOrderIndices(areas, `Áreas da opção "${option.titulo}"`)
  for (const ar of areas) {
    const steps = [...ar.steps].sort((a, b) => a.orderIndex - b.orderIndex)
    assertUniqueOrderIndices(steps, `Etapas da área "${ar.titulo}"`)
  }
}

function revalidateArea(area: PostConveyorAreaBody): void {
  const steps = [...area.steps].sort((a, b) => a.orderIndex - b.orderIndex)
  assertUniqueOrderIndices(steps, `Etapas da área "${area.titulo}"`)
}

function computeAreaTotals(area: PostConveyorAreaBody): {
  totalAreas: number
  totalSteps: number
  totalPlannedMinutes: number
} {
  let totalSteps = 0
  let totalPlannedMinutes = 0
  const steps = [...area.steps].sort((a, b) => a.orderIndex - b.orderIndex)
  for (const st of steps) {
    totalSteps++
    totalPlannedMinutes += resolveActivityPlannedTotalMinutes(
      st.plannedMinutes,
      resolveInitialConveyorStepPlannedQuantity(),
    )
  }
  return { totalAreas: 1, totalSteps, totalPlannedMinutes }
}

function computeOptionTotals(option: PostConveyorOptionBody): {
  totalAreas: number
  totalSteps: number
  totalPlannedMinutes: number
} {
  let totalAreas = 0
  let totalSteps = 0
  let totalPlannedMinutes = 0
  const areas = [...option.areas].sort((a, b) => a.orderIndex - b.orderIndex)
  for (const ar of areas) {
    const t = computeAreaTotals(ar)
    totalAreas += t.totalAreas
    totalSteps += t.totalSteps
    totalPlannedMinutes += t.totalPlannedMinutes
  }
  return { totalAreas, totalSteps, totalPlannedMinutes }
}

function computeStepTotals(step: PostConveyorStepBody): {
  totalAreas: number
  totalSteps: number
  totalPlannedMinutes: number
} {
  return {
    totalAreas: 0,
    totalSteps: 1,
    totalPlannedMinutes: resolveActivityPlannedTotalMinutes(
      step.plannedMinutes,
      resolveInitialConveyorStepPlannedQuantity(),
    ),
  }
}

function collectAssigneeTargetsFromSteps(
  steps: readonly PostConveyorStepBody[],
): {
  collaboratorIds: Set<string>
  teamIds: Set<string>
} {
  const collaboratorIds = new Set<string>()
  const teamIds = new Set<string>()
  for (const st of steps) {
    for (const a of st.assignees ?? []) {
      const t = a.type ?? 'COLLABORATOR'
      if (t === 'TEAM') {
        if (a.teamId) teamIds.add(a.teamId)
        continue
      }
      if (a.collaboratorId) collaboratorIds.add(a.collaboratorId)
    }
  }
  return { collaboratorIds, teamIds }
}

function collectAssigneeTargets(option: PostConveyorOptionBody) {
  return collectAssigneeTargetsFromSteps(option.areas.flatMap((ar) => ar.steps))
}

async function assertCanAppend(pool: pg.Pool, actorAppUserId: string): Promise<void> {
  const allowed = await appUserHasPermission(pool, actorAppUserId, 'conveyors.create')
  if (!allowed) {
    throw new AppError(
      'Sem permissão para incluir item na estrutura da esteira.',
      403,
      ErrorCodes.FORBIDDEN,
    )
  }
}

async function lockConveyorForUpdate(
  client: pg.PoolClient,
  conveyorId: string,
): Promise<ConveyorDetailRow> {
  const r = await client.query<{
    id: string
    code: string | null
    name: string
    client_name: string | null
    vehicle: string | null
    model_version: string | null
    plate: string | null
    initial_notes: string | null
    responsible: string | null
    priority: 'alta' | 'media' | 'baixa'
    origin_register: 'MANUAL' | 'BASE' | 'HYBRID'
    base_ref_snapshot: string | null
    base_code_snapshot: string | null
    base_name_snapshot: string | null
    base_version_snapshot: number | null
    metadata_json: unknown | null
    operational_status: string
    created_at: Date
    completed_at: Date | null
    estimated_deadline: string | null
    total_options: number
    total_areas: number
    total_steps: number
    total_planned_minutes: number
  }>(
    `
    SELECT
      id::text,
      code,
      name,
      client_name,
      vehicle,
      model_version,
      plate,
      initial_notes,
      responsible,
      priority,
      origin_register,
      base_ref_snapshot,
      base_code_snapshot,
      base_name_snapshot,
      base_version_snapshot,
      metadata_json,
      operational_status,
      created_at,
      completed_at,
      estimated_deadline,
      total_options,
      total_areas,
      total_steps,
      total_planned_minutes
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
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    client_name: row.client_name,
    vehicle: row.vehicle,
    model_version: row.model_version,
    plate: row.plate,
    initial_notes: row.initial_notes,
    responsible: row.responsible,
    priority: row.priority,
    origin_register: row.origin_register,
    base_ref_snapshot: row.base_ref_snapshot,
    base_code_snapshot: row.base_code_snapshot,
    base_name_snapshot: row.base_name_snapshot,
    base_version_snapshot: row.base_version_snapshot,
    metadata_json: row.metadata_json,
    operational_status: row.operational_status as ConveyorDetailRow['operational_status'],
    created_at: row.created_at.toISOString(),
    completed_at: row.completed_at ? row.completed_at.toISOString() : null,
    estimated_deadline: row.estimated_deadline,
    total_options: row.total_options,
    total_areas: row.total_areas,
    total_steps: row.total_steps,
    total_planned_minutes: row.total_planned_minutes,
  }
}

function fingerprintFromEventMetadata(meta: Record<string, unknown> | null): string | null {
  if (!meta || typeof meta !== 'object') return null
  const fp = meta.fingerprint
  return typeof fp === 'string' && fp.trim() ? fp.trim() : null
}

export type AppendIdsFromMetadata = {
  appendKind: 'OPTION' | 'AREA' | 'STEP' | null
  addedNodeId: string | null
  addedOptionId: string | null
  addedAreaId: string | null
  addedStepIds: string[]
}

function idsFromEventMetadata(meta: Record<string, unknown> | null): AppendIdsFromMetadata {
  if (!meta || typeof meta !== 'object') {
    return {
      appendKind: null,
      addedNodeId: null,
      addedOptionId: null,
      addedAreaId: null,
      addedStepIds: [],
    }
  }
  const rawKind = meta.appendKind
  const appendKind =
    rawKind === 'OPTION' || rawKind === 'AREA' || rawKind === 'STEP' ? rawKind : null
  const addedOptionId =
    typeof meta.addedOptionId === 'string' ? meta.addedOptionId : null
  const addedAreaId = typeof meta.addedAreaId === 'string' ? meta.addedAreaId : null
  const addedNodeId =
    typeof meta.addedNodeId === 'string'
      ? meta.addedNodeId
      : addedOptionId ?? addedAreaId ?? null
  const raw = meta.addedStepIds
  const addedStepIds = Array.isArray(raw)
    ? raw.filter((x): x is string => typeof x === 'string')
    : []
  return { appendKind, addedNodeId, addedOptionId, addedAreaId, addedStepIds }
}

/**
 * Matriz A8: evento existente com mesma esteira + CONVEYOR_STRUCTURE_ITEM_ADDED
 * + fingerprint → replay (noop); qualquer divergência → 409.
 * Exportado para testes unitários sem drift de regra local.
 */
export function assertEventMatchesAppend(
  event: ConveyorOperationalEventRow,
  expected: { conveyorId: string; fingerprint: string },
): void {
  if (
    event.event_type === 'CONVEYOR_STRUCTURE_ITEM_ADDED' &&
    event.conveyor_id === expected.conveyorId &&
    fingerprintFromEventMetadata(event.metadata_json) === expected.fingerprint
  ) {
    return
  }
  throw new AppError(
    'Idempotency-Key já utilizada em outra operação.',
    409,
    ErrorCodes.CONFLICT,
  )
}

/**
 * Replay exige IDs coerentes com o kind.
 * OPTION: addedOptionId obrigatório (legado).
 * AREA/STEP: addedNodeId (ou addedAreaId / primeiro step) — sem exigir addedOptionId.
 */
export function assertReplayIdsForKind(
  ids: AppendIdsFromMetadata,
  appendKind: 'OPTION' | 'AREA' | 'STEP',
): void {
  if (appendKind === 'OPTION') {
    if (!ids.addedOptionId) {
      throw new AppError(
        'Idempotency-Key já utilizada em outra operação.',
        409,
        ErrorCodes.CONFLICT,
      )
    }
    return
  }
  if (appendKind === 'AREA') {
    if (!ids.addedAreaId && !ids.addedNodeId) {
      throw new AppError(
        'Idempotency-Key já utilizada em outra operação.',
        409,
        ErrorCodes.CONFLICT,
      )
    }
    return
  }
  if (ids.addedStepIds.length === 0 && !ids.addedNodeId) {
    throw new AppError(
      'Idempotency-Key já utilizada em outra operação.',
      409,
      ErrorCodes.CONFLICT,
    )
  }
}

type ParentNodeRow = {
  id: string
  conveyor_id: string
  root_id: string
  parent_id: string | null
  node_type: 'OPTION' | 'AREA' | 'STEP'
  is_active: boolean
  deleted_at: Date | null
}

async function loadAndAssertParentNode(
  client: pg.PoolClient,
  input: {
    conveyorId: string
    parentId: string
    expectedType: 'OPTION' | 'AREA'
  },
): Promise<ParentNodeRow> {
  const r = await client.query<ParentNodeRow>(
    `
    SELECT
      id::text,
      conveyor_id::text,
      root_id::text,
      parent_id::text,
      node_type,
      is_active,
      deleted_at
    FROM conveyor_nodes
    WHERE id = $1::uuid
    `,
    [input.parentId],
  )
  const row = r.rows[0]
  if (!row || row.deleted_at != null) {
    throw new AppError(
      'Nó pai não encontrado ou removido.',
      422,
      ErrorCodes.VALIDATION_ERROR,
    )
  }
  if (row.conveyor_id !== input.conveyorId) {
    throw new AppError(
      'Nó pai não pertence a esta esteira.',
      422,
      ErrorCodes.VALIDATION_ERROR,
    )
  }
  if (!row.is_active) {
    throw new AppError('Nó pai está inativo.', 422, ErrorCodes.VALIDATION_ERROR)
  }
  if (row.node_type !== input.expectedType) {
    throw new AppError(
      input.expectedType === 'OPTION'
        ? 'Área tardia deve ser incluída sob uma tarefa (OPTION).'
        : 'Atividade tardia deve ser incluída sob um setor (AREA).',
      422,
      ErrorCodes.VALIDATION_ERROR,
    )
  }
  return row
}

async function nextSiblingOrderIndex(
  client: pg.PoolClient,
  input: {
    conveyorId: string
    parentId: string | null
    nodeType: 'OPTION' | 'AREA' | 'STEP'
  },
): Promise<number> {
  const r = await client.query<{ max: number | null }>(
    input.parentId == null
      ? `
        SELECT MAX(order_index) AS max
          FROM conveyor_nodes
         WHERE conveyor_id = $1::uuid
           AND deleted_at IS NULL
           AND node_type = $2
           AND parent_id IS NULL
        `
      : `
        SELECT MAX(order_index) AS max
          FROM conveyor_nodes
         WHERE conveyor_id = $1::uuid
           AND deleted_at IS NULL
           AND node_type = $2
           AND parent_id = $3::uuid
        `,
    input.parentId == null
      ? [input.conveyorId, input.nodeType]
      : [input.conveyorId, input.nodeType, input.parentId],
  )
  const max = r.rows[0]?.max
  return (typeof max === 'number' ? max : 0) + 1
}

async function insertStepAssignees(
  client: pg.PoolClient,
  input: {
    conveyorId: string
    stepId: string
    assignees: PostConveyorStepBody['assignees']
  },
): Promise<void> {
  const assignees = input.assignees ?? []
  for (let i = 0; i < assignees.length; i++) {
    const a = assignees[i]!
    const t = a.type ?? 'COLLABORATOR'
    await insertConveyorNodeAssignee(client, {
      id: newAssignmentId(),
      conveyor_id: input.conveyorId,
      conveyor_node_id: input.stepId,
      assignment_type: t,
      collaborator_id: t === 'COLLABORATOR' ? (a.collaboratorId ?? null) : null,
      team_id: t === 'TEAM' ? (a.teamId ?? null) : null,
      is_primary: a.isPrimary,
      assignment_origin: a.assignmentOrigin ?? 'base',
      order_index: a.orderIndex ?? i,
      metadata_json: null,
    })
  }
}

async function materializeAppendStepsUnderArea(
  client: pg.PoolClient,
  input: {
    conveyorId: string
    areaId: string
    rootId: string
    steps: PostConveyorStepBody[]
    stepMetadata: Record<string, unknown>
    /** Quando true, order_index do body é ignorado e usa nextSibling sob a área. */
    renumberFromSibling?: boolean
  },
): Promise<string[]> {
  const stepIds: string[] = []
  const steps = [...input.steps].sort((a, b) => a.orderIndex - b.orderIndex)
  let nextOrder = input.renumberFromSibling
    ? await nextSiblingOrderIndex(client, {
        conveyorId: input.conveyorId,
        parentId: input.areaId,
        nodeType: 'STEP',
      })
    : null

  for (const st of steps) {
    const stepId = newNodeId()
    stepIds.push(stepId)
    const orderIndex = nextOrder ?? st.orderIndex
    if (nextOrder != null) nextOrder += 1
    await insertConveyorNode(client, {
      id: stepId,
      conveyor_id: input.conveyorId,
      parent_id: input.areaId,
      root_id: input.rootId,
      node_type: 'STEP',
      source_origin: st.sourceOrigin,
      code: null,
      name: st.titulo.trim(),
      description: null,
      order_index: orderIndex,
      level_depth: 2,
      is_active: true,
      planned_minutes: st.plannedMinutes,
      planned_quantity: resolveInitialConveyorStepPlannedQuantity(),
      default_responsible_id: null,
      required: st.required ?? true,
      source_key: st.sourceKey?.trim() || null,
      metadata_json: input.stepMetadata,
      operational_status: 'PENDING',
      operational_completed_at: null,
      operational_completed_by: null,
    })
    await insertStepAssignees(client, {
      conveyorId: input.conveyorId,
      stepId,
      assignees: st.assignees,
    })
  }
  return stepIds
}

async function materializeAppendOption(
  client: pg.PoolClient,
  input: {
    conveyorId: string
    option: PostConveyorOptionBody
    optionOrderIndex: number
    stepMetadata: Record<string, unknown>
  },
): Promise<{ optionId: string; areaIds: string[]; stepIds: string[] }> {
  const optionId = newNodeId()
  const areaIds: string[] = []
  const stepIds: string[] = []

  await insertConveyorNode(client, {
    id: optionId,
    conveyor_id: input.conveyorId,
    parent_id: null,
    root_id: optionId,
    node_type: 'OPTION',
    source_origin: input.option.sourceOrigin,
    code: null,
    name: input.option.titulo.trim(),
    description: null,
    order_index: input.optionOrderIndex,
    level_depth: 0,
    is_active: true,
    planned_minutes: null,
    planned_quantity: 1,
    default_responsible_id: null,
    required: true,
    source_key: null,
    metadata_json: null,
    operational_status: null,
    operational_completed_at: null,
    operational_completed_by: null,
  })

  const areas = [...input.option.areas].sort((a, b) => a.orderIndex - b.orderIndex)
  for (const ar of areas) {
    const areaId = newNodeId()
    areaIds.push(areaId)
    await insertConveyorNode(client, {
      id: areaId,
      conveyor_id: input.conveyorId,
      parent_id: optionId,
      root_id: optionId,
      node_type: 'AREA',
      source_origin: ar.sourceOrigin,
      code: null,
      name: ar.titulo.trim(),
      description: null,
      order_index: ar.orderIndex,
      level_depth: 1,
      is_active: true,
      planned_minutes: null,
      planned_quantity: 1,
      default_responsible_id: null,
      required: true,
      source_key: null,
      metadata_json: null,
      operational_status: null,
      operational_completed_at: null,
      operational_completed_by: null,
    })

    const ids = await materializeAppendStepsUnderArea(client, {
      conveyorId: input.conveyorId,
      areaId,
      rootId: optionId,
      steps: ar.steps,
      stepMetadata: input.stepMetadata,
    })
    stepIds.push(...ids)
  }

  return { optionId, areaIds, stepIds }
}

async function materializeAppendArea(
  client: pg.PoolClient,
  input: {
    conveyorId: string
    parentOption: ParentNodeRow
    area: PostConveyorAreaBody
    stepMetadata: Record<string, unknown>
  },
): Promise<{ areaId: string; stepIds: string[] }> {
  const areaId = newNodeId()
  const orderIndex = await nextSiblingOrderIndex(client, {
    conveyorId: input.conveyorId,
    parentId: input.parentOption.id,
    nodeType: 'AREA',
  })
  await insertConveyorNode(client, {
    id: areaId,
    conveyor_id: input.conveyorId,
    parent_id: input.parentOption.id,
    root_id: input.parentOption.root_id,
    node_type: 'AREA',
    source_origin: input.area.sourceOrigin,
    code: null,
    name: input.area.titulo.trim(),
    description: null,
    order_index: orderIndex,
    level_depth: 1,
    is_active: true,
    planned_minutes: null,
    planned_quantity: 1,
    default_responsible_id: null,
    required: true,
    source_key: null,
    metadata_json: null,
    operational_status: null,
    operational_completed_at: null,
    operational_completed_by: null,
  })

  const stepIds = await materializeAppendStepsUnderArea(client, {
    conveyorId: input.conveyorId,
    areaId,
    rootId: input.parentOption.root_id,
    steps: input.area.steps,
    stepMetadata: input.stepMetadata,
  })
  return { areaId, stepIds }
}

async function updateConveyorTotalsOnly(
  client: pg.PoolClient,
  conveyorId: string,
  totals: {
    total_options: number
    total_areas: number
    total_steps: number
    total_planned_minutes: number
  },
): Promise<void> {
  await client.query(
    `
    UPDATE conveyors SET
      total_options = $2,
      total_areas = $3,
      total_steps = $4,
      total_planned_minutes = $5,
      updated_at = now()
    WHERE id = $1::uuid AND deleted_at IS NULL
    `,
    [
      conveyorId,
      totals.total_options,
      totals.total_areas,
      totals.total_steps,
      totals.total_planned_minutes,
    ],
  )
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

function assertNoSyntheticRollupForAppend(body: PostConveyorStructureItemBody): void {
  const kind = body.appendKind
  if (kind === 'OPTION') {
    const rollup = detectSyntheticSubtreeRollupInCreatePayload({
      options: [body.option],
    })
    if (rollup.length > 0) {
      throw new AppError(
        'A estrutura contém uma etapa sintética de Matriz. Remova o item agregado e mantenha apenas as atividades reais.',
        422,
        ErrorCodes.CONVEYOR_SYNTHETIC_ROLLUP_STEP,
        { findings: rollup },
        {
          errorRef: ErrorRefs.CONVEYOR_CREATE_FAILED,
          category: 'BUSINESS',
          severity: 'warning',
        },
      )
    }
    return
  }
  if (kind === 'AREA') {
    // Adaptação: envolve a área sob OPTION placeholder que não casa com títulos de step.
    const rollup = detectSyntheticSubtreeRollupInCreatePayload({
      options: [
        {
          titulo: '__late_append_area__',
          orderIndex: 1,
          sourceOrigin: body.area.sourceOrigin,
          areas: [body.area],
        },
      ],
    })
    if (rollup.length > 0) {
      throw new AppError(
        'A estrutura contém uma etapa sintética de Matriz. Remova o item agregado e mantenha apenas as atividades reais.',
        422,
        ErrorCodes.CONVEYOR_SYNTHETIC_ROLLUP_STEP,
        { findings: rollup },
        {
          errorRef: ErrorRefs.CONVEYOR_CREATE_FAILED,
          category: 'BUSINESS',
          severity: 'warning',
        },
      )
    }
  }
  // STEP único: detector de rollup de subárvore não se aplica.
}

async function assertAssigneesValid(
  pool: pg.Pool,
  targets: { collaboratorIds: Set<string>; teamIds: Set<string> },
): Promise<void> {
  for (const cid of targets.collaboratorIds) {
    const ok = await collaboratorActiveForOperations(pool, cid)
    if (!ok) {
      throw new AppError(
        'Colaborador de alocação inexistente, inativo ou indisponível.',
        422,
        ErrorCodes.VALIDATION_ERROR,
      )
    }
  }
  for (const tid of targets.teamIds) {
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

export type AppendStructureItemResult = {
  detail: ConveyorDetailApi
  structureItemAppendIdempotent: boolean
  appendKind: 'OPTION' | 'AREA' | 'STEP'
  addedNodeId: string
  addedOptionId: string | null
  addedAreaId: string | null
  addedStepIds: string[]
}

export async function serviceAppendConveyorStructureItem(
  pool: pg.Pool,
  input: {
    conveyorId: string
    actorAppUserId: string
    idempotencyKey: string
    body: PostConveyorStructureItemBody
  },
): Promise<AppendStructureItemResult> {
  await assertCanAppend(pool, input.actorAppUserId)

  const body = input.body
  const appendKind = body.appendKind
  const reason = body.reason
  const matrixRootItemId =
    body.matrixRootItemId === undefined ? null : body.matrixRootItemId

  if (appendKind === 'OPTION') {
    revalidateOption(body.option)
  } else if (appendKind === 'AREA') {
    revalidateArea(body.area)
  }

  const fingerprint = computeStructureAppendFingerprint(
    fingerprintInputFromAppendBody(input.conveyorId, body),
  )

  const assigneeTargets =
    appendKind === 'OPTION'
      ? collectAssigneeTargets(body.option)
      : appendKind === 'AREA'
        ? collectAssigneeTargetsFromSteps(body.area.steps)
        : collectAssigneeTargetsFromSteps([body.step])
  await assertAssigneesValid(pool, assigneeTargets)
  assertNoSyntheticRollupForAppend(body)

  const deltaTotals =
    appendKind === 'OPTION'
      ? { totalOptions: 1, ...computeOptionTotals(body.option) }
      : appendKind === 'AREA'
        ? { totalOptions: 0, ...computeAreaTotals(body.area) }
        : { totalOptions: 0, ...computeStepTotals(body.step) }

  const client = await pool.connect()
  let structureItemAppendIdempotent = false
  let addedOptionId: string | null = null
  let addedAreaId: string | null = null
  let addedNodeId = ''
  let addedStepIds: string[] = []

  try {
    await client.query('BEGIN')
    const conveyor = await lockConveyorForUpdate(client, input.conveyorId)

    const existing = await getConveyorOperationalEventByIdempotencyKey(
      client,
      input.idempotencyKey,
    )
    if (existing) {
      assertEventMatchesAppend(existing, {
        conveyorId: input.conveyorId,
        fingerprint,
      })
      const ids = idsFromEventMetadata(existing.metadata_json)
      assertReplayIdsForKind(ids, appendKind)
      structureItemAppendIdempotent = true
      addedOptionId = ids.addedOptionId
      addedAreaId = ids.addedAreaId
      addedStepIds = ids.addedStepIds
      addedNodeId =
        ids.addedNodeId ??
        ids.addedOptionId ??
        ids.addedAreaId ??
        ids.addedStepIds[0] ??
        ''
      await client.query('COMMIT')
    } else {
      if (conveyor.operational_status !== 'EM_ANDAMENTO') {
        throw new AppError(
          'Inclusão tardia de item só é permitida em esteira em andamento.',
          422,
          ErrorCodes.VALIDATION_ERROR,
        )
      }

      const occurredIso = new Date().toISOString()
      const stepMetadata = {
        lateAddToWeeklyBacklog: true,
        lateAddAt: occurredIso,
        lateAddReason: reason,
        lateAddByUserId: input.actorAppUserId,
      }

      if (appendKind === 'OPTION') {
        const optionOrderIndex = await nextSiblingOrderIndex(client, {
          conveyorId: input.conveyorId,
          parentId: null,
          nodeType: 'OPTION',
        })
        const materialized = await materializeAppendOption(client, {
          conveyorId: input.conveyorId,
          option: body.option,
          optionOrderIndex,
          stepMetadata,
        })
        addedOptionId = materialized.optionId
        addedAreaId = materialized.areaIds[0] ?? null
        addedNodeId = materialized.optionId
        addedStepIds = materialized.stepIds
      } else if (appendKind === 'AREA') {
        const parent = await loadAndAssertParentNode(client, {
          conveyorId: input.conveyorId,
          parentId: body.targetParentNodeId,
          expectedType: 'OPTION',
        })
        const materialized = await materializeAppendArea(client, {
          conveyorId: input.conveyorId,
          parentOption: parent,
          area: body.area,
          stepMetadata,
        })
        addedOptionId = null
        addedAreaId = materialized.areaId
        addedNodeId = materialized.areaId
        addedStepIds = materialized.stepIds
      } else {
        const parent = await loadAndAssertParentNode(client, {
          conveyorId: input.conveyorId,
          parentId: body.targetParentNodeId,
          expectedType: 'AREA',
        })
        const stepIds = await materializeAppendStepsUnderArea(client, {
          conveyorId: input.conveyorId,
          areaId: parent.id,
          rootId: parent.root_id,
          steps: [body.step],
          stepMetadata,
          renumberFromSibling: true,
        })
        addedOptionId = null
        addedAreaId = null
        addedNodeId = stepIds[0]!
        addedStepIds = stepIds
      }

      await updateConveyorTotalsOnly(client, input.conveyorId, {
        total_options: conveyor.total_options + deltaTotals.totalOptions,
        total_areas: conveyor.total_areas + deltaTotals.totalAreas,
        total_steps: conveyor.total_steps + deltaTotals.totalSteps,
        total_planned_minutes:
          conveyor.total_planned_minutes + deltaTotals.totalPlannedMinutes,
      })

      const targetParentNodeId =
        appendKind === 'OPTION' ? null : body.targetParentNodeId

      const ev = await serviceCreateConveyorOperationalEvent(client, {
        conveyorId: input.conveyorId,
        nodeId: addedNodeId,
        eventType: 'CONVEYOR_STRUCTURE_ITEM_ADDED',
        previousValue: null,
        newValue: addedNodeId,
        reason: LATE_STRUCTURE_APPEND_REASON_CODE,
        source: 'USER_ACTION',
        occurredAt: occurredIso,
        createdBy: input.actorAppUserId,
        idempotencyKey: input.idempotencyKey,
        metadataJson: {
          fingerprint,
          reason,
          originType: body.originType,
          matrixRootItemId,
          appendKind,
          targetParentNodeId,
          addedNodeId,
          addedOptionId,
          addedAreaId,
          addedStepIds,
          idempotencyKey: input.idempotencyKey,
        },
      })
      if (!ev.created) {
        assertEventMatchesAppend(ev.event, {
          conveyorId: input.conveyorId,
          fingerprint,
        })
        const ids = idsFromEventMetadata(ev.event.metadata_json)
        assertReplayIdsForKind(ids, appendKind)
        structureItemAppendIdempotent = true
        addedOptionId = ids.addedOptionId
        addedAreaId = ids.addedAreaId
        addedStepIds = ids.addedStepIds.length ? ids.addedStepIds : addedStepIds
        addedNodeId =
          ids.addedNodeId ??
          ids.addedOptionId ??
          ids.addedAreaId ??
          ids.addedStepIds[0] ??
          addedNodeId
      }

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
  return {
    detail,
    structureItemAppendIdempotent,
    appendKind,
    addedNodeId,
    addedOptionId,
    addedAreaId,
    addedStepIds,
  }
}
