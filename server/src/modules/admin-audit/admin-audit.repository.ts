import type pg from 'pg'
import type { DbExecutor } from '../../shared/db/dbExecutor.js'
import { buildSanitizedMetadata } from './admin-audit.metadata.js'
import type { AdminAuditEventType, AdminAuditListItem } from './admin-audit.types.js'
import { ADMIN_AUDIT_EVENT_TYPES } from './admin-audit.types.js'

export type InsertAdminAuditInput = {
  eventType: AdminAuditEventType
  actorUserId: string
  targetUserId: string | null
  targetCollaboratorId: string | null
  metadata: Record<string, unknown> | null | undefined
}

export async function insertAdminAuditEvent(
  db: DbExecutor,
  input: InsertAdminAuditInput,
): Promise<void> {
  const meta = buildSanitizedMetadata(input.eventType, input.metadata ?? null)
  await db.query(
    `
    INSERT INTO admin_audit_events (
      event_type,
      actor_user_id,
      target_user_id,
      target_collaborator_id,
      result_status,
      metadata_json
    )
    VALUES ($1, $2::uuid, $3::uuid, $4::uuid, 'success', $5::jsonb)
    `,
    [
      input.eventType,
      input.actorUserId,
      input.targetUserId,
      input.targetCollaboratorId,
      meta ? JSON.stringify(meta) : null,
    ],
  )
}

export type AdminAuditListFilters = {
  eventType?: AdminAuditEventType
  targetUserId?: string
  occurredFrom?: Date
  occurredTo?: Date
  limit: number
  offset: number
}

type ListRow = {
  id: string
  event_type: string
  occurred_at: Date
  result_status: string
  actor_user_id: string | null
  actor_email: string | null
  target_user_id: string | null
  target_user_email: string | null
  target_collaborator_id: string | null
  metadata_json: unknown
}

function isEventType(s: string): s is AdminAuditEventType {
  return (ADMIN_AUDIT_EVENT_TYPES as readonly string[]).includes(s)
}

function rowToItem(row: ListRow): AdminAuditListItem {
  const et = row.event_type
  if (!isEventType(et)) {
    throw new Error(`event_type desconhecido na trilha: ${et}`)
  }
  const meta = row.metadata_json
  return {
    id: row.id,
    eventType: et,
    occurredAt: row.occurred_at.toISOString(),
    resultStatus: row.result_status,
    actorUserId: row.actor_user_id,
    actorEmail: row.actor_email,
    targetUserId: row.target_user_id,
    targetUserEmail: row.target_user_email,
    targetCollaboratorId: row.target_collaborator_id,
    metadata:
      meta && typeof meta === 'object' && !Array.isArray(meta)
        ? (meta as Record<string, unknown>)
        : null,
  }
}

export async function countAdminAuditEvents(
  pool: pg.Pool,
  filters: AdminAuditListFilters,
): Promise<number> {
  const { sql, values } = buildAuditWhere(filters)
  const r = await pool.query<{ c: string }>(
    `
    SELECT COUNT(*)::text AS c
    FROM admin_audit_events e
    WHERE ${sql}
    `,
    values,
  )
  return Number(r.rows[0]?.c ?? 0)
}

function buildAuditWhere(
  filters: AdminAuditListFilters,
): { sql: string; values: unknown[] } {
  const parts: string[] = ['1=1']
  const values: unknown[] = []
  let n = 1

  if (filters.eventType) {
    parts.push(`e.event_type = $${n}`)
    values.push(filters.eventType)
    n += 1
  }
  if (filters.targetUserId) {
    parts.push(`e.target_user_id = $${n}::uuid`)
    values.push(filters.targetUserId)
    n += 1
  }
  if (filters.occurredFrom) {
    parts.push(`e.occurred_at >= $${n}`)
    values.push(filters.occurredFrom)
    n += 1
  }
  if (filters.occurredTo) {
    parts.push(`e.occurred_at <= $${n}`)
    values.push(filters.occurredTo)
    n += 1
  }

  return { sql: parts.join(' AND '), values }
}

export async function listAdminAuditEvents(
  pool: pg.Pool,
  filters: AdminAuditListFilters,
): Promise<AdminAuditListItem[]> {
  const { sql, values } = buildAuditWhere(filters)
  const limit = filters.limit
  const offset = filters.offset
  const r = await pool.query<ListRow>(
    `
    SELECT
      e.id::text,
      e.event_type,
      e.occurred_at,
      e.result_status,
      e.actor_user_id::text,
      a.email AS actor_email,
      e.target_user_id::text,
      tu.email AS target_user_email,
      e.target_collaborator_id::text,
      e.metadata_json
    FROM admin_audit_events e
    LEFT JOIN app_users a ON a.id = e.actor_user_id
    LEFT JOIN app_users tu ON tu.id = e.target_user_id
    WHERE ${sql}
    ORDER BY e.occurred_at DESC
    LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `,
    [...values, limit, offset],
  )
  return r.rows.map(rowToItem)
}
