import type {
  CreateExtraTimeEntryDescriptionInput,
  ExtraTimeEntryDescription,
  ExtraTimeEntryDescriptionStatusFilter,
  UpdateExtraTimeEntryDescriptionInput,
} from '../../domain/operational-settings/extraTimeEntryDescriptions.types'
import { requestJson } from '../../lib/api/client'
import { fetchAdminEnvelope } from '../admin/adminUsersApiService'

const BASE = '/api/v1/operational-settings/extra-time-entry-descriptions'

export async function listExtraTimeEntryDescriptions(input?: {
  q?: string
  status?: ExtraTimeEntryDescriptionStatusFilter
}): Promise<ExtraTimeEntryDescription[]> {
  const qs = new URLSearchParams()
  if (input?.q?.trim()) qs.set('q', input.q.trim())
  qs.set('status', input?.status ?? 'active')
  const path = `${BASE}?${qs.toString()}`
  const { data } = await fetchAdminEnvelope<ExtraTimeEntryDescription[]>('GET', path)
  return Array.isArray(data) ? data : []
}

export async function createExtraTimeEntryDescription(
  input: CreateExtraTimeEntryDescriptionInput,
): Promise<ExtraTimeEntryDescription> {
  const { data } = await fetchAdminEnvelope<ExtraTimeEntryDescription>('POST', BASE, {
    body: input,
  })
  return data
}

export async function updateExtraTimeEntryDescription(
  id: string,
  input: UpdateExtraTimeEntryDescriptionInput,
): Promise<ExtraTimeEntryDescription> {
  const { data } = await fetchAdminEnvelope<ExtraTimeEntryDescription>(
    'PUT',
    `${BASE}/${encodeURIComponent(id)}`,
    { body: input },
  )
  return data
}

export async function deleteExtraTimeEntryDescription(id: string): Promise<void> {
  await requestJson<undefined>('DELETE', `${BASE}/${encodeURIComponent(id)}`)
}
