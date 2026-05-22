import type {
  OperationalPlanningBacklogPayload,
  OperationalPlanningFactoryIntakePayload,
  OperationalPlanningWeekActivityPayload,
  OperationalPlanningWeekPayload,
  SaveOperationalWeekPlanInput,
} from '../../domain/operational-planning/operational-planning.types'
import { requestJson } from '../../lib/api/client'

const BASE = '/api/v1'

export async function getOperationalPlanningWeek(
  weekStartDate: string,
): Promise<OperationalPlanningWeekPayload> {
  const qs = new URLSearchParams()
  qs.set('weekStart', weekStartDate)
  return requestJson<OperationalPlanningWeekPayload>(
    'GET',
    `${BASE}/operational-planning/week?${qs.toString()}`,
  )
}

export async function saveOperationalPlanningWeek(
  body: SaveOperationalWeekPlanInput,
): Promise<OperationalPlanningWeekPayload> {
  return requestJson<OperationalPlanningWeekPayload>('POST', `${BASE}/operational-planning/week`, {
    body,
  })
}

export async function patchOperationalPlanningWeek(
  planId: string,
  body: SaveOperationalWeekPlanInput,
): Promise<OperationalPlanningWeekPayload> {
  return requestJson<OperationalPlanningWeekPayload>(
    'PATCH',
    `${BASE}/operational-planning/week/${encodeURIComponent(planId)}`,
    { body },
  )
}

export async function publishOperationalPlanningWeek(
  planId: string,
): Promise<{ published: boolean }> {
  return requestJson<{ published: boolean }>(
    'POST',
    `${BASE}/operational-planning/week/${encodeURIComponent(planId)}/publish`,
    {},
  )
}

export async function listOperationalPlanningBacklog(params: {
  q?: string
  limit?: number
  conveyorId?: string
  collaboratorId?: string
}): Promise<OperationalPlanningBacklogPayload> {
  const sp = new URLSearchParams()
  if (params.q?.trim()) sp.set('q', params.q.trim())
  if (params.limit != null) sp.set('limit', String(params.limit))
  if (params.conveyorId) sp.set('conveyorId', params.conveyorId)
  if (params.collaboratorId) sp.set('collaboratorId', params.collaboratorId)
  const s = sp.toString()
  return requestJson<OperationalPlanningBacklogPayload>(
    'GET',
    `${BASE}/operational-planning/backlog${s ? `?${s}` : ''}`,
  )
}

/** Itens do plano da esteira aguardando encaixe na fábrica (MVP: lista completa). */
export async function applyConveyorPlanValuesToWeekItem(
  workPlanItemId: string,
  body?: { fields?: Array<'plannedDate' | 'plannedMinutes' | 'assignedCollaboratorId' | 'assignedTeamId'> },
): Promise<OperationalPlanningWeekPayload> {
  return requestJson<OperationalPlanningWeekPayload>(
    'POST',
    `${BASE}/operational-planning/week-items/${encodeURIComponent(workPlanItemId)}/apply-conveyor-plan-values`,
    { body: body ?? {} },
  )
}

export async function getOperationalPlanningWeekActivity(
  weekStartDate: string,
  limit = 100,
): Promise<OperationalPlanningWeekActivityPayload> {
  const qs = new URLSearchParams()
  qs.set('weekStart', weekStartDate)
  qs.set('limit', String(limit))
  return requestJson<OperationalPlanningWeekActivityPayload>(
    'GET',
    `${BASE}/operational-planning/week-activity?${qs.toString()}`,
  )
}

export async function getFactoryIntakeItems(
  weekStart?: string,
): Promise<OperationalPlanningFactoryIntakePayload> {
  const sp = new URLSearchParams()
  if (weekStart) sp.set('weekStart', weekStart)
  const s = sp.toString()
  return requestJson<OperationalPlanningFactoryIntakePayload>(
    'GET',
    `${BASE}/operational-planning/factory-intake${s ? `?${s}` : ''}`,
  )
}
