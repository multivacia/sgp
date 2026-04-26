import { buildSanitizedMetadata } from './admin-audit.metadata.js';
import { ADMIN_AUDIT_EVENT_TYPES } from './admin-audit.types.js';
export async function insertAdminAuditEvent(db, input) {
    const meta = buildSanitizedMetadata(input.eventType, input.metadata ?? null);
    await db.query(`
    INSERT INTO admin_audit_events (
      event_type,
      actor_user_id,
      target_user_id,
      target_collaborator_id,
      result_status,
      metadata_json
    )
    VALUES ($1, $2::uuid, $3::uuid, $4::uuid, 'success', $5::jsonb)
    `, [
        input.eventType,
        input.actorUserId,
        input.targetUserId,
        input.targetCollaboratorId,
        meta ? JSON.stringify(meta) : null,
    ]);
}
function isEventType(s) {
    return ADMIN_AUDIT_EVENT_TYPES.includes(s);
}
function rowToItem(row) {
    const et = row.event_type;
    if (!isEventType(et)) {
        throw new Error(`event_type desconhecido na trilha: ${et}`);
    }
    const meta = row.metadata_json;
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
        metadata: meta && typeof meta === 'object' && !Array.isArray(meta)
            ? meta
            : null,
    };
}
export async function countAdminAuditEvents(pool, filters) {
    const { sql, values } = buildAuditWhere(filters);
    const r = await pool.query(`
    SELECT COUNT(*)::text AS c
    FROM admin_audit_events e
    WHERE ${sql}
    `, values);
    return Number(r.rows[0]?.c ?? 0);
}
function buildAuditWhere(filters) {
    const parts = ['1=1'];
    const values = [];
    let n = 1;
    if (filters.eventType) {
        parts.push(`e.event_type = $${n}`);
        values.push(filters.eventType);
        n += 1;
    }
    if (filters.targetUserId) {
        parts.push(`e.target_user_id = $${n}::uuid`);
        values.push(filters.targetUserId);
        n += 1;
    }
    if (filters.occurredFrom) {
        parts.push(`e.occurred_at >= $${n}`);
        values.push(filters.occurredFrom);
        n += 1;
    }
    if (filters.occurredTo) {
        parts.push(`e.occurred_at <= $${n}`);
        values.push(filters.occurredTo);
        n += 1;
    }
    return { sql: parts.join(' AND '), values };
}
export async function listAdminAuditEvents(pool, filters) {
    const { sql, values } = buildAuditWhere(filters);
    const limit = filters.limit;
    const offset = filters.offset;
    const r = await pool.query(`
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
    `, [...values, limit, offset]);
    return r.rows.map(rowToItem);
}
//# sourceMappingURL=admin-audit.repository.js.map