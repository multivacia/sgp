import { requestJson } from '../../lib/api/client'
import type { SupportTicketDetail, SupportTicketListParams, SupportTicketListResponse } from './support-list.types'

const BASE = '/api/v1/support/tickets'

function buildListQuery(params: SupportTicketListParams): string {
  const sp = new URLSearchParams()
  if (params.q?.trim()) sp.set('q', params.q.trim())
  if (params.status) sp.set('status', params.status)
  if (params.category?.trim()) sp.set('category', params.category.trim())
  if (params.severity) sp.set('severity', params.severity)
  if (params.period && params.period !== 'all') sp.set('period', params.period)
  const qs = sp.toString()
  return qs ? `?${qs}` : ''
}

export async function listSupportTickets(params: SupportTicketListParams): Promise<SupportTicketListResponse> {
  return requestJson<SupportTicketListResponse>('GET', `${BASE}${buildListQuery(params)}`)
}

export async function getSupportTicket(id: string): Promise<SupportTicketDetail> {
  return requestJson<SupportTicketDetail>('GET', `${BASE}/${encodeURIComponent(id)}`)
}
