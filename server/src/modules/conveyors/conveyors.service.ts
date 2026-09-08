import { randomUUID } from 'node:crypto'
import { DatabaseError } from 'pg'
import type pg from 'pg'
import { AppError } from '../../shared/errors/AppError.js'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'
import { ErrorRefs } from '../../shared/errors/errorRefs.js'
import {
  resolveActivityPlannedTotalMinutes,
  resolveInitialConveyorStepPlannedQuantity,
} from '../../shared/activityOperationalQuantity.js'
import { stripConveyorPlanningTempoFromNotes } from '../../shared/conveyorPlanningNotes.js'
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
  findConveyorById,
  findConveyorDeleteBlockingDeps,
  findNodeIdsWithStructureDeps,
  hardDeleteAssigneesForNodes,
  hardDeleteConveyorNodeSubtree,
  physicalDeleteConveyor,
  insertConveyor,
  insertConveyorNode,
  listActiveConveyorNodesByConveyorId,
  listConveyorNodesByConveyorId,
  listConveyors,
  lockConveyorForStructureUpdate,
  newNodeId,
  softDeactivateConveyorNodes,
  updateConveyorDados,
  updateConveyorNodeStructureFields,
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
import {
  canTransitionConveyorStatus,
  CONVEYOR_DELETE_HAS_TIME_ENTRIES_MESSAGE,
  CONVEYOR_OPERATIONAL_STATUS_DEFAULT,
  CONVEYOR_FINISH_REQUIRES_MANAGER_MESSAGE,
  isConveyorOperationalStatusDb,
  mapLegacyConveyorOperationalStatus,
  resolveCompletedAtMode,
} from './conveyorOperationalStatus.js'
import { serviceGetConveyorPendingMinutes } from './conveyorNodeWorkload.service.js'
import {
  detectSyntheticSubtreeRollupInCreatePayload,
  detectSyntheticSubtreeRollupNodesFromDetailStructure,
  detectSyntheticSubtreeRollupNodesFromFlatRows,
  detectSyntheticSubtreeRollupNodesFromPostBody,
  isConveyorCreateDiagnosticsEnabled,
  logConveyorCreateDiagnostics,
  summarizePersistedConveyorNodes,
  summarizePostConveyorBodyForDiagnostics,
} from './conveyorCreateDiagnostics.js'
import { detectAndRecordConveyorDelayTransition } from './operational-events/conveyor-delay-events.service.js'
import { serviceCreateConveyorOperationalEvent } from './operational-events/conveyor-operational-events.service.js'
import {
  computeConveyorStructureDiff,
  CONVEYOR_EDIT_REASON_CODE,
  INCREMENTAL_STRUCTURE_EDIT_REASON,
  partitionRemovalSubtrees,
  shouldMarkLateAddForNewSteps,
  type StructureDiffAssignee,
} from './conveyor-structure-diff.js'

/** Backlog operacional = EM_ELABORACAO. Fora disso, PATCH exige motivo do usuário. */
function requireUserReasonOutsideBacklog(
  operationalStatus: string,
  reason: string | undefined,
): string | undefined {
  const status =
    resolveOperationalStatusForPolicy(operationalStatus) ?? operationalStatus
  if (status === 'EM_ELABORACAO') {
    return reason
  }
  if (reason == null || reason === '') {
    throw new AppError(
      'Motivo deve ter entre 3 e 500 caracteres.',
      422,
      ErrorCodes.VALIDATION_ERROR,
    )
  }
  return reason
}

const PRAZO_INICIO_RE = /In[ií]cio previsto:\s*(.+?)(?:\s*[·•|]\s*|$)/i
const PRAZO_FIM_RE = /Fim previsto:\s*(.+)$/i

/** Extrai YYYY-MM-DD de data civil (com ou sem horário) sem Date/UTC. */
function extractCivilDateYmd(raw: string): string | null {
  const m = /^(\d{4}-\d{2}-\d{2})(?:T\d{2}:\d{2}(?::\d{2})?)?/.exec(raw.trim())
  return m?.[1] ?? null
}

/**
 * Normaliza prazoEstimado do contrato wizard antes de gravar:
 * início → YYYY-MM-DDT00:00:01 · término → YYYY-MM-DDT23:59:59.
 * Preserva o formato "Início previsto: … · Fim previsto: …".
 */
function normalizePrazoEstimadoForPersistence(
  prazoEstimado: string | undefined,
): string | undefined {
  if (prazoEstimado === undefined) return undefined
  const trimmed = prazoEstimado.trim()
  if (!trimmed) return prazoEstimado

  const inicioRaw = trimmed.match(PRAZO_INICIO_RE)?.[1]?.trim() ?? null
  const fimRaw = trimmed.match(PRAZO_FIM_RE)?.[1]?.trim() ?? null
  if (!inicioRaw && !fimRaw) return prazoEstimado

  const parts: string[] = []
  if (inicioRaw) {
    const civil = extractCivilDateYmd(inicioRaw)
    parts.push(`Início previsto: ${civil ? `${civil}T00:00:01` : inicioRaw}`)
  }
  if (fimRaw) {
    const civil = extractCivilDateYmd(fimRaw)
    parts.push(`Fim previsto: ${civil ? `${civil}T23:59:59` : fimRaw}`)
  }
  return parts.join(' · ')
}

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

function resolveOperationalStatusForPolicy(
  status: string,
): ConveyorOperationalStatusDb | null {
  if (isConveyorOperationalStatusDb(status)) return status
  return mapLegacyConveyorOperationalStatus(status)
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
        totalPlannedMinutes += resolveActivityPlannedTotalMinutes(
          st.plannedMinutes,
          resolveInitialConveyorStepPlannedQuantity(),
        )
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
  documentReviewAudit: Record<string, unknown> | null
} {
  if (!m || typeof m !== 'object') {
    return { colaboradorId: null, matrixRootItemId: null, documentReviewAudit: null }
  }
  const o = m as Record<string, unknown>
  const cid = o.colaboradorId
  const mid = o.matrixRootItemId
  const dra = o.documentReviewAudit
  return {
    colaboradorId: typeof cid === 'string' ? cid : null,
    matrixRootItemId: typeof mid === 'string' ? mid : null,
    documentReviewAudit:
      dra && typeof dra === 'object' && !Array.isArray(dra)
        ? (dra as Record<string, unknown>)
        : null,
  }
}

export function mapDetailRowToApi(
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

function isTransitionAllowed(
  from: ConveyorOperationalStatusDb,
  to: ConveyorOperationalStatusDb,
): boolean {
  return canTransitionConveyorStatus(from, to)
}

export function buildConveyorStructureFromNodes(
  rows: ConveyorNodeFlatRow[],
): ConveyorStructureApi {
  const active = rows.filter((r) => r.is_active !== false)
  const options = active
    .filter((r) => r.node_type === 'OPTION')
    .sort((a, b) => a.order_index - b.order_index)
  return {
    options: options.map((opt) => ({
      id: opt.id,
      name: opt.name,
      orderIndex: opt.order_index,
      areas: active
        .filter((r) => r.parent_id === opt.id && r.node_type === 'AREA')
        .sort((a, b) => a.order_index - b.order_index)
        .map((area) => ({
          id: area.id,
          name: area.name,
          orderIndex: area.order_index,
          steps: active
            .filter((r) => r.parent_id === area.id && r.node_type === 'STEP')
            .sort((a, b) => a.order_index - b.order_index)
            .map((st) => {
              const op = st.operational_status ?? 'PENDING'
              const completed = op === 'COMPLETED'
              return {
                id: st.id,
                name: st.name,
                orderIndex: st.order_index,
                plannedMinutes: st.planned_minutes,
                plannedQuantity: st.planned_quantity ?? 1,
                assignees: [],
                operationalStatus: op,
                isCompleted: completed,
                completedAt: st.operational_completed_at,
                completedByName: st.operational_completed_by_email?.trim() || null,
                completionEventId: null,
                abortedAt: st.aborted_at,
                abortedByName: st.aborted_by_email?.trim() || null,
                abortReasonCode: st.abort_reason_code,
                abortReasonText: st.abort_reason_text,
                abortReasonLabelSnapshot: st.abort_reason_label_snapshot,
              }
            }),
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
export async function loadConveyorStructureWithAssignees(
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
  const nodes = await listActiveConveyorNodesByConveyorId(pool, id)
  const structure = await loadConveyorStructureWithAssignees(pool, id, nodes)
  if (isConveyorCreateDiagnosticsEnabled()) {
    const synth = detectSyntheticSubtreeRollupNodesFromDetailStructure(structure)
    if (synth.length > 0) {
      console.info({
        stage: 'conveyor.detail.structure_synthetic_check',
        conveyorId: id,
        syntheticRollupDetected: true,
        syntheticFindings: synth,
      })
    }
  }
  return mapDetailRowToApi(row, structure)
}

export async function servicePatchConveyorStatus(
  pool: pg.Pool,
  conveyorId: string,
  nextStatus: ConveyorOperationalStatusDb,
  options?: { canEditStatus?: boolean },
): Promise<ConveyorDetailApi | null> {
  const row = await findConveyorById(pool, conveyorId)
  if (!row) return null
  const beforePendingMinutes = (await serviceGetConveyorPendingMinutes(pool, conveyorId)) ?? 0

  if (row.operational_status === nextStatus) {
    throw new AppError(
      'Não é permitido alterar para o mesmo status.',
      422,
      ErrorCodes.INVALID_STATUS_TRANSITION,
    )
  }

  if (
    nextStatus === 'FINALIZADA' &&
    options?.canEditStatus === false
  ) {
    throw new AppError(
      CONVEYOR_FINISH_REQUIRES_MANAGER_MESSAGE,
      403,
      ErrorCodes.CONVEYOR_FINISH_REQUIRES_MANAGER,
    )
  }

  if (!isTransitionAllowed(row.operational_status, nextStatus)) {
    throw new AppError(
      `Não é permitido mudar de ${row.operational_status} para ${nextStatus}.`,
      422,
      ErrorCodes.INVALID_STATUS_TRANSITION,
    )
  }

  const mode = resolveCompletedAtMode(row.operational_status, nextStatus) as CompletedAtUpdateMode
  const updated = await updateConveyorOperationalStatus(
    pool,
    conveyorId,
    nextStatus,
    mode,
  )
  if (!updated) return null
  const afterPendingMinutes = (await serviceGetConveyorPendingMinutes(pool, conveyorId)) ?? 0
  await detectAndRecordConveyorDelayTransition(pool, {
    conveyorId,
    before: {
      operationalStatus: row.operational_status,
      estimatedDeadline: row.estimated_deadline,
      pendingMinutes: beforePendingMinutes,
      now: new Date(),
    },
    after: {
      operationalStatus: updated.operational_status,
      estimatedDeadline: updated.estimated_deadline,
      pendingMinutes: afterPendingMinutes,
      now: new Date(),
    },
    source: 'USER_ACTION',
    occurredAt: new Date(),
  })

  const nodes = await listActiveConveyorNodesByConveyorId(pool, conveyorId)
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
      planned_quantity: 1,
      default_responsible_id: null,
      required: true,
      source_key: null,
      metadata_json: null,
      operational_status: null,
      operational_completed_at: null,
      operational_completed_by: null,
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
        planned_quantity: 1,
        default_responsible_id: null,
        required: true,
        source_key: null,
        metadata_json: null,
        operational_status: null,
        operational_completed_at: null,
        operational_completed_by: null,
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
          planned_quantity: resolveInitialConveyorStepPlannedQuantity(),
          default_responsible_id: null,
          required: st.required ?? true,
          source_key: st.sourceKey?.trim() || null,
          metadata_json: null,
          operational_status: 'PENDING',
          operational_completed_at: null,
          operational_completed_by: null,
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

  const officialRollup = detectSyntheticSubtreeRollupInCreatePayload(body)
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

  const priority = normalizePriority(dados.prioridade)
  const conveyorId = randomUUID()
  const code: string | null = null

  if (isConveyorCreateDiagnosticsEnabled()) {
    logConveyorCreateDiagnostics({
      stage: 'conveyor.create.incoming_payload',
      conveyorId,
      summary: summarizePostConveyorBodyForDiagnostics(body),
      syntheticFindings: detectSyntheticSubtreeRollupNodesFromPostBody(body),
    })
  }

  const metadata_json = {
    colaboradorId: dados.colaboradorId ?? null,
    matrixRootItemId: body.matrixRootItemId ?? null,
    documentReviewAudit: body.metadata?.documentReviewAudit ?? null,
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
      initial_notes: emptyToNull(stripConveyorPlanningTempoFromNotes(dados.observacoes)),
      responsible: emptyToNull(dados.responsavel),
      estimated_deadline: emptyToNull(normalizePrazoEstimadoForPersistence(dados.prazoEstimado)),
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
      operational_status: CONVEYOR_OPERATIONAL_STATUS_DEFAULT,
      completed_at: null,
    })

    await materializeConveyorOptions(client, conveyorId, body.options)

    if (isConveyorCreateDiagnosticsEnabled()) {
      const persisted = await listConveyorNodesByConveyorId(client, conveyorId)
      const synthFlat = detectSyntheticSubtreeRollupNodesFromFlatRows(persisted)
      logConveyorCreateDiagnostics({
        stage: 'conveyor.create.persisted_nodes',
        conveyorId,
        summary: summarizePersistedConveyorNodes(persisted),
        syntheticFindings: synthFlat,
      })
    }

    await client.query('COMMIT')

    return {
      id: conveyorId,
      code,
      name: dados.nome.trim(),
      priority,
      originRegister: body.originType,
      operationalStatus: CONVEYOR_OPERATIONAL_STATUS_DEFAULT,
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
  patch: {
    colaboradorId?: string | null
    matrixRootItemId?: string | null
    documentReviewAudit?: Record<string, unknown> | null
  },
): {
  colaboradorId: string | null
  matrixRootItemId: string | null
  documentReviewAudit: Record<string, unknown> | null
} {
  const cur = parseConveyorMetadataJson(current)
  return {
    colaboradorId:
      patch.colaboradorId !== undefined ? patch.colaboradorId : cur.colaboradorId,
    matrixRootItemId:
      patch.matrixRootItemId !== undefined
        ? patch.matrixRootItemId
        : cur.matrixRootItemId,
    documentReviewAudit:
      patch.documentReviewAudit !== undefined
        ? patch.documentReviewAudit
        : cur.documentReviewAudit,
  }
}

export async function servicePatchConveyorDados(
  pool: pg.Pool,
  conveyorId: string,
  body: PatchConveyorDadosBody,
  options?: { actorUserId?: string | null },
): Promise<ConveyorDetailApi | null> {
  const existing = await findConveyorById(pool, conveyorId)
  if (!existing) return null
  const beforePendingMinutes = (await serviceGetConveyorPendingMinutes(pool, conveyorId)) ?? 0

  // reason nunca vai para colunas de conveyors — só evento operacional.
  const { reason: reasonFromBody, ...dadosFields } = body
  const editReason = requireUserReasonOutsideBacklog(
    existing.operational_status,
    reasonFromBody,
  )

  const patch: PatchConveyorDadosFields = {}
  const changedFields: string[] = []

  if (dadosFields.nome !== undefined) {
    patch.name = dadosFields.nome.trim()
    changedFields.push('nome')
  }
  if (dadosFields.cliente !== undefined) {
    patch.client_name = emptyToNull(dadosFields.cliente)
    changedFields.push('cliente')
  }
  if (dadosFields.veiculo !== undefined) {
    patch.vehicle = emptyToNull(dadosFields.veiculo)
    changedFields.push('veiculo')
  }
  if (dadosFields.modeloVersao !== undefined) {
    patch.model_version = emptyToNull(dadosFields.modeloVersao)
    changedFields.push('modeloVersao')
  }
  if (dadosFields.placa !== undefined) {
    patch.plate = emptyToNull(dadosFields.placa)
    changedFields.push('placa')
  }
  if (dadosFields.observacoes !== undefined) {
    patch.initial_notes = emptyToNull(
      stripConveyorPlanningTempoFromNotes(dadosFields.observacoes),
    )
    changedFields.push('observacoes')
  }
  if (dadosFields.responsavel !== undefined) {
    patch.responsible = emptyToNull(dadosFields.responsavel)
    changedFields.push('responsavel')
  }
  if (dadosFields.prazoEstimado !== undefined) {
    patch.estimated_deadline = emptyToNull(
      normalizePrazoEstimadoForPersistence(dadosFields.prazoEstimado),
    )
    changedFields.push('prazoEstimado')
  }
  if (dadosFields.prioridade !== undefined && dadosFields.prioridade !== '') {
    patch.priority = normalizePriority(dadosFields.prioridade)
    changedFields.push('prioridade')
  }

  if (dadosFields.colaboradorId !== undefined) {
    if (dadosFields.colaboradorId) {
      const ok = await collaboratorExists(pool, dadosFields.colaboradorId)
      if (!ok) {
        throw new AppError(
          'Colaborador (responsável) não encontrado.',
          422,
          ErrorCodes.VALIDATION_ERROR,
        )
      }
    }
    patch.metadata_json = mergeConveyorMetadata(existing.metadata_json, {
      colaboradorId: dadosFields.colaboradorId,
    })
    changedFields.push('colaboradorId')
  }

  const updated = await updateConveyorDados(pool, conveyorId, patch)
  if (!updated) return null
  const afterPendingMinutes = (await serviceGetConveyorPendingMinutes(pool, conveyorId)) ?? 0
  await detectAndRecordConveyorDelayTransition(pool, {
    conveyorId,
    before: {
      operationalStatus: existing.operational_status,
      estimatedDeadline: existing.estimated_deadline,
      pendingMinutes: beforePendingMinutes,
      now: new Date(),
    },
    after: {
      operationalStatus: updated.operational_status,
      estimatedDeadline: updated.estimated_deadline,
      pendingMinutes: afterPendingMinutes,
      now: new Date(),
    },
    source: 'USER_ACTION',
    occurredAt: new Date(),
  })

  if (
    (resolveOperationalStatusForPolicy(existing.operational_status) ??
      existing.operational_status) !== 'EM_ELABORACAO' &&
    editReason
  ) {
    await serviceCreateConveyorOperationalEvent(pool, {
      conveyorId,
      nodeId: null,
      eventType: 'MANUAL_NOTE',
      previousValue: null,
      newValue: null,
      reason: CONVEYOR_EDIT_REASON_CODE,
      source: 'USER_ACTION',
      occurredAt: new Date().toISOString(),
      createdBy: options?.actorUserId ?? null,
      metadataJson: {
        kind: CONVEYOR_EDIT_REASON_CODE,
        section: 'DATA',
        changedFields,
        reason: editReason,
      },
    })
  }

  const nodes = await listActiveConveyorNodesByConveyorId(pool, conveyorId)
  const structure = await loadConveyorStructureWithAssignees(pool, conveyorId, nodes)
  return mapDetailRowToApi(updated, structure)
}

export async function serviceApplyConveyorStructureDiff(
  pool: pg.Pool,
  conveyorId: string,
  body: PatchConveyorStructureBody,
  options?: { actorUserId?: string | null },
): Promise<ConveyorDetailApi | null> {
  const existingProbe = await findConveyorById(pool, conveyorId)
  if (!existingProbe) return null

  // reason nunca vai para colunas de conveyors — só metadata do evento.
  const { reason: reasonFromBody, ...structureBody } = body
  const editReason = requireUserReasonOutsideBacklog(
    existingProbe.operational_status,
    reasonFromBody,
  )

  revalidateStructureOptions(structureBody.options)
  const assigneeTargets = collectAssigneeTargetsFromOptions(structureBody.options)
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

  const officialRollupPatch = detectSyntheticSubtreeRollupInCreatePayload(structureBody)
  if (officialRollupPatch.length > 0) {
    throw new AppError(
      'A estrutura contém uma etapa sintética de Matriz. Remova o item agregado e mantenha apenas as atividades reais.',
      422,
      ErrorCodes.CONVEYOR_SYNTHETIC_ROLLUP_STEP,
      { findings: officialRollupPatch },
      {
        errorRef: ErrorRefs.CONVEYOR_CREATE_FAILED,
        category: 'BUSINESS',
        severity: 'warning',
      },
    )
  }

  const totals = computeTotalsForOptions(structureBody.options)

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const existing = await lockConveyorForStructureUpdate(client, conveyorId)
    if (!existing) {
      await client.query('ROLLBACK')
      return null
    }

    const activeNodes = await listActiveConveyorNodesByConveyorId(client, conveyorId)
    const computed = computeConveyorStructureDiff({
      options: structureBody.options,
      activeNodes: activeNodes.map((n) => ({
        id: n.id,
        parent_id: n.parent_id,
        node_type: n.node_type,
        order_index: n.order_index,
        name: n.name,
        is_active: n.is_active,
      })),
    })
    if (computed.error) {
      throw new AppError(computed.error.message, 422, ErrorCodes.VALIDATION_ERROR, {
        code: computed.error.code,
        nodeId: computed.error.nodeId,
      })
    }
    const diff = computed.diff

    const metaNext = mergeConveyorMetadata(existing.metadata_json, {
      matrixRootItemId:
        structureBody.matrixRootItemId === undefined
          ? undefined
          : structureBody.matrixRootItemId,
    })

    const statusForLateAdd =
      resolveOperationalStatusForPolicy(existing.operational_status) ??
      existing.operational_status
    const markLateAdd = shouldMarkLateAddForNewSteps(statusForLateAdd)
    const occurredIso = new Date().toISOString()
    const lateStepMetadata = markLateAdd
      ? {
          lateAddToWeeklyBacklog: true,
          lateAddAt: occurredIso,
          lateAddReason: INCREMENTAL_STRUCTURE_EDIT_REASON,
        }
      : null

    /** tempKey / id existente → UUID persistido */
    const idMap = new Map<string, string>()
    for (const n of activeNodes) {
      idMap.set(n.id, n.id)
    }

    const resolveRef = (ref: string | null): string | null => {
      if (ref == null) return null
      const resolved = idMap.get(ref)
      if (!resolved) {
        throw new AppError(
          `Referência de nó inválida no sync de estrutura: ${ref}`,
          500,
          ErrorCodes.INTERNAL,
        )
      }
      return resolved
    }

    // 1) Inserts OPTION → AREA → STEP
    const insertedIds: string[] = []
    for (const ins of diff.inserts) {
      const newId = newNodeId()
      idMap.set(ins.tempKey, newId)
      insertedIds.push(newId)

      const parentId = resolveRef(ins.parentRef)
      const rootId = resolveRef(ins.rootRef)!
      const levelDepth =
        ins.nodeType === 'OPTION' ? 0 : ins.nodeType === 'AREA' ? 1 : 2

      await insertConveyorNode(client, {
        id: newId,
        conveyor_id: conveyorId,
        parent_id: parentId,
        root_id: rootId,
        node_type: ins.nodeType,
        source_origin: ins.sourceOrigin,
        code: null,
        name: ins.name,
        description: null,
        order_index: ins.orderIndex,
        level_depth: levelDepth,
        is_active: true,
        planned_minutes: ins.plannedMinutes,
        planned_quantity: resolveInitialConveyorStepPlannedQuantity(),
        default_responsible_id: null,
        required: ins.required,
        source_key: ins.sourceKey,
        metadata_json:
          ins.nodeType === 'STEP' && lateStepMetadata ? lateStepMetadata : null,
        operational_status: ins.nodeType === 'STEP' ? 'PENDING' : null,
        operational_completed_at: null,
        operational_completed_by: null,
      })

      if (ins.nodeType === 'STEP') {
        await insertStepAssigneesForStructure(client, {
          conveyorId,
          stepId: newId,
          assignees: ins.assignees,
        })
      }
    }

    // 2) Updates (campos + parent/root; sem tocar operational_status)
    const updatedIds: string[] = []
    for (const upd of diff.updates) {
      updatedIds.push(upd.id)
      const parentId = resolveRef(upd.parentRef)
      const rootId = resolveRef(upd.rootRef)!
      await updateConveyorNodeStructureFields(client, {
        conveyorId,
        nodeId: upd.id,
        fields: {
          name: upd.name,
          order_index: upd.orderIndex,
          source_origin: upd.sourceOrigin,
          parent_id: parentId,
          root_id: rootId,
          planned_minutes: upd.plannedMinutes,
          required: upd.required,
          source_key: upd.sourceKey,
        },
      })
    }

    // 3) Assignees sync só em STEPs matched
    if (diff.matchedStepIds.length > 0) {
      await hardDeleteAssigneesForNodes(client, {
        conveyorId,
        nodeIds: diff.matchedStepIds,
      })
      for (const upd of diff.updates) {
        if (upd.nodeType !== 'STEP' || !upd.assignees) continue
        await insertStepAssigneesForStructure(client, {
          conveyorId,
          stepId: upd.id,
          assignees: upd.assignees,
        })
      }
    }

    // 4) Remoções híbridas por subárvore
    const softDeactivatedIds: string[] = []
    const hardDeletedIds: string[] = []
    const subtrees = partitionRemovalSubtrees(diff.removals)
    for (const subtree of subtrees) {
      const nodeIds = subtree.map((r) => r.id)
      // Deps em qualquer nó da subárvore (não só STEPs): time entries, plano,
      // eventos e STEP COMPLETED/ABORTED forçam soft-deactivate.
      const deps = await findNodeIdsWithStructureDeps(client, nodeIds)
      if (deps.size > 0) {
        await softDeactivateConveyorNodes(client, { conveyorId, nodeIds })
        softDeactivatedIds.push(...nodeIds)
      } else {
        await hardDeleteConveyorNodeSubtree(client, { conveyorId, nodeIds })
        hardDeletedIds.push(...nodeIds)
      }
    }

    await updateConveyorStructureMeta(client, conveyorId, {
      origin_register: structureBody.originType,
      base_ref_snapshot: structureBody.baseId ?? null,
      base_code_snapshot: structureBody.baseCode ?? null,
      base_name_snapshot: structureBody.baseName ?? null,
      base_version_snapshot: structureBody.baseVersion ?? null,
      metadata_json: metaNext,
      total_options: totals.totalOptions,
      total_areas: totals.totalAreas,
      total_steps: totals.totalSteps,
      total_planned_minutes: totals.totalPlannedMinutes,
    })

    await serviceCreateConveyorOperationalEvent(client, {
      conveyorId,
      nodeId: null,
      eventType: 'CONVEYOR_STRUCTURE_UPDATED',
      previousValue: null,
      newValue: null,
      reason: INCREMENTAL_STRUCTURE_EDIT_REASON,
      source: 'USER_ACTION',
      occurredAt: occurredIso,
      createdBy: options?.actorUserId ?? null,
      metadataJson: {
        updatedNodeIds: updatedIds,
        insertedNodeIds: insertedIds,
        softDeactivatedNodeIds: softDeactivatedIds,
        hardDeletedNodeIds: hardDeletedIds,
        lateAddApplied: markLateAdd,
        ...(editReason ? { reason: editReason } : {}),
      },
    })

    await client.query('COMMIT')
  } catch (err) {
    try {
      await client.query('ROLLBACK')
    } catch {
      /* ignore */
    }
    rethrowStructureReplacePgError(err)
  } finally {
    client.release()
  }

  const row = await findConveyorById(pool, conveyorId)
  if (!row) return null
  const nodes = await listActiveConveyorNodesByConveyorId(pool, conveyorId)
  const structure = await loadConveyorStructureWithAssignees(pool, conveyorId, nodes)
  return mapDetailRowToApi(row, structure)
}

/** Alias retrocompatível — controller e imports legados. */
export const serviceReplaceConveyorStructure = serviceApplyConveyorStructureDiff

async function insertStepAssigneesForStructure(
  client: pg.PoolClient,
  input: {
    conveyorId: string
    stepId: string
    assignees: StructureDiffAssignee[]
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

function rethrowStructureReplacePgError(err: unknown): never {
  if (err instanceof DatabaseError && err.code === '23503') {
    throw new AppError(
      'Não é possível alterar a estrutura: dependência referencial impede a remoção física de um nó.',
      409,
      ErrorCodes.CONVEYOR_STRUCTURE_REPLACE_HAS_DEPENDENCIES,
    )
  }
  throw err
}

const CONVEYOR_DELETE_DEPENDENCIES_MESSAGE =
  'Esta esteira já possui movimentações e não pode ser excluída.'

function assertConveyorDeleteNoTimeEntries(
  deps: Awaited<ReturnType<typeof findConveyorDeleteBlockingDeps>>,
): void {
  if (deps.hasTimeEntries) {
    throw new AppError(
      CONVEYOR_DELETE_HAS_TIME_ENTRIES_MESSAGE,
      409,
      ErrorCodes.CONVEYOR_DELETE_HAS_TIME_ENTRIES,
    )
  }
}

function assertConveyorDeleteNoBlockingDeps(
  deps: Awaited<ReturnType<typeof findConveyorDeleteBlockingDeps>>,
): void {
  assertConveyorDeleteNoTimeEntries(deps)
  if (
    deps.hasOperationalWorkPlanItems ||
    deps.hasConveyorOperationalPlans ||
    deps.hasConveyorOperationalPlanItems
  ) {
    throw new AppError(
      CONVEYOR_DELETE_DEPENDENCIES_MESSAGE,
      409,
      ErrorCodes.CONVEYOR_DELETE_HAS_DEPENDENCIES,
    )
  }
}

/**
 * Exclusão física da esteira (sem apontamentos nem deps operacionais bloqueantes).
 * RBAC: `conveyors.create` na rota.
 */
export async function serviceDeleteConveyor(
  pool: pg.Pool,
  conveyorId: string,
): Promise<void> {
  const existing = await findConveyorById(pool, conveyorId)
  if (!existing) {
    throw new AppError('Esteira não encontrada.', 404, ErrorCodes.NOT_FOUND)
  }

  const deps = await findConveyorDeleteBlockingDeps(pool, conveyorId)
  assertConveyorDeleteNoBlockingDeps(deps)

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const deleted = await physicalDeleteConveyor(client, conveyorId)
    if (!deleted) {
      throw new AppError('Esteira não encontrada.', 404, ErrorCodes.NOT_FOUND)
    }
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
}
