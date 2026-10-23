import { requestJson } from '../../lib/api/client'

const BASE = '/api/v1/extra-time-entries'

export type EditExtraTimeEntryInput = {
  expectedUpdatedAt: string
  reason: string
  descriptionId: string
  entryDate: string
  minutes: number
  notes: string | null
}

export type DeleteExtraTimeEntryInput = {
  expectedUpdatedAt: string
  reason: string
}

export function editExtraTimeEntry(id: string, input: EditExtraTimeEntryInput) {
  return requestJson<{ id: string; updatedAt: string }>(
    'PATCH',
    `${BASE}/${encodeURIComponent(id)}`,
    { body: input },
  )
}

export function deleteExtraTimeEntry(id: string, input: DeleteExtraTimeEntryInput) {
  return requestJson<{ deleted: true; id: string }>(
    'DELETE',
    `${BASE}/${encodeURIComponent(id)}`,
    { body: input },
  )
}
