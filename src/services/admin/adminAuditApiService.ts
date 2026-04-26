import type { AdminAuditRow } from '../../domain/admin/adminAudit.types'
import { fetchAdminEnvelope } from './adminUsersApiService'

export type AdminAuditListParams = {
  eventType?: string
  targetUserId?: string
  occurredFrom?: string
  occurredTo?: string
  limit?: number
  offset?: number
}

export async function listAdminAuditEvents(params: AdminAuditListParams): Promise<{
  rows: AdminAuditRow[]
  total: number
  limit: number
  offset: number
}> {
  const sp = new URLSearchParams()
  if (params.eventType?.trim()) sp.set('event_type', params.eventType.trim())
  if (params.targetUserId?.trim()) sp.set('target_user_id', params.targetUserId.trim())
  if (params.occurredFrom?.trim()) sp.set('occurred_from', params.occurredFrom.trim())
  if (params.occurredTo?.trim()) sp.set('occurred_to', params.occurredTo.trim())
  if (params.limit !== undefined) sp.set('limit', String(params.limit))
  if (params.offset !== undefined) sp.set('offset', String(params.offset))
  const q = sp.toString()
  const path = `/api/v1/admin/audit-events${q ? `?${q}` : ''}`
  const { data, meta } = await fetchAdminEnvelope<AdminAuditRow[]>('GET', path)
  return {
    rows: data,
    total: typeof meta.total === 'number' ? meta.total : data.length,
    limit: typeof meta.limit === 'number' ? meta.limit : params.limit ?? 100,
    offset: typeof meta.offset === 'number' ? meta.offset : params.offset ?? 0,
  }
}
