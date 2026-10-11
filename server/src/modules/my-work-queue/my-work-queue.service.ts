import type pg from 'pg'
import { findCollaboratorIdByAppUserId } from '../auth/auth.repository.js'
import { analyzeConveyorActivitySequence } from '../conveyors/conveyorActivitySequence.logic.js'
import type { SequenceAnalysisNode } from '../conveyors/conveyorActivitySequence.logic.js'
import { listConveyorNodesForSequenceAnalysis, listPlannedCollaboratorsByActivityNode } from '../conveyors/conveyors.repository.js'
import { serviceResolveCollaboratorDailyCapacity } from '../operational-settings/operational-settings.service.js'
import { mondayOfWeekContaining } from '../operational-planning/operational-planning.week.js'
import type { MyWorkQueueItemApi, MyWorkQueueResponseApi } from './my-work-queue.dto.js'
import {
  findPublishedWorkPlanForWeek,
  findPublishedWorkPlansInRange,
  listMyWorkQueueRows,
  type MyWorkQueueListOptions,
  type MyWorkQueueRawRow,
} from './my-work-queue.repository.js'
import { applyWorkQueuePrioritization } from './work-queue-prioritization.js'
import { consolidateWorkQueueRowsByActivity } from './work-queue-consolidation.js'
import {
  sumCollaboratorRealizedMinutesByStep,
  summarizeCollaboratorPlannedSteps,
} from '../operational-planning/planned-activity.repository.js'
import { mapWorkQueueSequenceForCollaborator } from './work-queue-sequence-for-collaborator.js'
import { resolveIsNextRecommended } from './work-queue-sequence-presentation.js'
import { resolveWorkQueuePeriod } from './work-queue-period.js'
import { operationalToday } from '../../shared/operationalWorkDate.js'

function todayIsoLocal(): string {
  const t = new Date()
  return [
    t.getFullYear(),
    String(t.getMonth() + 1).padStart(2, '0'),
    String(t.getDate()).padStart(2, '0'),
  ].join('-')
}

function emptyResponse(
  date: string,
  period: { from: string; to: string } | null = null,
): MyWorkQueueResponseApi {
  return {
    date,
    period,
    planStatus: null,
    summary: {
      plannedItemsToday: 0,
      plannedMinutesToday: 0,
      overdueItems: 0,
      completedItemsToday: 0,
      outOfSequenceItems: 0,
      unassignedExceptionItems: 0,
      capacityMinutesToday: 0,
      overload: false,
    },
    items: [],
  }
}

function mapNodesForSequence(
  nodes: Awaited<ReturnType<typeof listConveyorNodesForSequenceAnalysis>>,
): SequenceAnalysisNode[] {
  return nodes.map((n) => ({
    id: n.id,
    parent_id: n.parent_id,
    node_type: n.node_type,
    order_index: n.order_index,
    name: n.name,
    operational_status: n.operational_status,
    is_active: n.is_active,
  }))
}

export function groupWorkQueueItem(
  row: Pick<MyWorkQueueRawRow, 'planned_date' | 'activity_operational_status'>,
  date: string,
): MyWorkQueueItemApi['group'] {
  if (row.activity_operational_status === 'COMPLETED') return 'completed'
  if (row.activity_operational_status === 'ABORTED') return 'completed'
  if (row.planned_date < date) return 'overdue'
  return 'today'
}

/**
 * Fila do Kiosk com futuras: atrasadas, depois hoje, depois futuras (ordem estável dentro de
 * cada faixa). Atividade futura não é recomendada enquanto houver atrasada ou de hoje em aberto.
 */
export function orderKioskQueueByDateBucket(
  items: MyWorkQueueItemApi[],
  today: string,
): MyWorkQueueItemApi[] {
  const bucket = (item: MyWorkQueueItemApi): number =>
    item.plannedDate < today ? 0 : item.plannedDate === today ? 1 : 2
  const ordered = items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => bucket(a.item) - bucket(b.item) || a.index - b.index)
    .map((entry) => entry.item)
  const hasCurrent = ordered.some(
    (item) => !item.isActivityCompleted && item.plannedDate <= today,
  )
  if (!hasCurrent) return ordered
  return ordered.map((item) =>
    item.plannedDate > today && item.isNextRecommended
      ? { ...item, isNextRecommended: false }
      : item,
  )
}

/**
 * Retorna a fila de trabalho para um collaboratorId já resolvido.
 * Pode ser chamada diretamente pelo endpoint production (sem resolução via userId).
 */
export async function serviceGetWorkQueueForCollaborator(
  pool: pg.Pool,
  input: {
    collaboratorId: string
    date?: string | null
    includePastDue?: boolean
    /** Filtros adicionais (ex.: Modo Produção — somente itens PLANNED da semana vigente). */
    listOptions?: MyWorkQueueListOptions
    /**
     * Pesquisa por período (data planejada, inclusiva) já resolvida por `resolveWorkQueuePeriod`.
     * Quando presente, `date` passa a ser "hoje" (America/Sao_Paulo) e `includePastDue` é ignorado.
     */
    period?: { from: string; to: string } | null
    /**
     * Fila do Kiosk (TASK apontamento-somente-planejado): todas as atividades planejadas para
     * o colaborador em qualquer semana (atrasadas, hoje e futuras), em aberto. `date` = hoje.
     */
    allOpenPlanned?: boolean
  },
): Promise<MyWorkQueueResponseApi> {
  const allOpenPlanned = input.allOpenPlanned === true
  const period = allOpenPlanned ? null : (input.period ?? null)
  const date =
    period || allOpenPlanned ? operationalToday() : input.date?.trim() || todayIsoLocal()
  const includePastDue = input.includePastDue ?? true
  const { collaboratorId } = input

  let raw: MyWorkQueueRawRow[]
  if (allOpenPlanned) {
    raw = await listMyWorkQueueRows(pool, {
      workPlanId: null,
      collaboratorId,
      date,
      includePastDue: false,
      allOpenPlanned: true,
      listOptions: { ...input.listOptions, planItemStatuses: ['PLANNED'] },
    })
    if (raw.length === 0) {
      return emptyResponse(date)
    }
  } else if (period) {
    const plans = await findPublishedWorkPlansInRange(
      pool,
      mondayOfWeekContaining(period.from),
      mondayOfWeekContaining(period.to),
    )
    if (plans.length === 0) {
      return emptyResponse(date, period)
    }
    const perPlan = await Promise.all(
      plans.map((plan) =>
        listMyWorkQueueRows(pool, {
          workPlanId: plan.id,
          collaboratorId,
          date,
          includePastDue: false,
          periodRange: period,
          listOptions: {
            weekStartDate: plan.weekStartDate,
            weekEndDate: plan.weekEndDate,
            ...input.listOptions,
          },
        }),
      ),
    )
    raw = perPlan.flat()
  } else {
    const weekStartDate = mondayOfWeekContaining(date)
    const plan = await findPublishedWorkPlanForWeek(pool, weekStartDate)
    if (!plan) {
      return emptyResponse(date)
    }

    raw = await listMyWorkQueueRows(pool, {
      workPlanId: plan.id,
      collaboratorId,
      date,
      includePastDue,
      listOptions: {
        weekStartDate: plan.weekStartDate,
        weekEndDate: plan.weekEndDate,
        ...input.listOptions,
      },
    })
  }

  /** Itens que compõem os totais: o dia selecionado ou, no modo período, o período inteiro. */
  const scopeRows = period ? raw : raw.filter((row) => row.planned_date === date)
  const capacity = await serviceResolveCollaboratorDailyCapacity(pool, collaboratorId, date)
  const plannedMinutesToday = scopeRows.reduce(
    (sum, row) => sum + Math.max(0, Number(row.planned_minutes ?? 0) || 0),
    0,
  )
  const todayMinutes = period
    ? raw
        .filter((row) => row.planned_date === date)
        .reduce((sum, row) => sum + Math.max(0, Number(row.planned_minutes ?? 0) || 0), 0)
    : plannedMinutesToday
  const plannedVsCapacity = {
    plannedMinutesForDay: todayMinutes,
    capacityMinutesForDay: capacity.resolvedDailyMinutes,
    overload: todayMinutes > capacity.resolvedDailyMinutes,
  }

  // Um cartão por atividade: data mais antiga e minutos somados de todos os dias do
  // colaborador; apontado = apontamentos do próprio colaborador. Totais acima usam `raw`.
  const stepIds = [...new Set(raw.map((row) => row.activity_node_id))]
  const [plannedSummaries, realizedByStep] = await Promise.all([
    summarizeCollaboratorPlannedSteps(pool, collaboratorId, stepIds),
    sumCollaboratorRealizedMinutesByStep(pool, collaboratorId, stepIds),
  ])
  const cards = consolidateWorkQueueRowsByActivity(raw, plannedSummaries)

  const conveyorIds = [...new Set(cards.map((row) => row.conveyor_id))]
  const nodesByConveyor = new Map<string, SequenceAnalysisNode[]>()
  const plannedByConveyor = new Map<string, Map<string, Set<string>>>()
  await Promise.all(
    conveyorIds.map(async (cid) => {
      const [nodes, planned] = await Promise.all([
        listConveyorNodesForSequenceAnalysis(pool, cid),
        listPlannedCollaboratorsByActivityNode(pool, cid),
      ])
      nodesByConveyor.set(cid, mapNodesForSequence(nodes))
      plannedByConveyor.set(cid, planned)
    }),
  )

  const mappedItems = cards.map((row): MyWorkQueueItemApi => {
    const isActivityCompleted = row.activity_operational_status === 'COMPLETED'
    const isActivityAborted = row.activity_operational_status === 'ABORTED'
    const closedForPointing = isActivityCompleted || isActivityAborted
    const seq = analyzeConveyorActivitySequence(
      nodesByConveyor.get(row.conveyor_id) ?? [],
      row.activity_node_id,
      {
        currentCollaboratorId: collaboratorId,
        plannedCollaboratorsByActivityNodeId:
          plannedByConveyor.get(row.conveyor_id) ?? new Map(),
      },
    )
    const sequenceForCollaborator = mapWorkQueueSequenceForCollaborator({
      seq,
      isActivityCompleted: closedForPointing,
      conveyorOperationalStatus: row.conveyor_operational_status,
      planItemStatus: row.status,
    })
    const isOutOfSequence = !closedForPointing && sequenceForCollaborator.isOutOfSequence
    return {
      workPlanId: row.work_plan_id,
      workPlanItemId: row.work_plan_item_id,
      plannedDate: row.planned_date,
      plannedOrder: row.planned_order,
      plannedMinutes: row.planned_minutes,
      realizedMinutes: realizedByStep.get(row.activity_node_id) ?? 0,
      status: row.status,
      group: groupWorkQueueItem(row, date),
      conveyorId: row.conveyor_id,
      conveyorOperationalStatus: row.conveyor_operational_status,
      conveyorTitle: row.conveyor_title,
      clientName: row.client_name,
      vehicleDescription: row.vehicle_description,
      licensePlate: row.license_plate,
      taskTitle: row.task_title,
      sectorTitle: row.sector_title,
      activityNodeId: row.activity_node_id,
      activityTitle: row.activity_title,
      activityOperationalStatus: row.activity_operational_status,
      isActivityCompleted,
      isOverdue: !closedForPointing && row.planned_date < date,
      isOutOfSequence,
      isNextRecommended:
        !closedForPointing &&
        resolveIsNextRecommended({
          isActivityCompleted: closedForPointing,
          hasPreviousPendingStep: sequenceForCollaborator.hasPreviousPendingStep,
          canPointTime: sequenceForCollaborator.canPointTime,
        }),
      hasPreviousPendingStep:
        !closedForPointing && sequenceForCollaborator.hasPreviousPendingStep,
      sequenceWarningType: !closedForPointing
        ? sequenceForCollaborator.sequenceWarningType
        : undefined,
      sequenceWarningLabel: !closedForPointing
        ? sequenceForCollaborator.sequenceWarningLabel
        : undefined,
      requiresOutOfSequenceJustification:
        !closedForPointing && sequenceForCollaborator.requiresOutOfSequenceJustification,
      canPointTime: !isActivityAborted && sequenceForCollaborator.canPointTime,
      blockingReason: isActivityAborted
        ? 'ACTIVITY_ABORTED'
        : sequenceForCollaborator.blockingReason,
      previousOpenCount: !closedForPointing ? sequenceForCollaborator.previousOpenCount : 0,
      previousOpenActivities: !closedForPointing
        ? sequenceForCollaborator.previousOpenActivities
        : [],
      allPreviousOpenActivities: !closedForPointing
        ? sequenceForCollaborator.allPreviousOpenActivities
        : [],
      awaitingPreviousActivities: !closedForPointing
        ? sequenceForCollaborator.awaitingPreviousActivities
        : [],
      hasPreviousOpenActivitiesFromOtherCollaborators:
        !closedForPointing &&
        sequenceForCollaborator.hasPreviousOpenActivitiesFromOtherCollaborators,
      previousOpenActivitiesFromOtherCollaborators: !closedForPointing
        ? sequenceForCollaborator.awaitingPreviousActivities.map((p) => ({
            ...p,
            collaboratorNames: [] as string[],
          }))
        : [],
      previousOpenActivitiesWarningMessage: !closedForPointing
        ? sequenceForCollaborator.previousOpenActivitiesWarningMessage
        : null,
      structuralSequenceIndex: sequenceForCollaborator.structuralSequenceIndex,
      isAssignedToMe: row.is_assigned_to_me,
      requiresUnassignedJustification: !row.is_assigned_to_me,
      plannedVsCapacity,
    }
  })

  const items = allOpenPlanned
    ? orderKioskQueueByDateBucket(applyWorkQueuePrioritization(mappedItems), date)
    : applyWorkQueuePrioritization(mappedItems)

  const summary = {
    plannedItemsToday: scopeRows.length,
    plannedMinutesToday,
    overdueItems: items.filter((item) => item.group === 'overdue').length,
    completedItemsToday: items.filter((item) => item.group === 'completed').length,
    outOfSequenceItems: items.filter((item) => item.hasPreviousPendingStep).length,
    unassignedExceptionItems: items.filter((item) => item.requiresUnassignedJustification).length,
    capacityMinutesToday: capacity.resolvedDailyMinutes,
    /** Sobrecarga é diária; no modo período não se aplica ao total do período. */
    overload: period ? false : plannedVsCapacity.overload,
  }

  return {
    date,
    period,
    planStatus: 'PUBLISHED',
    summary,
    items,
  }
}

export async function serviceGetMyWorkQueue(
  pool: pg.Pool,
  input: {
    userId: string
    date?: string | null
    includePastDue?: boolean
    from?: string | null
    to?: string | null
  },
): Promise<{
  data: MyWorkQueueResponseApi
  meta: { collaboratorId: string | null; unavailableReason: string | null }
}> {
  const period = resolveWorkQueuePeriod(input.from, input.to)
  const date = period ? operationalToday() : input.date?.trim() || todayIsoLocal()
  const collaboratorId = await findCollaboratorIdByAppUserId(pool, input.userId)
  if (!collaboratorId) {
    return {
      data: emptyResponse(date, period),
      meta: {
        collaboratorId: null,
        unavailableReason:
          'Sua conta não está vinculada a um colaborador operacional. Peça ao administrador para associar seu acesso.',
      },
    }
  }

  const data = await serviceGetWorkQueueForCollaborator(pool, {
    collaboratorId,
    date: input.date,
    includePastDue: input.includePastDue,
    period,
  })

  return { data, meta: { collaboratorId, unavailableReason: null } }
}
