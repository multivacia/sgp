import type pg from 'pg'
import {
  countAdminAuditEvents,
  listAdminAuditEvents,
  type AdminAuditListFilters,
} from './admin-audit.repository.js'
import type { AdminAuditListItem } from './admin-audit.types.js'

export async function serviceListAdminAuditEvents(
  pool: pg.Pool,
  filters: AdminAuditListFilters,
): Promise<{ data: AdminAuditListItem[]; total: number }> {
  const [total, data] = await Promise.all([
    countAdminAuditEvents(pool, filters),
    listAdminAuditEvents(pool, filters),
  ])
  return { data, total }
}
