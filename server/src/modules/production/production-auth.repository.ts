import type pg from 'pg'
import type { ProductionAuthEventType } from './production.types.js'

export type ProductionCredentialRow = {
  collaborator_id: string
  pin_hash: string
  enabled: boolean
  failed_attempts: number
  locked_until: Date | null
  must_change_pin: boolean
}

export type ProductionCollaboratorRow = {
  id: string
  full_name: string
  avatar_url: string | null
  status: string
  is_active: boolean
}

export async function findProductionCredentialByCollaboratorId(
  pool: pg.Pool,
  collaboratorId: string,
): Promise<ProductionCredentialRow | null> {
  const r = await pool.query<ProductionCredentialRow>(
    `
    SELECT
      collaborator_id,
      pin_hash,
      enabled,
      failed_attempts,
      locked_until,
      must_change_pin
    FROM collaborator_production_credentials
    WHERE collaborator_id = $1::uuid
    `,
    [collaboratorId],
  )
  return r.rows[0] ?? null
}

export async function findCollaboratorForProductionAuth(
  pool: pg.Pool,
  collaboratorId: string,
): Promise<ProductionCollaboratorRow | null> {
  const r = await pool.query<ProductionCollaboratorRow>(
    `
    SELECT id, full_name, avatar_url, status, is_active
    FROM collaborators
    WHERE id = $1::uuid AND deleted_at IS NULL
    `,
    [collaboratorId],
  )
  return r.rows[0] ?? null
}

export function collaboratorActiveForProduction(
  row: Pick<ProductionCollaboratorRow, 'status' | 'is_active'> | null,
): boolean {
  if (!row) return false
  return row.is_active === true && row.status === 'ACTIVE'
}

export async function resetProductionCredentialOnSuccess(
  pool: pg.Pool,
  collaboratorId: string,
): Promise<void> {
  await pool.query(
    `
    UPDATE collaborator_production_credentials
    SET failed_attempts = 0,
        locked_until = NULL,
        updated_at = now()
    WHERE collaborator_id = $1::uuid
    `,
    [collaboratorId],
  )
}

export async function incrementProductionCredentialFailure(
  pool: pg.Pool,
  collaboratorId: string,
  maxAttempts: number,
  lockoutMinutes: number,
): Promise<{ lockedUntil: Date | null }> {
  const r = await pool.query<{ locked_until: Date | null }>(
    `
    UPDATE collaborator_production_credentials
    SET failed_attempts = failed_attempts + 1,
        locked_until = CASE
          WHEN failed_attempts + 1 >= $2::int THEN now() + ($3::int * interval '1 minute')
          ELSE locked_until
        END,
        updated_at = now()
    WHERE collaborator_id = $1::uuid
    RETURNING locked_until
    `,
    [collaboratorId, maxAttempts, lockoutMinutes],
  )
  return { lockedUntil: r.rows[0]?.locked_until ?? null }
}

export async function insertProductionAuthEvent(
  pool: pg.Pool,
  input: {
    collaboratorId: string | null
    eventType: ProductionAuthEventType
    ipAddress?: string | null
    userAgent?: string | null
    requestId?: string | null
    result?: string | null
    metadataJson?: Record<string, unknown>
  },
): Promise<void> {
  await pool.query(
    `
    INSERT INTO production_auth_events (
      collaborator_id,
      event_type,
      ip_address,
      user_agent,
      request_id,
      result,
      metadata_json
    ) VALUES ($1::uuid, $2, $3, $4, $5, $6, $7::jsonb)
    `,
    [
      input.collaboratorId,
      input.eventType,
      input.ipAddress ?? null,
      input.userAgent ?? null,
      input.requestId ?? null,
      input.result ?? null,
      JSON.stringify(input.metadataJson ?? {}),
    ],
  )
}

export async function upsertProductionCredentialForTest(
  pool: pg.Pool,
  input: {
    collaboratorId: string
    pinHash: string
    enabled?: boolean
    mustChangePin?: boolean
  },
): Promise<void> {
  await pool.query(
    `
    INSERT INTO collaborator_production_credentials (
      collaborator_id, pin_hash, enabled, must_change_pin, pin_changed_at
    ) VALUES ($1::uuid, $2, $3, $4, now())
    ON CONFLICT (collaborator_id) DO UPDATE SET
      pin_hash = EXCLUDED.pin_hash,
      enabled = EXCLUDED.enabled,
      must_change_pin = EXCLUDED.must_change_pin,
      failed_attempts = 0,
      locked_until = NULL,
      pin_changed_at = now(),
      updated_at = now()
    `,
    [
      input.collaboratorId,
      input.pinHash,
      input.enabled ?? true,
      input.mustChangePin ?? false,
    ],
  )
}

export async function updateProductionPinAfterChange(
  pool: pg.Pool,
  input: {
    collaboratorId: string
    pinHash: string
  },
): Promise<void> {
  await pool.query(
    `
    UPDATE collaborator_production_credentials
    SET pin_hash = $2,
        must_change_pin = false,
        pin_changed_at = now(),
        failed_attempts = 0,
        locked_until = NULL,
        updated_at = now()
    WHERE collaborator_id = $1::uuid
    `,
    [input.collaboratorId, input.pinHash],
  )
}
