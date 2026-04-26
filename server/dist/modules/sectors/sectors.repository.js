export async function listSectors(pool) {
    const r = await pool.query(`SELECT id, name FROM sectors WHERE is_active = true ORDER BY name ASC`);
    return r.rows;
}
//# sourceMappingURL=sectors.repository.js.map