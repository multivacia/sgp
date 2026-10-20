import type pg from 'pg'
import { buildSanitizedMetadata } from '../admin-audit/admin-audit.metadata.js'

/**
 * Registra o restore em `admin_audit_events` **depois** do restore (a tabela foi substituída).
 * O autor pode não existir na base restaurada: nesse caso `actor_user_id` fica nulo e o e-mail
 * fica na metadata.
 */
export async function insertDatabaseRestoredAuditEvent(
  pool: pg.Pool,
  input: {
    actorUserId: string
    resultStatus: 'success' | 'failure'
    metadata: Record<string, unknown>
  },
): Promise<void> {
  const meta = buildSanitizedMetadata('database_restored', input.metadata)
  await pool.query(
    `
    INSERT INTO admin_audit_events (event_type, actor_user_id, result_status, metadata_json)
    VALUES (
      'database_restored',
      (SELECT id FROM app_users WHERE id = $1::uuid),
      $2,
      $3::jsonb
    )
    `,
    [input.actorUserId, input.resultStatus, meta ? JSON.stringify(meta) : null],
  )
}
