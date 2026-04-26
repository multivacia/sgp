import type { MyActivityItem } from '../../domain/my-activities/my-activities.types'
import { requestJson } from '../../lib/api/client'

const BASE = '/api/v1'

/**
 * Atividades em que o colaborador está alocado (sessão JWT obrigatória).
 */
export async function listMyActivities(): Promise<MyActivityItem[]> {
  return requestJson<MyActivityItem[]>('GET', `${BASE}/my-activities`)
}
