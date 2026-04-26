export async function listRoles(pool) {
    const r = await pool.query(`SELECT id, code, name FROM app_roles WHERE is_active = true ORDER BY code ASC`);
    return r.rows;
}
//# sourceMappingURL=roles.repository.js.map