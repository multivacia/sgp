import type pg from 'pg'
import { findCollaboratorIdByAppUserId } from '../auth/auth.repository.js'
import { AppError } from '../../shared/errors/AppError.js'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'
import {
  getOperationalBucketForConveyor,
  operationalBucketSortRank,
  parseFlexibleDeadlineToDate,
} from '../../shared/operationalBucket.js'
import type {
  MyActivityItemApi,
  TimeEntryCandidateItemApi,
} from './my-activities.dto.js'
import {
  listActivitiesRawForCollaborator,
  listPlannedTimeEntryCandidates,
  type TimeEntryCandidateRawRow,
} from './my-activities.repository.js'
import { analyzeConveyorActivitySequence } from '../conveyors/conveyorActivitySequence.logic.js'
import { mapWorkQueueSequenceForCollaborator } from '../my-work-queue/work-queue-sequence-for-collaborator.js'
import { resolveActivityPlannedTotalMinutes } from '../../shared/activityOperationalQuantity.js'
import type { SequenceAnalysisNode } from '../conveyors/conveyorActivitySequence.logic.js'
import { listConveyorNodesForSequenceAnalysis, listPlannedCollaboratorsByActivityNode } from '../conveyors/conveyors.repository.js'
import { operationalToday } from '../../shared/operationalWorkDate.js'


export type GetMyActivitiesQuery = {
  userId: string
}

/**
 * Ordenação final (após filtro por colaborador):
 * 1. bucket operacional: em atraso → em revisão → em andamento → no backlog → concluídas
 * 2. prazo estimado (mais urgente primeiro; sem prazo por último dentro do bucket)
 * 3. nome da esteira (pt-BR)
 * 4. ordem da matriz: opção → área → step (`order_index` da esteira)
 */
function mapAndSortActivities(rows: Awaited<
  ReturnType<typeof listActivitiesRawForCollaborator>
>): MyActivityItemApi[] {
  const now = new Date()
  const rawByAssigneeId = new Map(rows.map((r) => [r.assignee_id, r]))
  const mapped: MyActivityItemApi[] = rows.map((row) => {
    const operationalBucket = getOperationalBucketForConveyor(
      row.conveyor_status,
      row.estimated_deadline,
      now,
    )
    return {
      assigneeId: row.assignee_id,
      conveyorId: row.conveyor_id,
      conveyorCode: row.conveyor_code,
      conveyorName: row.conveyor_name,
      conveyorStatus: row.conveyor_status,
      estimatedDeadline: row.estimated_deadline,
      operationalBucket,
      stepNodeId: row.step_node_id,
      stepName: row.step_name,
      optionName: row.option_name,
      areaName: row.area_name,
      roleInStep: row.is_primary ? 'primary' : 'support',
      plannedMinutes:
        row.planned_minutes === null || row.planned_minutes === ''
          ? null
          : Number(row.planned_minutes),
      plannedQuantity: Number(row.planned_quantity) || 1,
      plannedTotalMinutes: resolveActivityPlannedTotalMinutes(
        row.planned_minutes === null || row.planned_minutes === ''
          ? 0
          : Number(row.planned_minutes),
        row.planned_quantity,
      ),
      realizedMinutes:
        row.realized_minutes === null || row.realized_minutes === ''
          ? null
          : Number(row.realized_minutes),
    }
  })

  mapped.sort((a, b) => {
    const br =
      operationalBucketSortRank(a.operationalBucket) -
      operationalBucketSortRank(b.operationalBucket)
    if (br !== 0) return br

    const da = parseFlexibleDeadlineToDate(a.estimatedDeadline)
    const db = parseFlexibleDeadlineToDate(b.estimatedDeadline)
    const ma = da === null ? Number.POSITIVE_INFINITY : da.getTime()
    const mb = db === null ? Number.POSITIVE_INFINITY : db.getTime()
    if (ma !== mb) return ma - mb

    const nc = a.conveyorName
      .trim()
      .toLocaleLowerCase('pt-BR')
      .localeCompare(b.conveyorName.trim().toLocaleLowerCase('pt-BR'), 'pt-BR')
    if (nc !== 0) return nc

    const ra = rawByAssigneeId.get(a.assigneeId)
    const rb = rawByAssigneeId.get(b.assigneeId)
    if (!ra || !rb) return 0
    const oa = Number(ra.opt_order_index)
    const ob = Number(rb.opt_order_index)
    if (oa !== ob) return oa - ob
    const aa = Number(ra.area_order_index)
    const ab = Number(rb.area_order_index)
    if (aa !== ab) return aa - ab
    return Number(ra.step_order_index) - Number(rb.step_order_index)
  })

  return mapped
}

export async function serviceListMyActivities(
  pool: pg.Pool,
  query: GetMyActivitiesQuery,
): Promise<{ items: MyActivityItemApi[]; resolvedCollaboratorId: string }> {
  const collaboratorId = await findCollaboratorIdByAppUserId(pool, query.userId)

  if (!collaboratorId) {
    throw new AppError(
      'Sua conta não está vinculada a um colaborador operacional. Peça ao administrador para associar seu acesso.',
      422,
      ErrorCodes.VALIDATION_ERROR,
    )
  }

  const raw = await listActivitiesRawForCollaborator(pool, collaboratorId)
  const items = mapAndSortActivities(raw)
  return { items, resolvedCollaboratorId: collaboratorId }
}

/** Lista atividades alocadas (mesmo shape que Minhas atividades), por id de colaborador. */
export async function serviceListActivitiesForCollaborator(
  pool: pg.Pool,
  collaboratorId: string,
  options?: { conveyorId?: string | null },
): Promise<MyActivityItemApi[]> {
  const raw = await listActivitiesRawForCollaborator(pool, collaboratorId, options)
  return mapAndSortActivities(raw)
}

function mapCandidateRow(
  row: TimeEntryCandidateRawRow,
  opts: { isAssignedToMe: boolean; referenceDate: string; collaboratorId: string },
  nodesByConveyor: Map<string, SequenceAnalysisNode[]>,
  plannedByConveyor: Map<string, Map<string, Set<string>>>,
): TimeEntryCandidateItemApi {
  const planned =
    row.planned_minutes === null || row.planned_minutes === ''
      ? null
      : Number(row.planned_minutes)
  const plannedQty = Number(row.planned_quantity) || 1
  const plannedTotal = resolveActivityPlannedTotalMinutes(planned ?? 0, plannedQty)
  const realized = Number(row.realized_minutes ?? 0)
  const pendingMinutes = Math.max(0, plannedTotal - Math.max(0, realized))
  const at =
    row.assignment_type === 'TEAM' ? ('TEAM' as const) : ('COLLABORATOR' as const)
  const nodes = nodesByConveyor.get(row.conveyor_id) ?? []
  const seq = analyzeConveyorActivitySequence(nodes, row.step_node_id, {
    currentCollaboratorId: opts.collaboratorId,
    plannedCollaboratorsByActivityNodeId:
      plannedByConveyor.get(row.conveyor_id) ?? new Map(),
  })
  const sequenceForCollaborator = mapWorkQueueSequenceForCollaborator({
    seq,
    isActivityCompleted: false,
    // Candidatos já vêm filtrados para esteiras A_INICIAR | EM_ANDAMENTO.
    conveyorOperationalStatus: 'EM_ANDAMENTO',
  })
  const prevSlice = sequenceForCollaborator.previousOpenActivities.map((p) => ({
    activityNodeId: p.activityNodeId,
    taskTitle: p.taskTitle,
    sectorTitle: p.sectorTitle,
    activityTitle: p.activityTitle,
  }))
  const allPrevSlice = sequenceForCollaborator.allPreviousOpenActivities.map((p) => ({
    activityNodeId: p.activityNodeId,
    taskTitle: p.taskTitle,
    sectorTitle: p.sectorTitle,
    activityTitle: p.activityTitle,
  }))
  const awaitingSlice = sequenceForCollaborator.awaitingPreviousActivities.map((p) => ({
    activityNodeId: p.activityNodeId,
    taskTitle: p.taskTitle,
    sectorTitle: p.sectorTitle,
    activityTitle: p.activityTitle,
  }))
  const plannedDate = row.planned_date?.trim() || null
  const isOverdue =
    plannedDate != null && plannedDate < opts.referenceDate.trim()
  return {
    conveyorId: row.conveyor_id,
    conveyorCode: row.conveyor_code,
    conveyorName: row.conveyor_name,
    clientName: row.client_name,
    vehicleLabel: row.vehicle_label,
    plate: row.plate,
    stepNodeId: row.step_node_id,
    stepName: row.step_name,
    activityTitle: row.step_name,
    taskTitle: row.option_name,
    areaName: row.area_name,
    sectorTitle: row.area_name,
    roleInStep: row.is_primary ? 'primary' : 'support',
    assignmentType: at,
    plannedMinutes: planned,
    plannedQuantity: plannedQty,
    plannedTotalMinutes: plannedTotal,
    realizedMinutes: realized,
    pendingMinutes,
    isAssignedToMe: opts.isAssignedToMe,
    requiresJustification: !opts.isAssignedToMe,
    isOutOfSequence: sequenceForCollaborator.isOutOfSequence,
    hasPreviousPendingStep: sequenceForCollaborator.hasPreviousPendingStep,
    sequenceWarningType: sequenceForCollaborator.sequenceWarningType,
    sequenceWarningLabel: sequenceForCollaborator.sequenceWarningLabel,
    requiresOutOfSequenceJustification:
      sequenceForCollaborator.requiresOutOfSequenceJustification,
    canPointTime: sequenceForCollaborator.canPointTime,
    blockingReason: sequenceForCollaborator.blockingReason,
    previousOpenCount: sequenceForCollaborator.previousOpenCount,
    previousOpenActivities: prevSlice,
    allPreviousOpenActivities: allPrevSlice,
    awaitingPreviousActivities: awaitingSlice,
    canCompleteStep: true,
    plannedDate,
    isOverdue,
  }
}

export async function serviceListTimeEntryCandidates(
  pool: pg.Pool,
  input: {
    collaboratorId: string | null
    q: string | null
    /** Filtro por esteira; combinado com `activityQ` e `q` via AND. */
    conveyorQ?: string | null
    /** Nome da atividade; combinado com `conveyorQ` e `q` via AND. */
    activityQ?: string | null
    limit: number
    includeUnassigned: boolean
  },
): Promise<{
  items: TimeEntryCandidateItemApi[]
  collaboratorId: string | null
  unavailableReason: string | null
}> {
  if (!input.collaboratorId) {
    return {
      items: [],
      collaboratorId: null,
      unavailableReason:
        'Sua conta não está vinculada a um colaborador operacional. Peça ao administrador para associar seu acesso.',
    }
  }

  const searchTerms = {
    q: input.q,
    conveyorQ: input.conveyorQ ?? null,
    activityQ: input.activityQ ?? null,
  }

  // Regra canônica (TASK apontamento-somente-planejado): lista padrão = atividades
  // planejadas para o colaborador (qualquer semana); pesquisa de outras atividades (>= 2
  // caracteres) = planejadas para outros colaboradores. Alocação na esteira não é fonte.
  const referenceDate = operationalToday()
  const rawMine = await listPlannedTimeEntryCandidates(pool, {
    collaboratorId: input.collaboratorId,
    scope: 'mine',
    ...searchTerms,
    limit: input.limit,
  })

  let tagged: Array<{ row: TimeEntryCandidateRawRow; isAssignedToMe: boolean }> =
    rawMine.map((r) => ({ row: r, isAssignedToMe: true }))

  const qOk =
    input.includeUnassigned &&
    [input.q, input.conveyorQ, input.activityQ].some(
      (term) => Boolean(term && term.trim().length >= 2),
    )

  if (qOk) {
    const seenStep = new Set(rawMine.map((r) => r.step_node_id))
    const rawOthers = await listPlannedTimeEntryCandidates(pool, {
      collaboratorId: input.collaboratorId,
      scope: 'others',
      ...searchTerms,
      limit: input.limit,
    })
    tagged = [
      ...tagged,
      ...rawOthers
        .filter((r) => !seenStep.has(r.step_node_id))
        .map((r) => ({ row: r, isAssignedToMe: false })),
    ]
  }

  const conveyorIds = [...new Set(tagged.map((t) => t.row.conveyor_id))]
  const nodesByConveyor = new Map<string, SequenceAnalysisNode[]>()
  const plannedByConveyor = new Map<string, Map<string, Set<string>>>()
  await Promise.all(
    conveyorIds.map(async (cid) => {
      const [nodes, planned] = await Promise.all([
        listConveyorNodesForSequenceAnalysis(pool, cid),
        listPlannedCollaboratorsByActivityNode(pool, cid),
      ])
      nodesByConveyor.set(cid, nodes as SequenceAnalysisNode[])
      plannedByConveyor.set(cid, planned)
    }),
  )

  const items = tagged.map(({ row, isAssignedToMe }) =>
    mapCandidateRow(
      row,
      { isAssignedToMe, referenceDate, collaboratorId: input.collaboratorId! },
      nodesByConveyor,
      plannedByConveyor,
    ),
  )

  return {
    items,
    collaboratorId: input.collaboratorId,
    unavailableReason: null,
  }
}
