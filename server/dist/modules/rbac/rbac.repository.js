export async function listRoles(pool) {
    const r = await pool.query(`SELECT id, code, name FROM app_roles ORDER BY code ASC`);
    return r.rows;
}
export async function listPermissionsCatalog(pool) {
    const r = await pool.query(`SELECT id, code, name FROM app_permissions ORDER BY code ASC`);
    return r.rows;
}
export async function findRoleById(pool, roleId) {
    const r = await pool.query(`SELECT id, code, name FROM app_roles WHERE id = $1::uuid`, [roleId]);
    return r.rows[0] ?? null;
}
export async function getPermissionCodesForRole(pool, roleId) {
    const r = await pool.query(`
    SELECT p.code
    FROM app_role_permissions rp
    INNER JOIN app_permissions p ON p.id = rp.permission_id
    WHERE rp.role_id = $1::uuid
    ORDER BY p.code ASC
    `, [roleId]);
    return r.rows.map((x) => x.code);
}
export async function resolvePermissionIdsByCodes(client, codes) {
    if (codes.length === 0) {
        return new Map();
    }
    const r = await client.query(`SELECT id, code FROM app_permissions WHERE code = ANY($1::text[])`, [codes]);
    const map = new Map();
    for (const row of r.rows) {
        map.set(row.code, row.id);
    }
    return map;
}
export async function replaceRolePermissions(client, roleId, permissionIds) {
    await client.query(`DELETE FROM app_role_permissions WHERE role_id = $1::uuid`, [
        roleId,
    ]);
    if (permissionIds.length === 0)
        return;
    await client.query(`
    INSERT INTO app_role_permissions (role_id, permission_id)
    SELECT $1::uuid, unnest($2::uuid[])
    `, [roleId, permissionIds]);
}
//# sourceMappingURL=rbac.repository.js.map