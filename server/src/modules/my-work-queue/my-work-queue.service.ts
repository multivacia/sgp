import type pg from 'pg'
import { findCollaboratorIdByAppUserId } from '../auth/auth.repository.js'
import { analyzeConveyorActivitySequence } from '../conveyors/conveyorActivitySequence.logic.js'
import type { SequenceAnalysisNode } from '../conveyors/conveyorActivitySequence.logic.js'
import { listConveyorNodesForSequenceAnalysis } from '../conveyors/conveyors.repository.js'
import { serviceResolveCollaboratorDailyCapacity } from '../operational-settings/operational-settings.service.js'
import { mondayOfWeekContaining } from '../operational-planning/operational-planning.week.js'
import type { MyWorkQueueItemApi, MyWorkQueueResponseApi } from './my-work-queue.dto.js'
import {
  findPublishedWorkPlanForWeek,
  listMyWorkQueueRows,
  type MyWorkQueueListOptions,
  type MyWorkQueueRawRow,
} from './my-work-queue.repository.js'
import { applyWorkQueuePrioritization } from './work-queue-prioritization.js'
import { buildConveyorStepOwnershipIndex } from './my-work-queue-step-assignees.repository.js'
import { analyzeWorkQueueSequenceForCollaborator } from './work-queue-sequence-for-collaborator.js'

function todayIsoLocal(): string {
  const t = new Date()
  return [
    t.getFullYear(),
    String(t.getMonth() + 1).padStart(2, '0'),
    String(t.getDate()).padStart(2, '0'),
  ].join('-')
}

function emptyResponse(date: string): MyWorkQueueResponseApi {
  return {
    date,
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
  if (row.planned_date < date) return 'overdue'
  if (row.activity_operational_status === 'COMPLETED') return 'completed'
  return 'today'
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
  },
): Promise<MyWorkQueueResponseApi> {
  const date = input.date?.trim() || todayIsoLocal()
  const includePastDue = input.includePastDue ?? true
  const { collaboratorId } = input

  const weekStartDate = mondayOfWeekContaining(date)
  const plan = await findPublishedWorkPlanForWeek(pool, weekStartDate)
  if (!plan) {
    return emptyResponse(date)
  }

  const raw = await listMyWorkQueueRows(pool, {
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

  const capacity = await serviceResolveCollaboratorDailyCapacity(pool, collaboratorId, date)
  const plannedMinutesToday = raw
    .filter((row) => row.planned_date === date)
    .reduce((sum, row) => sum + Math.max(0, Number(row.planned_minutes ?? 0) || 0), 0)
  const plannedVsCapacity = {
    plannedMinutesForDay: plannedMinutesToday,
    capacityMinutesForDay: capacity.resolvedDailyMinutes,
    overload: plannedMinutesToday > capacity.resolvedDailyMinutes,
  }

  const conveyorIds = [...new Set(raw.map((row) => row.conveyor_id))]
  const nodesByConveyor = new Map<string, SequenceAnalysisNode[]>()
  const ownershipByConveyor = new Map<
    string,
    Awaited<ReturnType<typeof buildConveyorStepOwnershipIndex>>
  >()
  await Promise.all(
    conveyorIds.map(async (cid) => {
      const [nodes, ownership] = await Promise.all([
        listConveyorNodesForSequenceAnalysis(pool, cid),
        buildConveyorStepOwnershipIndex(pool, cid),
      ])
      nodesByConveyor.set(cid, mapNodesForSequence(nodes))
      ownershipByConveyor.set(cid, ownership)
    }),
  )

  const mappedItems = raw.map((row): MyWorkQueueItemApi => {
    const isActivityCompleted = row.activity_operational_status === 'COMPLETED'
    const seq = analyzeConveyorActivitySequence(
      nodesByConveyor.get(row.conveyor_id) ?? [],
      row.activity_node_id,
    )
    const sequenceForCollaborator = analyzeWorkQueueSequenceForCollaborator(
      seq,
      collaboratorId,
      ownershipByConveyor.get(row.conveyor_id) ?? new Map(),
    )
    const isOutOfSequence = !isActivityCompleted && sequenceForCollaborator.isOutOfSequence
    return {
      workPlanId: row.work_plan_id,
      workPlanItemId: row.work_plan_item_id,
      plannedDate: row.planned_date,
      plannedOrder: row.planned_order,
      plannedMinutes: row.planned_minutes,
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
      isOverdue: row.planned_date < date,
      isOutOfSequence,
      requiresOutOfSequenceJustification:
        !isActivityCompleted && sequenceForCollaborator.requiresOutOfSequenceJustification,
      previousOpenCount: isOutOfSequence ? sequenceForCollaborator.previousOpenCount : 0,
      previousOpenActivities: isOutOfSequence
        ? sequenceForCollaborator.previousOpenActivities
        : [],
      hasPreviousOpenActivitiesFromOtherCollaborators:
        !isActivityCompleted &&
        sequenceForCollaborator.hasPreviousOpenActivitiesFromOtherCollaborators,
      previousOpenActivitiesFromOtherCollaborators: !isActivityCompleted
        ? sequenceForCollaborator.previousOpenActivitiesFromOtherCollaborators
        : [],
      previousOpenActivitiesWarningMessage: !isActivityCompleted
        ? sequenceForCollaborator.previousOpenActivitiesWarningMessage
        : null,
      structuralSequenceIndex: sequenceForCollaborator.structuralSequenceIndex,
      isAssignedToMe: row.is_assigned_to_me,
      requiresUnassignedJustification: !row.is_assigned_to_me,
      plannedVsCapacity,
      isNextRecommended: false,
    }
  })

  const items = applyWorkQueuePrioritization(mappedItems)

  const summary = {
    plannedItemsToday: raw.filter((row) => row.planned_date === date).length,
    plannedMinutesToday,
    overdueItems: items.filter((item) => item.group === 'overdue').length,
    completedItemsToday: items.filter((item) => item.group === 'completed').length,
    outOfSequenceItems: items.filter((item) => item.isOutOfSequence).length,
    unassignedExceptionItems: items.filter((item) => item.requiresUnassignedJustification).length,
    capacityMinutesToday: capacity.resolvedDailyMinutes,
    overload: plannedVsCapacity.overload,
  }

  return {
    date,
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
  },
): Promise<{
  data: MyWorkQueueResponseApi
  meta: { collaboratorId: string | null; unavailableReason: string | null }
}> {
  const date = input.date?.trim() || todayIsoLocal()
  const collaboratorId = await findCollaboratorIdByAppUserId(pool, input.userId)
  if (!collaboratorId) {
    return {
      data: emptyResponse(date),
      meta: {
        collaboratorId: null,
        unavailableReason:
          'Operação indisponível: o seu utilizador não tem colaborador operacional vinculado (app_users.collaborator_id). Peça ao administrador de governança para associar o seu acesso a um colaborador.',
      },
    }
  }

  const data = await serviceGetWorkQueueForCollaborator(pool, {
    collaboratorId,
    date: input.date,
    includePastDue: input.includePastDue,
  })

  return { data, meta: { collaboratorId, unavailableReason: null } }
}
