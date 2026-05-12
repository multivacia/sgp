import type {
  OperationalPlanningBacklogPayload,
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
