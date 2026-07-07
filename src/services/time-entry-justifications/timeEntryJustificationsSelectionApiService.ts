import type { TimeEntryJustificationOption } from '../../domain/operational-settings/timeEntryJustifications.types'
import { requestJson } from '../../lib/api/client'
import { productionRequestJson } from '../../lib/production/productionApiClient'

export async function listMyTimeEntryJustifications(): Promise<TimeEntryJustificationOption[]> {
  const data = await requestJson<TimeEntryJustificationOption[]>(
    'GET',
    '/api/v1/me/time-entry-justifications',
  )
  return Array.isArray(data) ? data : []
}

export async function listProductionTimeEntryJustifications(): Promise<
  TimeEntryJustificationOption[]
> {
  const data = await productionRequestJson<TimeEntryJustificationOption[]>(
    'GET',
    '/api/v1/production/time-entry-justifications',
  )
  return Array.isArray(data) ? data : []
}
