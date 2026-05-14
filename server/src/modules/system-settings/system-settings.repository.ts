import type pg from 'pg'

export type SystemSettingRow = {
  setting_key: string
  setting_value: string
  value_type: string
  description: string | null
  is_active: boolean
  updated_at: Date
}

export async function findActiveSystemSettingValue(
  pool: pg.Pool,
  settingKey: string,
): Promise<string | null> {
  const r = await pool.query<{ setting_value: string }>(
    `
    SELECT setting_value
    FROM system_settings
    WHERE setting_key = $1
      AND is_active = true
    LIMIT 1
    `,
    [settingKey],
  )
  return r.rows[0]?.setting_value ?? null
}

export async function findAllowlistedSystemSettings(
  pool: pg.Pool,
  keys: readonly string[],
): Promise<SystemSettingRow[]> {
  if (keys.length === 0) return []
  const r = await pool.query<SystemSettingRow>(
    `
    SELECT
      setting_key,
      setting_value,
      value_type,
      description,
      is_active,
      updated_at
    FROM system_settings
    WHERE setting_key = ANY($1::text[])
      AND is_active = true
    ORDER BY setting_key ASC
    `,
    [keys],
  )
  return r.rows
}

export async function findAllowlistedSystemSettingByKey(
  pool: pg.Pool,
  settingKey: string,
): Promise<SystemSettingRow | null> {
  const r = await pool.query<SystemSettingRow>(
    `
    SELECT
      setting_key,
      setting_value,
      value_type,
      description,
      is_active,
      updated_at
    FROM system_settings
    WHERE setting_key = $1
      AND is_active = true
    LIMIT 1
    `,
    [settingKey],
  )
  return r.rows[0] ?? null
}

export async function updateAllowlistedSystemSettingValue(
  pool: pg.Pool,
  settingKey: string,
  value: string,
): Promise<SystemSettingRow | null> {
  const r = await pool.query<SystemSettingRow>(
    `
    UPDATE system_settings
    SET
      setting_value = $2,
      updated_at = now()
    WHERE setting_key = $1
      AND is_active = true
    RETURNING
      setting_key,
      setting_value,
      value_type,
      description,
      is_active,
      updated_at
    `,
    [settingKey, value],
  )
  return r.rows[0] ?? null
}
