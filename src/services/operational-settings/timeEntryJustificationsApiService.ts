import type {
  CreateTimeEntryJustificationInput,
  TimeEntryJustification,
  TimeEntryJustificationStatusFilter,
  UpdateTimeEntryJustificationInput,
} from '../../domain/operational-settings/timeEntryJustifications.types'
import { fetchAdminEnvelope } from '../admin/adminUsersApiService'

const BASE = '/api/v1/admin/operational-settings/time-entry-justifications'

export async function listTimeEntryJustifications(input?: {
  q?: string
  status?: TimeEntryJustificationStatusFilter
}): Promise<TimeEntryJustification[]> {
  const qs = new URLSearchParams()
  if (input?.q?.trim()) qs.set('q', input.q.trim())
  qs.set('status', input?.status ?? 'all')
  const path = `${BASE}?${qs.toString()}`
  const { data } = await fetchAdminEnvelope<TimeEntryJustification[]>('GET', path)
  return Array.isArray(data) ? data : []
}

export async function createTimeEntryJustification(
  input: CreateTimeEntryJustificationInput,
): Promise<TimeEntryJustification> {
  const { data } = await fetchAdminEnvelope<TimeEntryJustification>('POST', BASE, {
    body: input,
  })
  return data
}

export async function updateTimeEntryJustification(
  id: string,
  input: UpdateTimeEntryJustificationInput,
): Promise<TimeEntryJustification> {
  const { data } = await fetchAdminEnvelope<TimeEntryJustification>(
    'PATCH',
    `${BASE}/${encodeURIComponent(id)}`,
    { body: input },
  )
  return data
}

export async function activateTimeEntryJustification(
  id: string,
): Promise<TimeEntryJustification> {
  const { data } = await fetchAdminEnvelope<TimeEntryJustification>(
    'PATCH',
    `${BASE}/${encodeURIComponent(id)}/activate`,
  )
  return data
}

export async function deactivateTimeEntryJustification(
  id: string,
): Promise<TimeEntryJustification> {
  const { data } = await fetchAdminEnvelope<TimeEntryJustification>(
    'PATCH',
    `${BASE}/${encodeURIComponent(id)}/deactivate`,
  )
  return data
}
