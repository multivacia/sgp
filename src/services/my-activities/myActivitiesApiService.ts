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
  /** Cursor da próxima página ("Carregar mais"); `null` = fim da lista. */
  nextCursor: string | null
}

/** Tamanho máximo de página aceito pelo backend em `time-entry-candidates`. */
export const TIME_ENTRY_CANDIDATES_PAGE_SIZE = 50

/**
 * GET /api/v1/me/time-entry-candidates — atividades em aberto apontáveis neste recorte,
 * paginadas por cursor (`cursor` = `nextCursor` da página anterior).
 */
export async function listTimeEntryCandidates(options?: {
  /** Pesquisa livre; com `&`: `esteira/OS & nome da atividade` (interpretado no backend). */
  q?: string
  limit?: number
  includeUnassigned?: boolean
  cursor?: string | null
}): Promise<TimeEntryCandidatesResult> {
  const sp = new URLSearchParams()
  if (options?.q?.trim()) sp.set('q', options.q.trim())
  if (options?.limit != null) sp.set('limit', String(options.limit))
  if (options?.includeUnassigned) sp.set('includeUnassigned', 'true')
  if (options?.cursor) sp.set('cursor', options.cursor)
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
    nextCursor: (meta.nextCursor as string | null | undefined) ?? null,
  }
}
