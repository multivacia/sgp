import type pg from 'pg'
import { AppError } from '../../shared/errors/AppError.js'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'
import { analyzeConveyorActivitySequence } from '../conveyors/conveyorActivitySequence.logic.js'
import type { SequenceAnalysisNode } from '../conveyors/conveyorActivitySequence.logic.js'
import { listConveyorNodesForSequenceAnalysis } from '../conveyors/conveyors.repository.js'
import { serviceResolveCollaboratorDailyCapacity } from '../operational-settings/operational-settings.service.js'
import type { SaveOperationalWeekPlanBody } from './operational-planning.schemas.js'
import {
  deleteItemsForWorkPlan,
  findOperationalWorkPlanById,
  findOperationalWorkPlanByWeekStart,
  insertOperationalWorkPlan,
  insertWorkPlanItems,
  listEnrichedItemsForWorkPlan,
  listOperationalPlanningBacklog,
  loadStepForPlanningValidation,
  publishOperationalWorkPlan,
  touchOperationalWorkPlanUpdatedAt,
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
}

function enrichedItemToApi(row: PlanItemEnrichedRow) {
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
  }
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
  if (!planRow) {
    return {
      hasPlan: false,
      week: { weekStartDate, weekEndDate, weekdayDates },
      plan: null,
      summary: { plannedMinutes: 0, plannedItems: 0, collaboratorsCount: 0 },
      capacityByCollaboratorDay: [],
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
      items: items.map(enrichedItemToApi),
      createdAt: planRow.created_at,
      updatedAt: planRow.updated_at,
    },
    summary: {
      plannedMinutes,
      plannedItems: items.length,
      collaboratorsCount: collabIds.size,
    },
    capacityByCollaboratorDay,
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

async function validatePlanItems(pool: pg.Pool, body: SaveOperationalWeekPlanBody): Promise<void> {
  if (!body.items.length) return

  const seenActivity = new Set<string>()
  for (const it of body.items) {
    if (seenActivity.has(it.activityNodeId)) {
      throw new AppError(
        'Cada Atividade só pode aparecer uma vez no plano.',
        400,
        ErrorCodes.VALIDATION_ERROR,
      )
    }
    seenActivity.add(it.activityNodeId)

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
  }
}

export async function serviceSaveOperationalWeekPlan(
  pool: pg.Pool,
  actorUserId: string,
  body: SaveOperationalWeekPlanBody,
): Promise<OperationalPlanningWeekResponse> {
  validateWeekShape(body.weekStartDate, body.weekEndDate)
  await validatePlanItems(pool, body)

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    let planId = (await findOperationalWorkPlanByWeekStart(client, body.weekStartDate))?.id
    if (!planId) {
      planId = await insertOperationalWorkPlan(client, {
        weekStartDate: body.weekStartDate,
        weekEndDate: body.weekEndDate,
        createdByUserId: actorUserId,
        status: 'DRAFT',
      })
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
    }

    await deleteItemsForWorkPlan(client, planId)
    await insertWorkPlanItems(
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
      })),
    )
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
  await validatePlanItems(pool, body)

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await deleteItemsForWorkPlan(client, planId)
    await insertWorkPlanItems(
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
      })),
    )
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
