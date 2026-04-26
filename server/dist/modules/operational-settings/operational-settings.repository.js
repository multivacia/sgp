export async function listSectorsAdmin(pool) {
    const r = await pool.query(`SELECT id, name, is_active, created_at
     FROM sectors
     ORDER BY name ASC`);
    return r.rows;
}
export async function findSectorById(pool, id) {
    const r = await pool.query(`SELECT id, name, is_active, created_at FROM sectors WHERE id = $1::uuid`, [id]);
    return r.rows[0] ?? null;
}
export async function sectorNameExists(pool, name, excludeId) {
    const r = await pool.query(excludeId
        ? `SELECT COUNT(*)::text AS c FROM sectors
         WHERE lower(btrim(name)) = lower(btrim($1)) AND id <> $2::uuid`
        : `SELECT COUNT(*)::text AS c FROM sectors
         WHERE lower(btrim(name)) = lower(btrim($1))`, excludeId ? [name, excludeId] : [name]);
    return Number(r.rows[0]?.c ?? 0) > 0;
}
export async function insertSector(pool, name) {
    const r = await pool.query(`INSERT INTO sectors (name) VALUES ($1) RETURNING id, name, is_active, created_at`, [name]);
    const row = r.rows[0];
    if (!row)
        throw new Error('insert sector failed');
    return row;
}
export async function updateSector(pool, id, patch) {
    const sets = [];
    const vals = [];
    let n = 1;
    if (patch.name !== undefined) {
        sets.push(`name = $${n}`);
        vals.push(patch.name);
        n += 1;
    }
    if (patch.is_active !== undefined) {
        sets.push(`is_active = $${n}`);
        vals.push(patch.is_active);
        n += 1;
    }
    if (sets.length === 0) {
        return findSectorById(pool, id);
    }
    vals.push(id);
    const q = `
    UPDATE sectors SET ${sets.join(', ')}
    WHERE id = $${n}::uuid
    RETURNING id, name, is_active, created_at
  `;
    const r = await pool.query(q, vals);
    return r.rows[0] ?? null;
}
export async function deleteSector(pool, id) {
    const r = await pool.query(`DELETE FROM sectors WHERE id = $1::uuid`, [id]);
    return (r.rowCount ?? 0) > 0;
}
export async function listCollaboratorFunctions(pool) {
    const r = await pool.query(`SELECT id, code, name, is_active, is_collaborator_function, created_at
     FROM app_roles
     WHERE is_collaborator_function = true
     ORDER BY name ASC`);
    return r.rows;
}
export async function findCollaboratorFunctionById(pool, id) {
    const r = await pool.query(`SELECT id, code, name, is_active, is_collaborator_function, created_at
     FROM app_roles
     WHERE id = $1::uuid AND is_collaborator_function = true`, [id]);
    return r.rows[0] ?? null;
}
export async function roleCodeExists(pool, code, excludeId) {
    const r = await pool.query(excludeId
        ? `SELECT COUNT(*)::text AS c FROM app_roles
         WHERE code = $1 AND id <> $2::uuid`
        : `SELECT COUNT(*)::text AS c FROM app_roles WHERE code = $1`, excludeId ? [code, excludeId] : [code]);
    return Number(r.rows[0]?.c ?? 0) > 0;
}
export async function insertCollaboratorFunction(pool, code, name) {
    const r = await pool.query(`INSERT INTO app_roles (code, name, is_collaborator_function)
     VALUES ($1, $2, true)
     RETURNING id, code, name, is_active, is_collaborator_function, created_at`, [code, name]);
    const row = r.rows[0];
    if (!row)
        throw new Error('insert role failed');
    return row;
}
export async function updateCollaboratorFunction(pool, id, patch) {
    const sets = [];
    const vals = [];
    let n = 1;
    if (patch.name !== undefined) {
        sets.push(`name = $${n}`);
        vals.push(patch.name);
        n += 1;
    }
    if (patch.code !== undefined) {
        sets.push(`code = $${n}`);
        vals.push(patch.code);
        n += 1;
    }
    if (patch.is_active !== undefined) {
        sets.push(`is_active = $${n}`);
        vals.push(patch.is_active);
        n += 1;
    }
    if (sets.length === 0) {
        return findCollaboratorFunctionById(pool, id);
    }
    vals.push(id);
    const q = `
    UPDATE app_roles SET ${sets.join(', ')}
    WHERE id = $${n}::uuid AND is_collaborator_function = true
    RETURNING id, code, name, is_active, is_collaborator_function, created_at
  `;
    const r = await pool.query(q, vals);
    return r.rows[0] ?? null;
}
export async function countUsersWithRole(pool, roleId) {
    const r = await pool.query(`SELECT COUNT(*)::text AS c FROM app_users WHERE role_id = $1::uuid AND deleted_at IS NULL`, [roleId]);
    return Number(r.rows[0]?.c ?? 0);
}
export async function countCollaboratorsWithRole(pool, roleId) {
    const r = await pool.query(`SELECT COUNT(*)::text AS c FROM collaborators
     WHERE role_id = $1::uuid AND deleted_at IS NULL`, [roleId]);
    return Number(r.rows[0]?.c ?? 0);
}
//# sourceMappingURL=operational-settings.repository.js.map