import type {
  CreateStepAbortReasonInput,
  StepAbortReason,
  StepAbortReasonStatusFilter,
  UpdateStepAbortReasonInput,
} from '../../domain/conveyors/stepAbortReasons'
import { fetchAdminEnvelope } from '../admin/adminUsersApiService'

const BASE = '/api/v1/admin/operational-settings/step-abort-reasons'

export async function listStepAbortReasons(input?: {
  q?: string
  status?: StepAbortReasonStatusFilter
}): Promise<StepAbortReason[]> {
  const qs = new URLSearchParams()
  if (input?.q?.trim()) qs.set('q', input.q.trim())
  qs.set('status', input?.status ?? 'all')
  const path = `${BASE}?${qs.toString()}`
  const { data } = await fetchAdminEnvelope<StepAbortReason[]>('GET', path)
  return Array.isArray(data) ? data : []
}

export async function createStepAbortReason(
  input: CreateStepAbortReasonInput,
): Promise<StepAbortReason> {
  const { data } = await fetchAdminEnvelope<StepAbortReason>('POST', BASE, {
    body: input,
  })
  return data
}

export async function updateStepAbortReason(
  code: string,
  input: UpdateStepAbortReasonInput,
): Promise<StepAbortReason> {
  const { data } = await fetchAdminEnvelope<StepAbortReason>(
    'PATCH',
    `${BASE}/${encodeURIComponent(code)}`,
    { body: input },
  )
  return data
}

export async function activateStepAbortReason(code: string): Promise<StepAbortReason> {
  const { data } = await fetchAdminEnvelope<StepAbortReason>(
    'PATCH',
    `${BASE}/${encodeURIComponent(code)}/activate`,
  )
  return data
}

export async function deactivateStepAbortReason(code: string): Promise<StepAbortReason> {
  const { data } = await fetchAdminEnvelope<StepAbortReason>(
    'PATCH',
    `${BASE}/${encodeURIComponent(code)}/deactivate`,
  )
  return data
}
