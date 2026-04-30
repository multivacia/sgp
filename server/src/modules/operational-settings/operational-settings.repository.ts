import type pg from 'pg'

export type SectorAdminRow = {
  id: string
  name: string
  is_active: boolean
  created_at: Date
}

export type CollaboratorFunctionRow = {
  id: string
  code: string
  name: string
  is_active: boolean
  is_collaborator_function: boolean
  created_at: Date
}

export type OperationalCapacitySettingsRow = {
  id: number
  default_daily_minutes: number
  created_at: Date
  updated_at: Date
  updated_by: string | null
}

export type CollaboratorCapacityOverrideRow = {
  id: string
  collaborator_id: string
  daily_minutes: number
  effective_from: string | null
  effective_to: string | null
  is_active: boolean
  created_at: Date
  updated_at: Date
  created_by: string | null
  updated_by: string | null
  deleted_at: Date | null
}

export async function listSectorsAdmin(pool: pg.Pool): Promise<SectorAdminRow[]> {
  const r = await pool.query<SectorAdminRow>(
    `SELECT id, name, is_active, created_at
     FROM sectors
     ORDER BY name ASC`,
  )
  return r.rows
}

export async function findSectorById(
  pool: pg.Pool,
  id: string,
): Promise<SectorAdminRow | null> {
  const r = await pool.query<SectorAdminRow>(
    `SELECT id, name, is_active, created_at FROM sectors WHERE id = $1::uuid`,
    [id],
  )
  return r.rows[0] ?? null
}

export async function sectorNameExists(
  pool: pg.Pool,
  name: string,
  excludeId?: string,
): Promise<boolean> {
  const r = await pool.query<{ c: string }>(
    excludeId
      ? `SELECT COUNT(*)::text AS c FROM sectors
         WHERE lower(btrim(name)) = lower(btrim($1)) AND id <> $2::uuid`
      : `SELECT COUNT(*)::text AS c FROM sectors
         WHERE lower(btrim(name)) = lower(btrim($1))`,
    excludeId ? [name, excludeId] : [name],
  )
  return Number(r.rows[0]?.c ?? 0) > 0
}

export async function insertSector(
  pool: pg.Pool,
  name: string,
): Promise<SectorAdminRow> {
  const r = await pool.query<SectorAdminRow>(
    `INSERT INTO sectors (name) VALUES ($1) RETURNING id, name, is_active, created_at`,
    [name],
  )
  const row = r.rows[0]
  if (!row) throw new Error('insert sector failed')
  return row
}

export async function updateSector(
  pool: pg.Pool,
  id: string,
  patch: { name?: string; is_active?: boolean },
): Promise<SectorAdminRow | null> {
  const sets: string[] = []
  const vals: unknown[] = []
  let n = 1
  if (patch.name !== undefined) {
    sets.push(`name = $${n}`)
    vals.push(patch.name)
    n += 1
  }
  if (patch.is_active !== undefined) {
    sets.push(`is_active = $${n}`)
    vals.push(patch.is_active)
    n += 1
  }
  if (sets.length === 0) {
    return findSectorById(pool, id)
  }
  vals.push(id)
  const q = `
    UPDATE sectors SET ${sets.join(', ')}
    WHERE id = $${n}::uuid
    RETURNING id, name, is_active, created_at
  `
  const r = await pool.query<SectorAdminRow>(q, vals)
  return r.rows[0] ?? null
}

export async function deleteSector(pool: pg.Pool, id: string): Promise<boolean> {
  const r = await pool.query(`DELETE FROM sectors WHERE id = $1::uuid`, [id])
  return (r.rowCount ?? 0) > 0
}

export async function listCollaboratorFunctions(
  pool: pg.Pool,
): Promise<CollaboratorFunctionRow[]> {
  const r = await pool.query<CollaboratorFunctionRow>(
    `SELECT id, code, name, is_active, is_collaborator_function, created_at
     FROM app_roles
     WHERE is_collaborator_function = true
     ORDER BY name ASC`,
  )
  return r.rows
}

export async function findCollaboratorFunctionById(
  pool: pg.Pool,
  id: string,
): Promise<CollaboratorFunctionRow | null> {
  const r = await pool.query<CollaboratorFunctionRow>(
    `SELECT id, code, name, is_active, is_collaborator_function, created_at
     FROM app_roles
     WHERE id = $1::uuid AND is_collaborator_function = true`,
    [id],
  )
  return r.rows[0] ?? null
}

export async function roleCodeExists(
  pool: pg.Pool,
  code: string,
  excludeId?: string,
): Promise<boolean> {
  const r = await pool.query<{ c: string }>(
    excludeId
      ? `SELECT COUNT(*)::text AS c FROM app_roles
         WHERE code = $1 AND id <> $2::uuid`
      : `SELECT COUNT(*)::text AS c FROM app_roles WHERE code = $1`,
    excludeId ? [code, excludeId] : [code],
  )
  return Number(r.rows[0]?.c ?? 0) > 0
}

export async function insertCollaboratorFunction(
  pool: pg.Pool,
  code: string,
  name: string,
): Promise<CollaboratorFunctionRow> {
  const r = await pool.query<CollaboratorFunctionRow>(
    `INSERT INTO app_roles (code, name, is_collaborator_function)
     VALUES ($1, $2, true)
     RETURNING id, code, name, is_active, is_collaborator_function, created_at`,
    [code, name],
  )
  const row = r.rows[0]
  if (!row) throw new Error('insert role failed')
  return row
}

export async function updateCollaboratorFunction(
  pool: pg.Pool,
  id: string,
  patch: { name?: string; code?: string; is_active?: boolean },
): Promise<CollaboratorFunctionRow | null> {
  const sets: string[] = []
  const vals: unknown[] = []
  let n = 1
  if (patch.name !== undefined) {
    sets.push(`name = $${n}`)
    vals.push(patch.name)
    n += 1
  }
  if (patch.code !== undefined) {
    sets.push(`code = $${n}`)
    vals.push(patch.code)
    n += 1
  }
  if (patch.is_active !== undefined) {
    sets.push(`is_active = $${n}`)
    vals.push(patch.is_active)
    n += 1
  }
  if (sets.length === 0) {
    return findCollaboratorFunctionById(pool, id)
  }
  vals.push(id)
  const q = `
    UPDATE app_roles SET ${sets.join(', ')}
    WHERE id = $${n}::uuid AND is_collaborator_function = true
    RETURNING id, code, name, is_active, is_collaborator_function, created_at
  `
  const r = await pool.query<CollaboratorFunctionRow>(q, vals)
  return r.rows[0] ?? null
}

export async function countUsersWithRole(pool: pg.Pool, roleId: string): Promise<number> {
  const r = await pool.query<{ c: string }>(
    `SELECT COUNT(*)::text AS c FROM app_users WHERE role_id = $1::uuid AND deleted_at IS NULL`,
    [roleId],
  )
  return Number(r.rows[0]?.c ?? 0)
}

export async function countCollaboratorsWithRole(
  pool: pg.Pool,
  roleId: string,
): Promise<number> {
  const r = await pool.query<{ c: string }>(
    `SELECT COUNT(*)::text AS c FROM collaborators
     WHERE role_id = $1::uuid AND deleted_at IS NULL`,
    [roleId],
  )
  return Number(r.rows[0]?.c ?? 0)
}

export async function getOperationalCapacitySettings(
  pool: pg.Pool,
): Promise<OperationalCapacitySettingsRow | null> {
  const r = await pool.query<OperationalCapacitySettingsRow>(
    `SELECT id, default_daily_minutes, created_at, updated_at, updated_by
     FROM operational_capacity_settings
     WHERE id = 1`,
  )
  return r.rows[0] ?? null
}

export async function upsertOperationalCapacitySettings(
  pool: pg.Pool,
  input: { defaultDailyMinutes: number; updatedBy?: string | null },
): Promise<OperationalCapacitySettingsRow> {
  const r = await pool.query<OperationalCapacitySettingsRow>(
    `INSERT INTO operational_capacity_settings (
       id, default_daily_minutes, updated_by
     ) VALUES (
       1, $1::int, $2::uuid
     )
     ON CONFLICT (id) DO UPDATE
     SET default_daily_minutes = EXCLUDED.default_daily_minutes,
         updated_by = EXCLUDED.updated_by,
         updated_at = now()
     RETURNING id, default_daily_minutes, created_at, updated_at, updated_by`,
    [input.defaultDailyMinutes, input.updatedBy ?? null],
  )
  const row = r.rows[0]
  if (!row) throw new Error('upsert operational_capacity_settings failed')
  return row
}

export async function getActiveCollaboratorCapacityOverride(
  pool: pg.Pool,
  collaboratorId: string,
  date?: string,
): Promise<CollaboratorCapacityOverrideRow | null> {
  const refDate = date ?? new Date().toISOString().slice(0, 10)
  const r = await pool.query<CollaboratorCapacityOverrideRow>(
    `SELECT id, collaborator_id, daily_minutes, effective_from, effective_to, is_active,
            created_at, updated_at, created_by, updated_by, deleted_at
     FROM collaborator_capacity_overrides
     WHERE collaborator_id = $1::uuid
       AND deleted_at IS NULL
       AND is_active = true
       AND (effective_from IS NULL OR effective_from <= $2::date)
       AND (effective_to IS NULL OR effective_to >= $2::date)
     ORDER BY
       CASE WHEN effective_from IS NULL THEN 1 ELSE 0 END ASC,
       effective_from DESC NULLS LAST,
       updated_at DESC
     LIMIT 1`,
    [collaboratorId, refDate],
  )
  return r.rows[0] ?? null
}

export const getCollaboratorCapacityOverride = getActiveCollaboratorCapacityOverride

export async function listCollaboratorCapacityOverrides(
  pool: pg.Pool,
  filters: { collaboratorId?: string; includeDeleted?: boolean } = {},
): Promise<CollaboratorCapacityOverrideRow[]> {
  const where: string[] = []
  const vals: unknown[] = []
  let n = 1
  if (filters.collaboratorId) {
    where.push(`collaborator_id = $${n}::uuid`)
    vals.push(filters.collaboratorId)
    n += 1
  }
  if (!filters.includeDeleted) {
    where.push('deleted_at IS NULL')
  }
  const sql = `
    SELECT id, collaborator_id, daily_minutes, effective_from, effective_to, is_active,
           created_at, updated_at, created_by, updated_by, deleted_at
    FROM collaborator_capacity_overrides
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY updated_at DESC
  `
  const r = await pool.query<CollaboratorCapacityOverrideRow>(sql, vals)
  return r.rows
}

export async function upsertCollaboratorCapacityOverride(
  pool: pg.Pool,
  input: {
    collaboratorId: string
    dailyMinutes: number
    effectiveFrom?: string | null
    effectiveTo?: string | null
    isActive?: boolean
    actorUserId?: string | null
  },
): Promise<CollaboratorCapacityOverrideRow> {
  const r = await pool.query<CollaboratorCapacityOverrideRow>(
    `WITH current AS (
       SELECT id
       FROM collaborator_capacity_overrides
       WHERE collaborator_id = $1::uuid
         AND deleted_at IS NULL
       ORDER BY updated_at DESC
       LIMIT 1
     ),
     upserted AS (
       INSERT INTO collaborator_capacity_overrides (
         id, collaborator_id, daily_minutes, effective_from, effective_to,
         is_active, created_by, updated_by
       )
       SELECT gen_random_uuid(), $1::uuid, $2::int, $3::date, $4::date, $5::boolean, $6::uuid, $6::uuid
       WHERE NOT EXISTS (SELECT 1 FROM current)
       RETURNING *
     )
     UPDATE collaborator_capacity_overrides cco
     SET daily_minutes = $2::int,
         effective_from = $3::date,
         effective_to = $4::date,
         is_active = $5::boolean,
         updated_by = $6::uuid,
         updated_at = now()
     WHERE cco.id = COALESCE((SELECT id FROM current), (SELECT id FROM upserted))
     RETURNING cco.id, cco.collaborator_id, cco.daily_minutes, cco.effective_from, cco.effective_to,
               cco.is_active, cco.created_at, cco.updated_at, cco.created_by, cco.updated_by, cco.deleted_at`,
    [
      input.collaboratorId,
      input.dailyMinutes,
      input.effectiveFrom ?? null,
      input.effectiveTo ?? null,
      input.isActive ?? true,
      input.actorUserId ?? null,
    ],
  )
  const row = r.rows[0]
  if (!row) throw new Error('upsert collaborator_capacity_overrides failed')
  return row
}

export async function softDeleteCollaboratorCapacityOverride(
  pool: pg.Pool,
  id: string,
  actorUserId?: string | null,
): Promise<boolean> {
  const r = await pool.query(
    `UPDATE collaborator_capacity_overrides
     SET deleted_at = now(),
         updated_by = $2::uuid,
         updated_at = now()
     WHERE id = $1::uuid
       AND deleted_at IS NULL`,
    [id, actorUserId ?? null],
  )
  return (r.rowCount ?? 0) > 0
}

export async function resolveCollaboratorDailyCapacityMinutes(
  pool: pg.Pool,
  collaboratorId: string,
  date?: string,
): Promise<{
  defaultDailyMinutes: number | null
  overrideDailyMinutes: number | null
  source: 'override' | 'default' | 'fallback'
}> {
  const [settings, override] = await Promise.all([
    getOperationalCapacitySettings(pool),
    getActiveCollaboratorCapacityOverride(pool, collaboratorId, date),
  ])
  const defaultDailyMinutes = settings?.default_daily_minutes ?? null
  const overrideDailyMinutes = override?.daily_minutes ?? null
  if (overrideDailyMinutes != null) {
    return { defaultDailyMinutes, overrideDailyMinutes, source: 'override' }
  }
  if (defaultDailyMinutes != null) {
    return { defaultDailyMinutes, overrideDailyMinutes, source: 'default' }
  }
  return { defaultDailyMinutes: null, overrideDailyMinutes: null, source: 'fallback' }
}
