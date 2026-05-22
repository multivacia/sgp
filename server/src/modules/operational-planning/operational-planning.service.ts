import type pg from 'pg'
import { AppError } from '../../shared/errors/AppError.js'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'
import { analyzeConveyorActivitySequence } from '../conveyors/conveyorActivitySequence.logic.js'
import type { SequenceAnalysisNode } from '../conveyors/conveyorActivitySequence.logic.js'
import { listConveyorNodesForSequenceAnalysis } from '../conveyors/conveyors.repository.js'
import { serviceResolveCollaboratorDailyCapacity } from '../operational-settings/operational-settings.service.js'
import type {
  ApplyConveyorPlanSyncField,
  ApplyConveyorPlanToWeekItemBody,
  SaveOperationalWeekPlanBody,
} from './operational-planning.schemas.js'
import {
  deriveConveyorPlanFactorySyncState,
  type ConveyorPlanFactorySyncDifference,
  type ConveyorPlanFactorySyncStatus,
} from '../conveyor-operational-plan/deriveConveyorPlanFactorySyncState.js'
import {
  clearConveyorPlanItemFactoryLink,
  clearConveyorPlanItemsByOriginWorkPlanItemIds,
  linkConveyorPlanItemToWorkPlanItem,
  loadConveyorPlanItemsForWeekSync,
  recalculateConveyorPlanFactoryStatuses,
} from '../conveyor-operational-plan/conveyor-operational-plan.repository.js'
import { refreshConveyorOperationalPlanSyncStatusByItemIds } from '../conveyor-operational-plan/refreshConveyorOperationalPlanSyncStatus.js'
import {
  deleteItemsForWorkPlan,
  findOperationalWorkPlanById,
  findOperationalWorkPlanByWeekStart,
  insertOperationalWorkPlan,
  insertWorkPlanItems,
  isConveyorPlanItemLinkedElsewhere,
  listEnrichedItemsForWorkPlan,
  listExecutionOutsidePlanEntriesForWeek,
  listWeekActivityStepEventsForWeek,
  listWeekActivityTimeEntriesForWeek,
  listFactoryIntakeItems,
  listOperationalPlanningBacklog,
  listWorkPlanItemLinks,
  loadConveyorPlanItemForFactoryLink,
  loadWorkPlanItemForSyncApply,
  loadStepForPlanningValidation,
  updateWorkPlanItemFromConveyorPlan,
  publishOperationalWorkPlan,
  touchOperationalWorkPlanUpdatedAt,
  type FactoryIntakeRawRow,
  type PlanItemEnrichedRow,
} from './operational-planning.repository.js'
import {
  assertFriday,
  assertMonday,
  fridayAfterMonday,
  isDateInWeekInclusive,
  mondayOfWeekContaining,
  weekDayStrings,
} from './operational-planning.week.js'
import {
  buildExecutionOutsidePlanSummary,
  mapExecutionOutsidePlanEntryToApi,
} from './operational-planning.execution-outside-plan.js'
import { mergeWeekActivityItems } from './operational-planning.week-activity.js'

function todayIsoLocal(): string {
  const t = new Date()
  return [
    t.getFullYear(),
    String(t.getMonth() + 1).padStart(2, '0'),
    String(t.getDate()).padStart(2, '0'),
  ].join('-')
}

function isDeadlineOverdue(deadline: string | null): boolean {
  if (!deadline) return false
  const d = deadline.trim().slice(0, 10)
  return d.length >= 10 && d < todayIsoLocal()
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

export type OperationalPlanningWeekResponse = {
  hasPlan: boolean
  week: {
    weekStartDate: string
    weekEndDate: string
    weekdayDates: readonly string[]
  }
  plan: null | {
    id: string
    weekStartDate: string
    weekEndDate: string
    status: 'DRAFT' | 'PUBLISHED'
    publishedAt: string | null
    items: Array<{
      id: string
      conveyorId: string
      conveyorTitle: string
      activityNodeId: string
      taskTitle: string
      sectorTitle: string
      activityTitle: string
      assignedCollaboratorId: string | null
      assignedCollaboratorName: string | null
      plannedDate: string
      plannedOrder: number
      plannedMinutes: number | null
      status: string
      notes: string | null
      realizedMinutes: number
      activityOperationalStatus: string | null
      conveyorOperationalPlanItemId?: string | null
      syncStatus?: ConveyorPlanFactorySyncStatus | null
      syncDifferences?: ConveyorPlanFactorySyncDifference[]
    }>
    createdAt: string
    updatedAt: string
  }
  summary: {
    plannedMinutes: number
    plannedItems: number
    collaboratorsCount: number
  }
  capacityByCollaboratorDay: Array<{
    collaboratorId: string
    date: string
    capacityMinutes: number
    plannedMinutes: number
  }>
  executionOutsidePlanSummary: {
    totalMinutes: number
    entriesCount: number
    activitiesCount: number
    conveyorsCount: number
  }
  executionOutsidePlanEntries: Array<{
    id: string
    conveyorId: string
    conveyorTitle: string
    activityNodeId: string
    activityTitle: string
    taskTitle: string
    sectorTitle: string
    collaboratorId: string
    collaboratorName: string
    entryAt: string
    minutes: number
    entryOrigin: 'ASSIGNED' | 'UNASSIGNED_EXCEPTION'
    exceptionJustification: string | null
    notes: string | null
  }>
}

export function planItemEnrichedRowToApi(
  row: PlanItemEnrichedRow,
  sync?: {
    syncStatus: ConveyorPlanFactorySyncStatus | null
    syncDifferences: ConveyorPlanFactorySyncDifference[]
  },
) {
  return {
    id: row.id,
    conveyorId: row.conveyor_id,
    conveyorTitle: row.conveyor_title,
    activityNodeId: row.activity_node_id,
    taskTitle: row.task_title,
    sectorTitle: row.sector_title,
    activityTitle: row.activity_title,
    assignedCollaboratorId: row.assigned_collaborator_id,
    assignedCollaboratorName: row.assigned_collaborator_name,
    plannedDate: row.planned_date,
    plannedOrder: row.planned_order,
    plannedMinutes: row.planned_minutes,
    status: row.status,
    notes: row.notes,
    realizedMinutes: row.realized_minutes,
    activityOperationalStatus: row.activity_operational_status,
    conveyorOperationalPlanItemId: row.conveyor_operational_plan_item_id,
    ...(sync
      ? { syncStatus: sync.syncStatus, syncDifferences: sync.syncDifferences }
      : {}),
  }
}

async function mapWeekPlanItemsToApi(
  pool: pg.Pool,
  items: PlanItemEnrichedRow[],
) {
  const linkedIds = [
    ...new Set(
      items
        .map((i) => i.conveyor_operational_plan_item_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ]
  const conveyorById = await loadConveyorPlanItemsForWeekSync(pool, linkedIds)

  return items.map((row) => {
    const copId = row.conveyor_operational_plan_item_id
    if (!copId) return planItemEnrichedRowToApi(row)

    const planItem = conveyorById.get(copId)
    if (!planItem) {
      return planItemEnrichedRowToApi(row, {
        syncStatus: 'DIVERGED',
        syncDifferences: [
          {
            code: 'FACTORY_ITEM_MISSING',
            message: 'Item do plano da esteira vinculado não foi encontrado.',
            planValue: null,
            factoryValue: null,
          },
        ],
      })
    }

    const derived = deriveConveyorPlanFactorySyncState({
      planItem: {
        plannedDate: planItem.planned_date,
        plannedMinutes: planItem.planned_minutes,
        plannedCollaboratorId: planItem.planned_collaborator_id,
        plannedTeamId: planItem.planned_team_id,
        status: planItem.status,
        reviewRequired: planItem.review_required,
        hasFactoryLink: true,
      },
      factoryItem: {
        plannedDate: row.planned_date,
        plannedMinutes: row.planned_minutes,
        assignedCollaboratorId: row.assigned_collaborator_id,
        assignedTeamId: row.assigned_team_id,
        status: row.status,
      },
    })

    return planItemEnrichedRowToApi(row, {
      syncStatus: derived.syncStatus,
      syncDifferences: derived.differences,
    })
  })
}

async function buildCapacityByCollaboratorDay(
  pool: pg.Pool,
  items: PlanItemEnrichedRow[],
): Promise<
  Array<{
    collaboratorId: string
    date: string
    capacityMinutes: number
    plannedMinutes: number
  }>
> {
  const pairs = new Map<string, { collaboratorId: string; date: string }>()
  for (const it of items) {
    if (!it.assigned_collaborator_id) continue
    const k = `${it.assigned_collaborator_id}|${it.planned_date}`
    pairs.set(k, { collaboratorId: it.assigned_collaborator_id, date: it.planned_date })
  }
  const out: Array<{
    collaboratorId: string
    date: string
    capacityMinutes: number
    plannedMinutes: number
  }> = []
  for (const { collaboratorId, date } of pairs.values()) {
    const cap = await serviceResolveCollaboratorDailyCapacity(pool, collaboratorId, date)
    const plannedSum = items
      .filter(
        (i) =>
          i.assigned_collaborator_id === collaboratorId && i.planned_date === date,
      )
      .reduce((s, i) => s + Math.max(0, Number(i.planned_minutes ?? 0) || 0), 0)
    out.push({
      collaboratorId,
      date,
      capacityMinutes: cap.resolvedDailyMinutes,
      plannedMinutes: plannedSum,
    })
  }
  out.sort((a, b) => a.date.localeCompare(b.date) || a.collaboratorId.localeCompare(b.collaboratorId))
  return out
}

export async function serviceGetOperationalPlanningWeek(
  pool: pg.Pool,
  weekStartRaw: string,
): Promise<OperationalPlanningWeekResponse> {
  const weekStartDate = mondayOfWeekContaining(weekStartRaw)
  const weekEndDate = fridayAfterMonday(weekStartDate)
  const weekdayDates = weekDayStrings(weekStartDate)

  const planRow = await findOperationalWorkPlanByWeekStart(pool, weekStartDate)
  const executionOutsidePlanRows = await listExecutionOutsidePlanEntriesForWeek(pool, {
    weekStartDate,
    weekEndDate,
    workPlanId: planRow?.id ?? null,
  })
  const executionOutsidePlanSummary = buildExecutionOutsidePlanSummary(executionOutsidePlanRows)
  const executionOutsidePlanEntries = executionOutsidePlanRows.map(mapExecutionOutsidePlanEntryToApi)

  if (!planRow) {
    return {
      hasPlan: false,
      week: { weekStartDate, weekEndDate, weekdayDates },
      plan: null,
      summary: { plannedMinutes: 0, plannedItems: 0, collaboratorsCount: 0 },
      capacityByCollaboratorDay: [],
      executionOutsidePlanSummary,
      executionOutsidePlanEntries,
    }
  }

  const items = await listEnrichedItemsForWorkPlan(pool, planRow.id)
  const plannedMinutes = items.reduce(
    (s, i) => s + Math.max(0, Number(i.planned_minutes ?? 0) || 0),
    0,
  )
  const collabIds = new Set(
    items.map((i) => i.assigned_collaborator_id).filter((x): x is string => Boolean(x)),
  )

  const capacityByCollaboratorDay = await buildCapacityByCollaboratorDay(pool, items)

  return {
    hasPlan: true,
    week: { weekStartDate, weekEndDate, weekdayDates },
    plan: {
      id: planRow.id,
      weekStartDate: planRow.week_start_date,
      weekEndDate: planRow.week_end_date,
      status: planRow.status,
      publishedAt: planRow.published_at,
      items: await mapWeekPlanItemsToApi(pool, items),
      createdAt: planRow.created_at,
      updatedAt: planRow.updated_at,
    },
    summary: {
      plannedMinutes,
      plannedItems: items.length,
      collaboratorsCount: collabIds.size,
    },
    capacityByCollaboratorDay,
    executionOutsidePlanSummary,
    executionOutsidePlanEntries,
  }
}

export type OperationalPlanningWeekActivityResponse = {
  data: ReturnType<typeof mergeWeekActivityItems>['items']
  meta: {
    count: number
    hasMore: boolean
  }
}

export async function serviceGetOperationalPlanningWeekActivity(
  pool: pg.Pool,
  weekStartRaw: string,
  limitRaw?: number,
): Promise<OperationalPlanningWeekActivityResponse> {
  const weekStartDate = mondayOfWeekContaining(weekStartRaw)
  const weekEndDate = fridayAfterMonday(weekStartDate)
  const limit = Math.max(1, Math.min(200, Math.floor(limitRaw ?? 100) || 100))
  const fetchLimit = Math.min(200, limit + 1)

  const planRow = await findOperationalWorkPlanByWeekStart(pool, weekStartDate)

  const [timeEntries, stepEvents] = await Promise.all([
    listWeekActivityTimeEntriesForWeek(pool, {
      weekStartDate,
      weekEndDate,
      workPlanId: planRow?.id ?? null,
      fetchLimit,
    }),
    listWeekActivityStepEventsForWeek(pool, {
      weekStartDate,
      weekEndDate,
      fetchLimit,
    }),
  ])

  const { items, hasMore } = mergeWeekActivityItems(timeEntries, stepEvents, limit)

  return {
    data: items,
    meta: {
      count: items.length,
      hasMore,
    },
  }
}

function validateWeekShape(weekStartDate: string, weekEndDate: string): void {
  try {
    assertMonday(weekStartDate)
    assertFriday(weekEndDate)
  } catch (e) {
    throw new AppError(
      e instanceof Error ? e.message : 'Semana inválida.',
      400,
      ErrorCodes.VALIDATION_ERROR,
    )
  }
  const expectedEnd = fridayAfterMonday(weekStartDate)
  if (weekEndDate !== expectedEnd) {
    throw new AppError(
      'weekEndDate deve ser a sexta-feira da mesma semana que weekStartDate.',
      400,
      ErrorCodes.VALIDATION_ERROR,
    )
  }
}

async function validatePlanItems(
  pool: pg.Pool,
  body: SaveOperationalWeekPlanBody,
  excludeWorkPlanId?: string,
): Promise<void> {
  if (!body.items.length) return

  const seenActivity = new Set<string>()
  const seenConveyorPlanItem = new Set<string>()
  for (const it of body.items) {
    if (seenActivity.has(it.activityNodeId)) {
      throw new AppError(
        'Cada Atividade só pode aparecer uma vez no plano.',
        400,
        ErrorCodes.VALIDATION_ERROR,
      )
    }
    seenActivity.add(it.activityNodeId)

    if (it.conveyorOperationalPlanItemId) {
      if (seenConveyorPlanItem.has(it.conveyorOperationalPlanItemId)) {
        throw new AppError(
          'Cada item do plano da esteira só pode ser encaixado uma vez na semana.',
          400,
          ErrorCodes.VALIDATION_ERROR,
        )
      }
      seenConveyorPlanItem.add(it.conveyorOperationalPlanItemId)
    }

    if (!isDateInWeekInclusive(it.plannedDate, body.weekStartDate, body.weekEndDate)) {
      throw new AppError(
        'plannedDate deve estar dentro da semana do plano.',
        400,
        ErrorCodes.VALIDATION_ERROR,
      )
    }

    const row = await loadStepForPlanningValidation(pool, it.conveyorId, it.activityNodeId)
    if (!row) {
      throw new AppError(
        'Atividade não encontrada para a esteira indicada.',
        400,
        ErrorCodes.VALIDATION_ERROR,
      )
    }
    if (row.node_type !== 'STEP') {
      throw new AppError('Somente Atividades (STEP) podem ser planejadas.', 400, ErrorCodes.VALIDATION_ERROR)
    }
    if (!row.is_active) {
      throw new AppError('Atividade inativa não pode ser planejada.', 400, ErrorCodes.VALIDATION_ERROR)
    }
    if (row.conveyor_operational_status === 'CONCLUIDA') {
      throw new AppError('Esteira concluída não aceita planejamento.', 400, ErrorCodes.VALIDATION_ERROR)
    }
    if (row.operational_status === 'COMPLETED') {
      throw new AppError('Atividade já concluída não pode ser planejada.', 400, ErrorCodes.VALIDATION_ERROR)
    }

    if (it.conveyorOperationalPlanItemId) {
      const copItem = await loadConveyorPlanItemForFactoryLink(
        pool,
        it.conveyorOperationalPlanItemId,
      )
      if (!copItem) {
        throw new AppError(
          'Item do plano da esteira não encontrado.',
          400,
          ErrorCodes.VALIDATION_ERROR,
        )
      }
      if (copItem.conveyor_id !== it.conveyorId || copItem.activity_node_id !== it.activityNodeId) {
        throw new AppError(
          'Item do plano da esteira não corresponde à esteira/atividade indicada.',
          400,
          ErrorCodes.VALIDATION_ERROR,
        )
      }
      if (copItem.plan_status !== 'WAITING_FACTORY_PLANNING') {
        throw new AppError(
          'Plano da esteira não está aguardando encaixe na fábrica.',
          400,
          ErrorCodes.VALIDATION_ERROR,
        )
      }
      if (copItem.status === 'CANCELLED' || copItem.status === 'COMPLETED') {
        throw new AppError(
          'Item do plano da esteira não pode ser encaixado neste status.',
          400,
          ErrorCodes.VALIDATION_ERROR,
        )
      }
      const linkedElsewhere = await isConveyorPlanItemLinkedElsewhere(
        pool,
        it.conveyorOperationalPlanItemId,
        excludeWorkPlanId,
      )
      if (linkedElsewhere) {
        throw new AppError(
          'Item do plano da esteira já está encaixado em outro plano semanal.',
          409,
          ErrorCodes.CONFLICT,
        )
      }
    }
  }
}

async function replaceWeekPlanItemsWithConveyorReconciliation(
  client: pg.PoolClient,
  planId: string,
  body: SaveOperationalWeekPlanBody,
): Promise<void> {
  const oldLinks = await listWorkPlanItemLinks(client, planId)
  const oldFactoryItemIds = oldLinks.map((l) => l.factoryItemId)

  await deleteItemsForWorkPlan(client, planId)
  if (oldFactoryItemIds.length > 0) {
    await clearConveyorPlanItemsByOriginWorkPlanItemIds(client, oldFactoryItemIds)
  }

  const inserted = await insertWorkPlanItems(
    client,
    planId,
    body.items.map((it) => ({
      conveyorId: it.conveyorId,
      activityNodeId: it.activityNodeId,
      assignedCollaboratorId: it.assignedCollaboratorId,
      assignedTeamId: it.assignedTeamId ?? null,
      plannedDate: it.plannedDate,
      plannedOrder: it.plannedOrder,
      plannedMinutes: it.plannedMinutes ?? null,
      notes: it.notes ?? null,
      conveyorOperationalPlanItemId: it.conveyorOperationalPlanItemId ?? null,
    })),
  )

  const newConveyorIds = new Set<string>()
  const affectedPlanIds: string[] = []

  for (const row of inserted) {
    if (!row.conveyorOperationalPlanItemId) continue
    newConveyorIds.add(row.conveyorOperationalPlanItemId)
    const planIdLinked = await linkConveyorPlanItemToWorkPlanItem(
      client,
      row.conveyorOperationalPlanItemId,
      row.id,
    )
    if (planIdLinked) affectedPlanIds.push(planIdLinked)
  }

  for (const old of oldLinks) {
    if (!newConveyorIds.has(old.conveyorOperationalPlanItemId)) {
      const planIdCleared = await clearConveyorPlanItemFactoryLink(
        client,
        old.conveyorOperationalPlanItemId,
      )
      if (planIdCleared) affectedPlanIds.push(planIdCleared)
    }
  }

  const conveyorItemIdsToRefresh = [
    ...oldLinks.map((l) => l.conveyorOperationalPlanItemId),
    ...inserted
      .map((r) => r.conveyorOperationalPlanItemId)
      .filter((id): id is string => Boolean(id)),
  ]
  if (conveyorItemIdsToRefresh.length > 0) {
    await refreshConveyorOperationalPlanSyncStatusByItemIds(client, conveyorItemIdsToRefresh)
  } else if (affectedPlanIds.length > 0) {
    await recalculateConveyorPlanFactoryStatuses(client, affectedPlanIds)
  }
}

export async function serviceSaveOperationalWeekPlan(
  pool: pg.Pool,
  actorUserId: string,
  body: SaveOperationalWeekPlanBody,
): Promise<OperationalPlanningWeekResponse> {
  validateWeekShape(body.weekStartDate, body.weekEndDate)

  const existingPlan = await findOperationalWorkPlanByWeekStart(pool, body.weekStartDate)
  await validatePlanItems(pool, body, existingPlan?.id)

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    let planId = existingPlan?.id
    if (!planId) {
      planId = await insertOperationalWorkPlan(client, {
        weekStartDate: body.weekStartDate,
        weekEndDate: body.weekEndDate,
        createdByUserId: actorUserId,
        status: 'DRAFT',
      })
      const inserted = await insertWorkPlanItems(
        client,
        planId,
        body.items.map((it) => ({
          conveyorId: it.conveyorId,
          activityNodeId: it.activityNodeId,
          assignedCollaboratorId: it.assignedCollaboratorId,
          assignedTeamId: it.assignedTeamId ?? null,
          plannedDate: it.plannedDate,
          plannedOrder: it.plannedOrder,
          plannedMinutes: it.plannedMinutes ?? null,
          notes: it.notes ?? null,
          conveyorOperationalPlanItemId: it.conveyorOperationalPlanItemId ?? null,
        })),
      )
      const affectedPlanIds: string[] = []
      for (const row of inserted) {
        if (!row.conveyorOperationalPlanItemId) continue
        const planIdLinked = await linkConveyorPlanItemToWorkPlanItem(
          client,
          row.conveyorOperationalPlanItemId,
          row.id,
        )
        if (planIdLinked) affectedPlanIds.push(planIdLinked)
      }
      const insertedConveyorIds = inserted
        .map((r) => r.conveyorOperationalPlanItemId)
        .filter((id): id is string => Boolean(id))
      if (insertedConveyorIds.length > 0) {
        await refreshConveyorOperationalPlanSyncStatusByItemIds(client, insertedConveyorIds)
      } else if (affectedPlanIds.length > 0) {
        await recalculateConveyorPlanFactoryStatuses(client, affectedPlanIds)
      }
    } else {
      await client.query(
        `
        UPDATE operational_work_plans
        SET
          week_end_date = $2::date,
          updated_at = now()
        WHERE id = $1::uuid
          AND deleted_at IS NULL
        `,
        [planId, body.weekEndDate],
      )
      await replaceWeekPlanItemsWithConveyorReconciliation(client, planId, body)
    }
    await touchOperationalWorkPlanUpdatedAt(client, planId)

    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }

  return serviceGetOperationalPlanningWeek(pool, body.weekStartDate)
}

export async function servicePatchOperationalWeekPlan(
  pool: pg.Pool,
  planId: string,
  _actorUserId: string,
  body: SaveOperationalWeekPlanBody,
): Promise<OperationalPlanningWeekResponse> {
  const existing = await findOperationalWorkPlanById(pool, planId)
  if (!existing) {
    throw new AppError('Plano não encontrado.', 404, ErrorCodes.NOT_FOUND)
  }
  if (body.weekStartDate !== existing.week_start_date || body.weekEndDate !== existing.week_end_date) {
    throw new AppError(
      'Semana do corpo não coincide com o plano. Use weekStartDate/weekEndDate do plano.',
      400,
      ErrorCodes.VALIDATION_ERROR,
    )
  }
  validateWeekShape(body.weekStartDate, body.weekEndDate)
  await validatePlanItems(pool, body, planId)

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await replaceWeekPlanItemsWithConveyorReconciliation(client, planId, body)
    await touchOperationalWorkPlanUpdatedAt(client, planId)
    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }

  return serviceGetOperationalPlanningWeek(pool, body.weekStartDate)
}

const ALL_APPLY_CONVEYOR_SYNC_FIELDS: readonly ApplyConveyorPlanSyncField[] = [
  'plannedDate',
  'plannedMinutes',
  'assignedCollaboratorId',
  'assignedTeamId',
]

function normConveyorPlanDate(value: string | null | undefined): string | null {
  const t = value?.trim().slice(0, 10)
  return t && t.length >= 10 ? t : null
}

function normConveyorPlanMinutes(value: number | null | undefined): number | null {
  if (value == null) return null
  if (!Number.isFinite(value)) return null
  return Math.max(0, Math.floor(value))
}

export async function serviceApplyConveyorPlanValuesToWeekItem(
  pool: pg.Pool,
  workPlanItemId: string,
  body: ApplyConveyorPlanToWeekItemBody,
): Promise<OperationalPlanningWeekResponse> {
  const factoryItem = await loadWorkPlanItemForSyncApply(pool, workPlanItemId)
  if (!factoryItem) {
    throw new AppError('Item do plano semanal não encontrado.', 404, ErrorCodes.NOT_FOUND)
  }

  const copId = factoryItem.conveyor_operational_plan_item_id
  if (!copId) {
    throw new AppError(
      'Item semanal não está vinculado ao plano da esteira.',
      400,
      ErrorCodes.VALIDATION_ERROR,
    )
  }

  if (factoryItem.status === 'CANCELLED') {
    throw new AppError(
      'Item cancelado no planejamento da fábrica não pode ser atualizado.',
      400,
      ErrorCodes.VALIDATION_ERROR,
    )
  }

  if (factoryItem.activity_operational_status === 'COMPLETED') {
    throw new AppError(
      'Atividade já concluída não pode ter agenda alterada por sincronização.',
      400,
      ErrorCodes.VALIDATION_ERROR,
    )
  }

  const conveyorById = await loadConveyorPlanItemsForWeekSync(pool, [copId])
  const planItem = conveyorById.get(copId)
  if (!planItem) {
    throw new AppError(
      'Item do plano da esteira vinculado não foi encontrado.',
      404,
      ErrorCodes.NOT_FOUND,
    )
  }

  const planDate = normConveyorPlanDate(planItem.planned_date)
  if (!planDate) {
    throw new AppError(
      'Plano da esteira sem data planejada válida.',
      400,
      ErrorCodes.VALIDATION_ERROR,
    )
  }

  if (!isDateInWeekInclusive(planDate, factoryItem.week_start_date, factoryItem.week_end_date)) {
    throw new AppError(
      'A data do plano da esteira está fora da semana exibida. Replaneje manualmente em outra semana.',
      400,
      ErrorCodes.VALIDATION_ERROR,
    )
  }

  const requestedFields = body.fields?.length
    ? body.fields
    : [...ALL_APPLY_CONVEYOR_SYNC_FIELDS]
  const fieldSet = new Set<ApplyConveyorPlanSyncField>(requestedFields)

  const nextValues = {
    plannedDate: fieldSet.has('plannedDate') ? planDate : factoryItem.planned_date,
    plannedMinutes: fieldSet.has('plannedMinutes')
      ? normConveyorPlanMinutes(planItem.planned_minutes)
      : factoryItem.planned_minutes,
    assignedCollaboratorId: fieldSet.has('assignedCollaboratorId')
      ? planItem.planned_collaborator_id
      : factoryItem.assigned_collaborator_id,
    assignedTeamId: fieldSet.has('assignedTeamId')
      ? planItem.planned_team_id
      : factoryItem.assigned_team_id,
  }

  if (
    fieldSet.has('plannedDate') &&
    !isDateInWeekInclusive(nextValues.plannedDate, factoryItem.week_start_date, factoryItem.week_end_date)
  ) {
    throw new AppError(
      'A data do plano da esteira está fora da semana exibida. Replaneje manualmente em outra semana.',
      400,
      ErrorCodes.VALIDATION_ERROR,
    )
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await updateWorkPlanItemFromConveyorPlan(client, workPlanItemId, nextValues)
    await touchOperationalWorkPlanUpdatedAt(client, factoryItem.work_plan_id)
    await refreshConveyorOperationalPlanSyncStatusByItemIds(client, [copId])
    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }

  return serviceGetOperationalPlanningWeek(pool, factoryItem.week_start_date)
}

export async function servicePublishOperationalWeekPlan(
  pool: pg.Pool,
  planId: string,
  publisherUserId: string,
): Promise<{ published: boolean }> {
  const existing = await findOperationalWorkPlanById(pool, planId)
  if (!existing) {
    throw new AppError('Plano não encontrado.', 404, ErrorCodes.NOT_FOUND)
  }
  if (existing.status === 'PUBLISHED') {
    return { published: false }
  }

  const plannedItems = await listEnrichedItemsForWorkPlan(pool, planId)
  if (plannedItems.length === 0) {
    throw new AppError(
      'Adicione ao menos uma atividade antes de publicar o plano.',
      400,
      ErrorCodes.VALIDATION_ERROR,
    )
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const okPub = await publishOperationalWorkPlan(client, planId, publisherUserId)
    await client.query('COMMIT')
    if (!okPub) {
      throw new AppError(
        'Não foi possível publicar o plano.',
        409,
        ErrorCodes.INVALID_STATUS_TRANSITION,
      )
    }
    return { published: true }
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

export type BacklogItemApi = {
  conveyorId: string
  conveyorTitle: string
  clientName: string | null
  vehicleDescription: string | null
  licensePlate: string | null
  taskTitle: string
  sectorTitle: string
  activityNodeId: string
  activityTitle: string
  plannedMinutes: number | null
  realizedMinutes: number
  pendingMinutes: number
  assignedCollaborators: Array<{ id: string; fullName: string }>
  assignedTeams: Array<{ id: string; name: string }>
  isOutOfSequence: boolean
  previousOpenCount: number
  isOverdue: boolean
  hasAssignees: boolean
}

export async function serviceListOperationalPlanningBacklog(
  pool: pg.Pool,
  options: {
    q: string | null
    limit: number
    conveyorId: string | null
    collaboratorId: string | null
  },
): Promise<{ items: BacklogItemApi[]; meta: { limit: number } }> {
  const raw = await listOperationalPlanningBacklog(pool, {
    q: options.q?.trim() || null,
    limit: options.limit,
    conveyorId: options.conveyorId,
    collaboratorId: options.collaboratorId,
  })

  const conveyorIds = [...new Set(raw.map((r) => r.conveyor_id))]
  const nodesByConveyor = new Map<string, SequenceAnalysisNode[]>()
  for (const cid of conveyorIds) {
    const nodes = await listConveyorNodesForSequenceAnalysis(pool, cid)
    nodesByConveyor.set(cid, mapNodesForSequence(nodes))
  }

  const items: BacklogItemApi[] = raw.map((row) => {
    const seqNodes = nodesByConveyor.get(row.conveyor_id) ?? []
    const seq = analyzeConveyorActivitySequence(seqNodes, row.activity_node_id)
    const collaborators = Array.isArray(row.assigned_collaborators_json)
      ? (row.assigned_collaborators_json as Array<{ id: string; fullName: string }>)
      : []
    const teams = Array.isArray(row.assigned_teams_json)
      ? (row.assigned_teams_json as Array<{ id: string; name: string }>)
      : []
    return {
      conveyorId: row.conveyor_id,
      conveyorTitle: row.conveyor_title,
      clientName: row.client_name,
      vehicleDescription: row.vehicle_description,
      licensePlate: row.license_plate,
      taskTitle: row.task_title,
      sectorTitle: row.sector_title,
      activityNodeId: row.activity_node_id,
      activityTitle: row.activity_title,
      plannedMinutes: row.planned_minutes,
      realizedMinutes: row.realized_minutes,
      pendingMinutes: row.pending_minutes,
      assignedCollaborators: collaborators,
      assignedTeams: teams,
      isOutOfSequence: seq.isOutOfSequence,
      previousOpenCount: seq.previousOpenCount,
      isOverdue: isDeadlineOverdue(row.estimated_deadline),
      hasAssignees: collaborators.length > 0 || teams.length > 0,
    }
  })

  return { items, meta: { limit: options.limit } }
}

export type FactoryIntakeItemApi = {
  conveyorOperationalPlanId: string
  conveyorOperationalPlanItemId: string
  conveyorId: string
  conveyorName: string
  activityNodeId: string
  plannedDate: string | null
  plannedOrder: number
  plannedMinutes: number | null
  plannedCollaboratorId: string | null
  plannedCollaboratorName: string | null
  plannedTeamId: string | null
  plannedTeamName: string | null
  taskTitle: string
  sectorTitle: string
  activityTitle: string
  activityOperationalStatus: string | null
  realizedMinutes: number
  reviewRequired: boolean
  syncStatus: string | null
  factoryPlanningStatus: string | null
  operationalPlanStatus: string
  planItemStatus: string
  totalPlanItems: number
  linkedPlanItems: number
  pendingPlanItems: number
}

function factoryIntakeRowToApi(row: FactoryIntakeRawRow): FactoryIntakeItemApi {
  return {
    conveyorOperationalPlanId: row.conveyor_operational_plan_id,
    conveyorOperationalPlanItemId: row.conveyor_operational_plan_item_id,
    conveyorId: row.conveyor_id,
    conveyorName: row.conveyor_name,
    activityNodeId: row.activity_node_id,
    plannedDate: row.planned_date,
    plannedOrder: row.planned_order,
    plannedMinutes: row.planned_minutes,
    plannedCollaboratorId: row.planned_collaborator_id,
    plannedCollaboratorName: row.planned_collaborator_name,
    plannedTeamId: row.planned_team_id,
    plannedTeamName: row.planned_team_name,
    taskTitle: row.task_title,
    sectorTitle: row.sector_title,
    activityTitle: row.activity_title,
    activityOperationalStatus: row.activity_operational_status,
    realizedMinutes: row.realized_minutes,
    reviewRequired: row.review_required,
    syncStatus: row.sync_status,
    factoryPlanningStatus: row.factory_planning_status,
    operationalPlanStatus: row.operational_plan_status,
    planItemStatus: row.plan_item_status,
    totalPlanItems: row.total_plan_items,
    linkedPlanItems: row.linked_plan_items,
    pendingPlanItems: row.pending_plan_items,
  }
}

/** Lista itens do plano da esteira aguardando encaixe (MVP: todos; weekStart ignorado). */
export async function serviceListFactoryIntakeItems(
  pool: pg.Pool,
  weekStart?: string,
): Promise<{ items: FactoryIntakeItemApi[] }> {
  void weekStart
  const raw = await listFactoryIntakeItems(pool)
  return { items: raw.map(factoryIntakeRowToApi) }
}
