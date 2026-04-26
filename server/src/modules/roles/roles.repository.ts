import type pg from 'pg'

export type RoleRow = {
  id: string
  code: string
  name: string
}

export async function listRoles(pool: pg.Pool): Promise<RoleRow[]> {
  const r = await pool.query<RoleRow>(
    `SELECT id, code, name FROM app_roles WHERE is_active = true ORDER BY code ASC`,
  )
  return r.rows
}
