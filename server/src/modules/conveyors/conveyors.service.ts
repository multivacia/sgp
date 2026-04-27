import { randomUUID } from 'node:crypto'
import type pg from 'pg'
import { AppError } from '../../shared/errors/AppError.js'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'
import { ErrorRefs } from '../../shared/errors/errorRefs.js'
import { collaboratorExists } from '../operation-matrix/operation-matrix.repository.js'
import { findTeamById } from '../teams/teams.repository.js'
import type {
  ConveyorCreatedApi,
  ConveyorDetailApi,
  ConveyorListItemApi,
  ConveyorStructureApi,
  ConveyorStructureStepAssigneeApi,
} from './conveyors.dto.js'
import {
  countActiveTimeEntriesByConveyor,
  deleteConveyorAssigneesAndNodes,
  findConveyorById,
  insertConveyor,
  insertConveyorNode,
  listConveyorNodesByConveyorId,
  listConveyors,
  newNodeId,
  updateConveyorDados,
  updateConveyorOperationalStatus,
  updateConveyorStructureMeta,
  type CompletedAtUpdateMode,
  type ConveyorDetailRow,
  type ConveyorListRow,
  type ConveyorNodeFlatRow,
  type ConveyorOperationalStatusDb,
  type ListConveyorsFilters,
  type PatchConveyorDadosFields,
} from './conveyors.repository.js'
import type {
  PatchConveyorDadosBody,
  PatchConveyorStructureBody,
  PostConveyorBody,
} from './conveyors.schemas.js'
import {
  insertConveyorNodeAssignee,
  listConveyorNodeAssigneesForConveyorDetail,
  newAssignmentId,
  type ConveyorNodeAssigneeDetailRow,
} from './conveyorAssignments.repository.js'
import { collaboratorActiveForOperations } from './conveyorAssignments.service.js'

function emptyToNull(s: string | undefined): string | null {
  const t = (s ?? '').trim()
  return t === '' ? null : t
}

function normalizePriority(
  p: string | undefined,
): 'alta' | 'media' | 'baixa' {
  if (p === 'alta' || p === 'media' || p === 'baixa') return p
  return 'media'
}

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

function computeTotalsForOptions(options: PostConveyorBody['options']): {
  totalOptions: number
  totalAreas: number
  totalSteps: number
  totalPlannedMinutes: number
} {
  let totalAreas = 0
  let totalSteps = 0
  let totalPlannedMinutes = 0
  const sortedOptions = [...options].sort(
    (a, b) => a.orderIndex - b.orderIndex,
  )
  for (const op of sortedOptions) {
    const areas = [...op.areas].sort((a, b) => a.orderIndex - b.orderIndex)
    for (const ar of areas) {
      totalAreas++
      const steps = [...ar.steps].sort((a, b) => a.orderIndex - b.orderIndex)
      for (const st of steps) {
        totalSteps++
        totalPlannedMinutes += st.plannedMinutes
      }
    }
  }
  return {
    totalOptions: sortedOptions.length,
    totalAreas,
    totalSteps,
    totalPlannedMinutes,
  }
}

function computeTotals(body: PostConveyorBody): {
  totalOptions: number
  totalAreas: number
  totalSteps: number
  totalPlannedMinutes: number
} {
  return computeTotalsForOptions(body.options)
}

function mapListRowToApi(row: ConveyorListRow): ConveyorListItemApi {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    clientName: row.client_name,
    responsible: row.responsible,
    priority: row.priority,
    originRegister: row.origin_register,
    createdAt: row.created_at,
    operationalStatus: row.operational_status,
    completedAt: row.completed_at,
    estimatedDeadline: row.estimated_deadline,
    totalSteps: row.total_steps,
  }
}

function parseConveyorMetadataJson(m: unknown): {
  colaboradorId: string | null
  matrixRootItemId: string | null
} {
  if (!m || typeof m !== 'object') {
    return { colaboradorId: null, matrixRootItemId: null }
  }
  const o = m as Record<string, unknown>
  const cid = o.colaboradorId
  const mid = o.matrixRootItemId
  return {
    colaboradorId: typeof cid === 'string' ? cid : null,
    matrixRootItemId: typeof mid === 'string' ? mid : null,
  }
}

function mapDetailRowToApi(
  row: ConveyorDetailRow,
  structure: ConveyorStructureApi,
): ConveyorDetailApi {
  const meta = parseConveyorMetadataJson(row.metadata_json)
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    clientName: row.client_name,
    vehicle: row.vehicle,
    modelVersion: row.model_version,
    plate: row.plate,
    initialNotes: row.initial_notes,
    responsible: row.responsible,
    priority: row.priority,
    originRegister: row.origin_register,
    baseRefSnapshot: row.base_ref_snapshot,
    baseCodeSnapshot: row.base_code_snapshot,
    baseNameSnapshot: row.base_name_snapshot,
    baseVersionSnapshot: row.base_version_snapshot,
    matrixRootItemId: meta.matrixRootItemId,
    operationalStatus: row.operational_status,
    createdAt: row.created_at,
    completedAt: row.completed_at,
    estimatedDeadline: row.estimated_deadline,
    totalOptions: row.total_options,
    totalAreas: row.total_areas,
    totalSteps: row.total_steps,
    totalPlannedMinutes: row.total_planned_minutes,
    structure,
  }
}

/** Matriz v1 — transições permitidas (par origem|destino). */
const ALLOWED_STATUS_TRANSITIONS = new Set<string>([
  'NO_BACKLOG|EM_REVISAO',
  'EM_REVISAO|PRONTA_LIBERAR',
  'PRONTA_LIBERAR|EM_PRODUCAO',
  'EM_PRODUCAO|CONCLUIDA',
  'EM_REVISAO|NO_BACKLOG',
  'PRONTA_LIBERAR|EM_REVISAO',
  'CONCLUIDA|EM_PRODUCAO',
  'CONCLUIDA|EM_REVISAO',
])

function isTransitionAllowed(
  from: ConveyorOperationalStatusDb,
  to: ConveyorOperationalStatusDb,
): boolean {
  return ALLOWED_STATUS_TRANSITIONS.has(`${from}|${to}`)
}

function resolveCompletedAtMode(
  current: ConveyorOperationalStatusDb,
  next: ConveyorOperationalStatusDb,
): CompletedAtUpdateMode {
  if (next === 'CONCLUIDA') return 'now'
  if (current === 'CONCLUIDA') return 'clear'
  return 'keep'
}

export function buildConveyorStructureFromNodes(
  rows: ConveyorNodeFlatRow[],
): ConveyorStructureApi {
  const options = rows
    .filter((r) => r.node_type === 'OPTION')
    .sort((a, b) => a.order_index - b.order_index)
  return {
    options: options.map((opt) => ({
      id: opt.id,
      name: opt.name,
      orderIndex: opt.order_index,
      areas: rows
        .filter((r) => r.parent_id === opt.id && r.node_type === 'AREA')
        .sort((a, b) => a.order_index - b.order_index)
        .map((area) => ({
          id: area.id,
          name: area.name,
          orderIndex: area.order_index,
          steps: rows
            .filter((r) => r.parent_id === area.id && r.node_type === 'STEP')
            .sort((a, b) => a.order_index - b.order_index)
            .map((st) => ({
              id: st.id,
              name: st.name,
              orderIndex: st.order_index,
              plannedMinutes: st.planned_minutes,
              assignees: [],
            })),
        })),
    })),
  }
}

function mapAssigneeDetailRowToApi(
  row: ConveyorNodeAssigneeDetailRow,
): ConveyorStructureStepAssigneeApi {
  return {
    type: row.assignment_type,
    collaboratorId: row.collaborator_id,
    collaboratorName: row.collaborator_name,
    teamId: row.team_id,
    teamName: row.team_name,
    isPrimary: row.is_primary,
    orderIndex: row.order_index,
  }
}

/** Estrutura de nós + alocações por etapa (uma leitura de assignees). */
async function loadConveyorStructureWithAssignees(
  pool: pg.Pool,
  conveyorId: string,
  nodes: ConveyorNodeFlatRow[],
): Promise<ConveyorStructureApi> {
  const structure = buildConveyorStructureFromNodes(nodes)
  const rows = await listConveyorNodeAssigneesForConveyorDetail(pool, conveyorId)
  const byNode = new Map<string, ConveyorStructureStepAssigneeApi[]>()
  for (const row of rows) {
    const api = mapAssigneeDetailRowToApi(row)
    const list = byNode.get(row.conveyor_node_id) ?? []
    list.push(api)
    byNode.set(row.conveyor_node_id, list)
  }
  return {
    options: structure.options.map((opt) => ({
      ...opt,
      areas: opt.areas.map((ar) => ({
        ...ar,
        steps: ar.steps.map((st) => ({
          ...st,
          assignees: byNode.get(st.id) ?? [],
        })),
      })),
    })),
  }
}

export async function serviceGetConveyorById(
  pool: pg.Pool,
  id: string,
): Promise<ConveyorDetailApi | null> {
  const row = await findConveyorById(pool, id)
  if (!row) return null
  const nodes = await listConveyorNodesByConveyorId(pool, id)
  const structure = await loadConveyorStructureWithAssignees(pool, id, nodes)
  return mapDetailRowToApi(row, structure)
}

export async function servicePatchConveyorStatus(
  pool: pg.Pool,
  conveyorId: string,
  nextStatus: ConveyorOperationalStatusDb,
): Promise<ConveyorDetailApi | null> {
  const row = await findConveyorById(pool, conveyorId)
  if (!row) return null

  if (row.operational_status === nextStatus) {
    throw new AppError(
      'Não é permitido alterar para o mesmo status.',
      422,
      ErrorCodes.INVALID_STATUS_TRANSITION,
    )
  }

  if (!isTransitionAllowed(row.operational_status, nextStatus)) {
    throw new AppError(
      `Não é permitido mudar de ${row.operational_status} para ${nextStatus}.`,
      422,
      ErrorCodes.INVALID_STATUS_TRANSITION,
    )
  }

  const mode = resolveCompletedAtMode(row.operational_status, nextStatus)
  const updated = await updateConveyorOperationalStatus(
    pool,
    conveyorId,
    nextStatus,
    mode,
  )
  if (!updated) return null

  const nodes = await listConveyorNodesByConveyorId(pool, conveyorId)
  const structure = await loadConveyorStructureWithAssignees(pool, conveyorId, nodes)
  return mapDetailRowToApi(updated, structure)
}

export async function serviceListConveyors(
  pool: pg.Pool,
  filters: ListConveyorsFilters,
): Promise<ConveyorListItemApi[]> {
  const rows = await listConveyors(pool, filters)
  return rows.map(mapListRowToApi)
}

function revalidateStructureOptions(
  options: PostConveyorBody['options'],
): void {
  const sortedOptions = [...options].sort((a, b) => a.orderIndex - b.orderIndex)
  assertUniqueOrderIndices(sortedOptions, 'Opções')

  for (const op of sortedOptions) {
    const areas = [...op.areas].sort((a, b) => a.orderIndex - b.orderIndex)
    assertUniqueOrderIndices(areas, `Áreas da opção "${op.titulo}"`)
    for (const ar of areas) {
      const steps = [...ar.steps].sort((a, b) => a.orderIndex - b.orderIndex)
      assertUniqueOrderIndices(steps, `Etapas da área "${ar.titulo}"`)
    }
  }
}

function revalidateStructure(body: PostConveyorBody): void {
  revalidateStructureOptions(body.options)
}

function collectAssigneeTargetsFromOptions(
  options: PostConveyorBody['options'],
): { collaboratorIds: Set<string>; teamIds: Set<string> } {
  const collaboratorIds = new Set<string>()
  const teamIds = new Set<string>()
  for (const op of options) {
    for (const ar of op.areas) {
      for (const st of ar.steps) {
        for (const a of st.assignees ?? []) {
          const t = a.type ?? 'COLLABORATOR'
          if (t === 'TEAM') {
            if (a.teamId) teamIds.add(a.teamId)
            continue
          }
          if (a.collaboratorId) collaboratorIds.add(a.collaboratorId)
        }
      }
    }
  }
  return { collaboratorIds, teamIds }
}

function collectAssigneeTargets(body: PostConveyorBody): {
  collaboratorIds: Set<string>
  teamIds: Set<string>
} {
  return collectAssigneeTargetsFromOptions(body.options)
}

async function materializeConveyorOptions(
  client: pg.PoolClient,
  conveyorId: string,
  options: PostConveyorBody['options'],
): Promise<void> {
  const sortedOptions = [...options].sort(
    (a, b) => a.orderIndex - b.orderIndex,
  )
  for (const op of sortedOptions) {
    const optionId = newNodeId()
    await insertConveyorNode(client, {
      id: optionId,
      conveyor_id: conveyorId,
      parent_id: null,
      root_id: optionId,
      node_type: 'OPTION',
      source_origin: op.sourceOrigin,
      code: null,
      name: op.titulo.trim(),
      description: null,
      order_index: op.orderIndex,
      level_depth: 0,
      is_active: true,
      planned_minutes: null,
      default_responsible_id: null,
      required: true,
      source_key: null,
      metadata_json: null,
    })

    const areas = [...op.areas].sort((a, b) => a.orderIndex - b.orderIndex)
    for (const ar of areas) {
      const areaId = newNodeId()
      await insertConveyorNode(client, {
        id: areaId,
        conveyor_id: conveyorId,
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
        default_responsible_id: null,
        required: true,
        source_key: null,
        metadata_json: null,
      })

      const steps = [...ar.steps].sort((a, b) => a.orderIndex - b.orderIndex)
      for (const st of steps) {
        const stepId = newNodeId()
        await insertConveyorNode(client, {
          id: stepId,
          conveyor_id: conveyorId,
          parent_id: areaId,
          root_id: optionId,
          node_type: 'STEP',
          source_origin: st.sourceOrigin,
          code: null,
          name: st.titulo.trim(),
          description: null,
          order_index: st.orderIndex,
          level_depth: 2,
          is_active: true,
          planned_minutes: st.plannedMinutes,
          default_responsible_id: null,
          required: st.required ?? true,
          source_key: null,
          metadata_json: null,
        })

        const assignees = st.assignees ?? []
        for (let i = 0; i < assignees.length; i++) {
          const a = assignees[i]!
          const t = a.type ?? 'COLLABORATOR'
          await insertConveyorNodeAssignee(client, {
            id: newAssignmentId(),
            conveyor_id: conveyorId,
            conveyor_node_id: stepId,
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
    }
  }
}

export async function serviceCreateConveyor(
  pool: pg.Pool,
  body: PostConveyorBody,
): Promise<ConveyorCreatedApi> {
  revalidateStructure(body)
  const totals = computeTotals(body)

  const dados = body.dados
  if (dados.colaboradorId) {
    const ok = await collaboratorExists(pool, dados.colaboradorId)
    if (!ok) {
      throw new AppError(
        'Colaborador (responsável) não encontrado.',
        422,
        ErrorCodes.VALIDATION_ERROR,
        undefined,
        {
          errorRef: ErrorRefs.CONVEYOR_CREATE_FAILED,
          category: 'BUSINESS',
          severity: 'warning',
        },
      )
    }
  }

  const assigneeTargets = collectAssigneeTargets(body)
  for (const cid of assigneeTargets.collaboratorIds) {
    const ok = await collaboratorActiveForOperations(pool, cid)
    if (!ok) {
      throw new AppError(
        'Colaborador de alocação inexistente, inativo ou indisponível.',
        422,
        ErrorCodes.VALIDATION_ERROR,
        undefined,
        {
          errorRef: ErrorRefs.CONVEYOR_CREATE_FAILED,
          category: 'BUSINESS',
          severity: 'warning',
        },
      )
    }
  }
  for (const tid of assigneeTargets.teamIds) {
    const t = await findTeamById(pool, tid)
    if (!t || !t.is_active || t.deleted_at) {
      throw new AppError(
        'Time de alocação inexistente ou inativo.',
        422,
        ErrorCodes.VALIDATION_ERROR,
        undefined,
        {
          errorRef: ErrorRefs.CONVEYOR_CREATE_FAILED,
          category: 'BUSINESS',
          severity: 'warning',
        },
      )
    }
  }

  const priority = normalizePriority(dados.prioridade)
  const conveyorId = randomUUID()
  const code: string | null = null

  const metadata_json = {
    colaboradorId: dados.colaboradorId ?? null,
    matrixRootItemId: body.matrixRootItemId ?? null,
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const { created_at } = await insertConveyor(client, {
      id: conveyorId,
      code,
      name: dados.nome.trim(),
      client_name: emptyToNull(dados.cliente),
      vehicle: emptyToNull(dados.veiculo),
      model_version: emptyToNull(dados.modeloVersao),
      plate: emptyToNull(dados.placa),
      initial_notes: emptyToNull(dados.observacoes),
      responsible: emptyToNull(dados.responsavel),
      estimated_deadline: emptyToNull(dados.prazoEstimado),
      priority,
      origin_register: body.originType,
      base_ref_snapshot: body.baseId ?? null,
      base_code_snapshot: body.baseCode ?? null,
      base_name_snapshot: body.baseName ?? null,
      base_version_snapshot: body.baseVersion ?? null,
      total_options: totals.totalOptions,
      total_areas: totals.totalAreas,
      total_steps: totals.totalSteps,
      total_planned_minutes: totals.totalPlannedMinutes,
      metadata_json,
      operational_status: 'NO_BACKLOG',
      completed_at: null,
    })

    await materializeConveyorOptions(client, conveyorId, body.options)

    await client.query('COMMIT')

    return {
      id: conveyorId,
      code,
      name: dados.nome.trim(),
      priority,
      originRegister: body.originType,
      operationalStatus: 'NO_BACKLOG',
      totals: {
        totalOptions: totals.totalOptions,
        totalAreas: totals.totalAreas,
        totalSteps: totals.totalSteps,
        totalPlannedMinutes: totals.totalPlannedMinutes,
      },
      createdAt: created_at,
    }
  } catch (err) {
    try {
      await client.query('ROLLBACK')
    } catch {
      /* ignore */
    }
    throw err
  } finally {
    client.release()
  }
}

function mergeConveyorMetadata(
  current: unknown,
  patch: { colaboradorId?: string | null; matrixRootItemId?: string | null },
): { colaboradorId: string | null; matrixRootItemId: string | null } {
  const cur = parseConveyorMetadataJson(current)
  return {
    colaboradorId:
      patch.colaboradorId !== undefined ? patch.colaboradorId : cur.colaboradorId,
    matrixRootItemId:
      patch.matrixRootItemId !== undefined
        ? patch.matrixRootItemId
        : cur.matrixRootItemId,
  }
}

export async function servicePatchConveyorDados(
  pool: pg.Pool,
  conveyorId: string,
  body: PatchConveyorDadosBody,
): Promise<ConveyorDetailApi | null> {
  const existing = await findConveyorById(pool, conveyorId)
  if (!existing) return null

  const patch: PatchConveyorDadosFields = {}

  if (body.nome !== undefined) {
    patch.name = body.nome.trim()
  }
  if (body.cliente !== undefined) {
    patch.client_name = emptyToNull(body.cliente)
  }
  if (body.veiculo !== undefined) {
    patch.vehicle = emptyToNull(body.veiculo)
  }
  if (body.modeloVersao !== undefined) {
    patch.model_version = emptyToNull(body.modeloVersao)
  }
  if (body.placa !== undefined) {
    patch.plate = emptyToNull(body.placa)
  }
  if (body.observacoes !== undefined) {
    patch.initial_notes = emptyToNull(body.observacoes)
  }
  if (body.responsavel !== undefined) {
    patch.responsible = emptyToNull(body.responsavel)
  }
  if (body.prazoEstimado !== undefined) {
    patch.estimated_deadline = emptyToNull(body.prazoEstimado)
  }
  if (body.prioridade !== undefined && body.prioridade !== '') {
    patch.priority = normalizePriority(body.prioridade)
  }

  if (body.colaboradorId !== undefined) {
    if (body.colaboradorId) {
      const ok = await collaboratorExists(pool, body.colaboradorId)
      if (!ok) {
        throw new AppError(
          'Colaborador (responsável) não encontrado.',
          422,
          ErrorCodes.VALIDATION_ERROR,
        )
      }
    }
    patch.metadata_json = mergeConveyorMetadata(existing.metadata_json, {
      colaboradorId: body.colaboradorId,
    })
  }

  const updated = await updateConveyorDados(pool, conveyorId, patch)
  if (!updated) return null

  const nodes = await listConveyorNodesByConveyorId(pool, conveyorId)
  const structure = await loadConveyorStructureWithAssignees(pool, conveyorId, nodes)
  return mapDetailRowToApi(updated, structure)
}

export async function serviceReplaceConveyorStructure(
  pool: pg.Pool,
  conveyorId: string,
  body: PatchConveyorStructureBody,
): Promise<ConveyorDetailApi | null> {
  const existing = await findConveyorById(pool, conveyorId)
  if (!existing) return null

  if (
    existing.operational_status !== 'NO_BACKLOG' &&
    existing.operational_status !== 'EM_REVISAO'
  ) {
    throw new AppError(
      'Substituição de estrutura só é permitida quando a esteira está no backlog ou em revisão.',
      422,
      ErrorCodes.VALIDATION_ERROR,
    )
  }

  const nEntries = await countActiveTimeEntriesByConveyor(pool, conveyorId)
  if (nEntries > 0) {
    throw new AppError(
      'Não é possível substituir a estrutura: existem apontamentos registados nesta esteira.',
      422,
      ErrorCodes.VALIDATION_ERROR,
    )
  }

  revalidateStructureOptions(body.options)
  const assigneeTargets = collectAssigneeTargetsFromOptions(body.options)
  for (const cid of assigneeTargets.collaboratorIds) {
    const ok = await collaboratorActiveForOperations(pool, cid)
    if (!ok) {
      throw new AppError(
        'Colaborador de alocação inexistente, inativo ou indisponível.',
        422,
        ErrorCodes.VALIDATION_ERROR,
      )
    }
  }
  for (const tid of assigneeTargets.teamIds) {
    const t = await findTeamById(pool, tid)
    if (!t || !t.is_active || t.deleted_at) {
      throw new AppError(
        'Time de alocação inexistente ou inativo.',
        422,
        ErrorCodes.VALIDATION_ERROR,
      )
    }
  }

  const totals = computeTotalsForOptions(body.options)
  const metaNext = mergeConveyorMetadata(existing.metadata_json, {
    matrixRootItemId:
      body.matrixRootItemId === undefined ? undefined : body.matrixRootItemId,
  })

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    await deleteConveyorAssigneesAndNodes(client, conveyorId)

    await updateConveyorStructureMeta(client, conveyorId, {
      origin_register: body.originType,
      base_ref_snapshot: body.baseId ?? null,
      base_code_snapshot: body.baseCode ?? null,
      base_name_snapshot: body.baseName ?? null,
      base_version_snapshot: body.baseVersion ?? null,
      metadata_json: metaNext,
      total_options: totals.totalOptions,
      total_areas: totals.totalAreas,
      total_steps: totals.totalSteps,
      total_planned_minutes: totals.totalPlannedMinutes,
    })

    await materializeConveyorOptions(client, conveyorId, body.options)

    await client.query('COMMIT')
  } catch (err) {
    try {
      await client.query('ROLLBACK')
    } catch {
      /* ignore */
    }
    throw err
  } finally {
    client.release()
  }

  const row = await findConveyorById(pool, conveyorId)
  if (!row) return null
  const nodes = await listConveyorNodesByConveyorId(pool, conveyorId)
  const structure = await loadConveyorStructureWithAssignees(pool, conveyorId, nodes)
  return mapDetailRowToApi(row, structure)
}
