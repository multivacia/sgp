import type pg from 'pg'

/**
 * Códigos de permissão efetivos do utilizador (via papel), ordenados por code.
 * Utilizadores sem papel ou sem permissões → lista vazia.
 */
export async function findPermissionCodesForAppUser(
  pool: pg.Pool,
  userId: string,
): Promise<string[]> {
  const r = await pool.query<{ code: string }>(
    `
    SELECT p.code
    FROM app_users u
    INNER JOIN app_role_permissions rp ON rp.role_id = u.role_id
    INNER JOIN app_permissions p ON p.id = rp.permission_id
    WHERE u.id = $1::uuid
      AND u.deleted_at IS NULL
    ORDER BY p.code ASC
    `,
    [userId],
  )
  return r.rows.map((row) => row.code)
}

/** Verifica se o utilizador tem uma permissão efetiva (via papel). */
export async function appUserHasPermission(
  pool: pg.Pool,
  userId: string,
  permissionCode: string,
): Promise<boolean> {
  const r = await pool.query<{ ok: string }>(
    `
    SELECT 1::text AS ok
    FROM app_users u
    INNER JOIN app_role_permissions rp ON rp.role_id = u.role_id
    INNER JOIN app_permissions p ON p.id = rp.permission_id
    WHERE u.id = $1::uuid
      AND u.deleted_at IS NULL
      AND p.code = $2
    LIMIT 1
    `,
    [userId, permissionCode],
  )
  return Boolean(r.rows[0])
}
