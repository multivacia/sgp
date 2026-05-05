import type {
  MyActivityItem,
  TimeEntryCandidateItem,
} from '../../domain/my-activities/my-activities.types'
import { requestJson, requestJsonEnvelope } from '../../lib/api/client'

const BASE = '/api/v1'

/**
 * Atividades em que o colaborador está alocado (sessão JWT obrigatória).
 */
export async function listMyActivities(): Promise<MyActivityItem[]> {
  return requestJson<MyActivityItem[]>('GET', `${BASE}/my-activities`)
}

export type TimeEntryCandidatesResult = {
  items: TimeEntryCandidateItem[]
  collaboratorId: string | null
  unavailableReason: string | null
}

/**
 * GET /api/v1/me/time-entry-candidates — atividades em aberto apontáveis neste recorte.
 */
export async function listTimeEntryCandidates(options?: {
  q?: string
  limit?: number
}): Promise<TimeEntryCandidatesResult> {
  const sp = new URLSearchParams()
  if (options?.q?.trim()) sp.set('q', options.q.trim())
  if (options?.limit != null) sp.set('limit', String(options.limit))
  const qs = sp.toString()
  const path = qs
    ? `${BASE}/me/time-entry-candidates?${qs}`
    : `${BASE}/me/time-entry-candidates`
  const { data, meta } = await requestJsonEnvelope<TimeEntryCandidateItem[]>(
    'GET',
    path,
  )
  return {
    items: data,
    collaboratorId: (meta.collaboratorId as string | null | undefined) ?? null,
    unavailableReason:
      (meta.unavailableReason as string | null | undefined) ?? null,
  }
}
