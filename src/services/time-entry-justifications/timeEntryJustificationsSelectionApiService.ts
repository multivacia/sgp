import type { TimeEntryJustificationOption } from '../../domain/operational-settings/timeEntryJustifications.types'
import { requestJson } from '../../lib/api/client'
import { productionRequestJson } from '../../lib/production/productionApiClient'

type Envelope<T> = { data: T; meta?: unknown }

export async function listMyTimeEntryJustifications(): Promise<TimeEntryJustificationOption[]> {
  const res = await requestJson<Envelope<TimeEntryJustificationOption[]>>(
    'GET',
    '/api/v1/me/time-entry-justifications',
  )
  return Array.isArray(res.data) ? res.data : []
}

export async function listProductionTimeEntryJustifications(): Promise<
  TimeEntryJustificationOption[]
> {
  const res = await productionRequestJson<Envelope<TimeEntryJustificationOption[]>>(
    'GET',
    '/api/v1/production/time-entry-justifications',
  )
  return Array.isArray(res.data) ? res.data : []
}
