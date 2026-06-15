import type pg from 'pg'

export type ProductionCollaboratorListRow = {
  id: string
  full_name: string
  avatar_url: string | null
  sector_name: string | null
  has_credential: boolean
  cred_enabled: boolean | null
  cred_locked_until: Date | null
  must_change_pin: boolean | null
}

/**
 * Colaboradores ativos para seleção no Modo Fábrica (avatar).
 * DTO mínimo — sem email, telefone, PIN ou hash.
 */
export async function listProductionActiveCollaborators(
  pool: pg.Pool,
): Promise<ProductionCollaboratorListRow[]> {
  const r = await pool.query<ProductionCollaboratorListRow>(
    `
    SELECT
      c.id,
      c.full_name,
      c.avatar_url,
      s.name AS sector_name,
      (cred.collaborator_id IS NOT NULL) AS has_credential,
      cred.enabled AS cred_enabled,
      cred.locked_until AS cred_locked_until,
      cred.must_change_pin
    FROM collaborators c
    LEFT JOIN sectors s ON s.id = c.sector_id
    LEFT JOIN collaborator_production_credentials cred
      ON cred.collaborator_id = c.id
    WHERE c.deleted_at IS NULL
      AND c.is_active = true
      AND c.status = 'ACTIVE'
    ORDER BY c.full_name ASC
    `,
  )
  return r.rows
}

export type ActiveCollaboratorForSeedRow = {
  id: string
  full_name: string
}

/** Colaboradores ativos elegíveis para provisionamento de PIN inicial. */
export async function listActiveCollaboratorsForProductionPinSeed(
  pool: pg.Pool,
): Promise<ActiveCollaboratorForSeedRow[]> {
  const r = await pool.query<ActiveCollaboratorForSeedRow>(
    `
    SELECT c.id, c.full_name
    FROM collaborators c
    WHERE c.deleted_at IS NULL
      AND c.is_active = true
      AND c.status = 'ACTIVE'
    ORDER BY c.full_name ASC
    `,
  )
  return r.rows
}

export async function findProductionCredentialExists(
  pool: pg.Pool,
  collaboratorId: string,
): Promise<boolean> {
  const r = await pool.query<{ exists: boolean }>(
    `
    SELECT EXISTS (
      SELECT 1
      FROM collaborator_production_credentials
      WHERE collaborator_id = $1::uuid
    ) AS exists
    `,
    [collaboratorId],
  )
  return r.rows[0]?.exists === true
}

export async function insertProductionCredentialInitial(
  pool: pg.Pool,
  input: {
    collaboratorId: string
    pinHash: string
    mustChangePin: boolean
  },
): Promise<void> {
  await pool.query(
    `
    INSERT INTO collaborator_production_credentials (
      collaborator_id,
      pin_hash,
      enabled,
      must_change_pin,
      failed_attempts,
      locked_until
    ) VALUES ($1::uuid, $2, true, $3, 0, NULL)
    `,
    [input.collaboratorId, input.pinHash, input.mustChangePin],
  )
}
