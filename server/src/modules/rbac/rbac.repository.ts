import type pg from 'pg'

export type PermissionCatalogRow = {
  id: string
  code: string
  name: string
}

export type RoleRow = {
  id: string
  code: string
  name: string
}

export async function listRoles(pool: pg.Pool): Promise<RoleRow[]> {
  const r = await pool.query<RoleRow>(
    `SELECT id, code, name FROM app_roles ORDER BY code ASC`,
  )
  return r.rows
}

export async function listPermissionsCatalog(
  pool: pg.Pool,
): Promise<PermissionCatalogRow[]> {
  const r = await pool.query<PermissionCatalogRow>(
    `SELECT id, code, name FROM app_permissions ORDER BY code ASC`,
  )
  return r.rows
}

export async function findRoleById(
  pool: pg.Pool,
  roleId: string,
): Promise<RoleRow | null> {
  const r = await pool.query<RoleRow>(
    `SELECT id, code, name FROM app_roles WHERE id = $1::uuid`,
    [roleId],
  )
  return r.rows[0] ?? null
}

export async function getPermissionCodesForRole(
  pool: pg.Pool,
  roleId: string,
): Promise<string[]> {
  const r = await pool.query<{ code: string }>(
    `
    SELECT p.code
    FROM app_role_permissions rp
    INNER JOIN app_permissions p ON p.id = rp.permission_id
    WHERE rp.role_id = $1::uuid
    ORDER BY p.code ASC
    `,
    [roleId],
  )
  return r.rows.map((x) => x.code)
}

export async function resolvePermissionIdsByCodes(
  client: pg.Pool | pg.PoolClient,
  codes: string[],
): Promise<Map<string, string>> {
  if (codes.length === 0) {
    return new Map()
  }
  const r = await client.query<{ id: string; code: string }>(
    `SELECT id, code FROM app_permissions WHERE code = ANY($1::text[])`,
    [codes],
  )
  const map = new Map<string, string>()
  for (const row of r.rows) {
    map.set(row.code, row.id)
  }
  return map
}

export async function replaceRolePermissions(
  client: pg.PoolClient,
  roleId: string,
  permissionIds: string[],
): Promise<void> {
  await client.query(`DELETE FROM app_role_permissions WHERE role_id = $1::uuid`, [
    roleId,
  ])
  if (permissionIds.length === 0) return
  await client.query(
    `
    INSERT INTO app_role_permissions (role_id, permission_id)
    SELECT $1::uuid, unnest($2::uuid[])
    `,
    [roleId, permissionIds],
  )
}
