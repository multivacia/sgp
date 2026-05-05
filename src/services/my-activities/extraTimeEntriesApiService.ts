import type {
  CreateExtraTimeEntryInput,
  ExtraTimeEntriesResult,
  ExtraTimeEntryDescriptionOption,
  ExtraTimeEntryItem,
} from '../../domain/my-activities/extraTimeEntries.types'
import { requestJsonEnvelope } from '../../lib/api/client'

const BASE = '/api/v1'

export async function listExtraTimeEntryDescriptions(): Promise<
  ExtraTimeEntryDescriptionOption[]
> {
  const { data } = await requestJsonEnvelope<ExtraTimeEntryDescriptionOption[]>(
    'GET',
    `${BASE}/me/extra-time-entry-descriptions`,
  )
  return Array.isArray(data) ? data : []
}

export async function listMyExtraTimeEntries(options?: {
  limit?: number
}): Promise<ExtraTimeEntriesResult> {
  const sp = new URLSearchParams()
  if (options?.limit != null) sp.set('limit', String(options.limit))
  const qs = sp.toString()
  const path = qs
    ? `${BASE}/me/extra-time-entries?${qs}`
    : `${BASE}/me/extra-time-entries`
  const { data, meta } = await requestJsonEnvelope<ExtraTimeEntryItem[]>('GET', path)
  return {
    items: Array.isArray(data) ? data : [],
    collaboratorId: (meta.collaboratorId as string | null | undefined) ?? null,
    unavailableReason: (meta.unavailableReason as string | null | undefined) ?? null,
  }
}

export async function createMyExtraTimeEntry(
  input: CreateExtraTimeEntryInput,
): Promise<ExtraTimeEntryItem> {
  const { data } = await requestJsonEnvelope<ExtraTimeEntryItem>(
    'POST',
    `${BASE}/me/extra-time-entries`,
    { body: input },
  )
  return data
}
