export function buildTeamListWhere(q) {
    const parts = [`t.deleted_at IS NULL`];
    const values = [];
    let n = 1;
    if (q.isActiveFilter === 'true') {
        parts.push(`t.is_active = true`);
    }
    else if (q.isActiveFilter === 'false') {
        parts.push(`t.is_active = false`);
    }
    const search = q.search?.trim();
    if (search) {
        parts.push(`t.name ILIKE $${n}`);
        values.push(`%${search}%`);
        n += 1;
    }
    const where = parts.length ? `WHERE ${parts.join(' AND ')}` : '';
    return { sql: where, values };
}
export async function countTeams(pool, q) {
    const { sql, values } = buildTeamListWhere(q);
    const r = await pool.query(`SELECT COUNT(*)::text AS c FROM teams t ${sql}`, values);
    return Number(r.rows[0]?.c ?? 0);
}
export async function listTeams(pool, q) {
    const { sql, values } = buildTeamListWhere(q);
    const limit = q.limit;
    const offset = q.offset;
    const limIdx = values.length + 1;
    const offIdx = values.length + 2;
    const r = await pool.query(`
    SELECT
      t.id,
      t.name,
      t.description,
      t.is_active,
      t.created_at,
      t.updated_at,
      (
        SELECT COUNT(*)::text
        FROM team_members tm
        WHERE tm.team_id = t.id AND tm.is_active = true
      ) AS active_member_count
    FROM teams t
    ${sql}
    ORDER BY t.name ASC
    LIMIT $${limIdx}::int OFFSET $${offIdx}::int
    `, [...values, limit, offset]);
    return r.rows;
}
export async function findTeamById(pool, id) {
    const r = await pool.query(`SELECT id, name, description, is_active, deleted_at, created_at, updated_at
     FROM teams
     WHERE id = $1::uuid AND deleted_at IS NULL`, [id]);
    return r.rows[0] ?? null;
}
export async function insertTeam(pool, input) {
    const r = await pool.query(`
    INSERT INTO teams (name, description, is_active, deleted_at)
    VALUES ($1, $2, $3, NULL)
    RETURNING id, name, description, is_active, deleted_at, created_at, updated_at
    `, [input.name, input.description, input.is_active]);
    return r.rows[0];
}
export async function updateTeam(pool, id, patch) {
    const sets = [];
    const values = [];
    let n = 1;
    if (patch.name !== undefined) {
        sets.push(`name = $${n}`);
        values.push(patch.name);
        n += 1;
    }
    if (patch.description !== undefined) {
        sets.push(`description = $${n}`);
        values.push(patch.description);
        n += 1;
    }
    if (patch.is_active !== undefined) {
        sets.push(`is_active = $${n}`);
        values.push(patch.is_active);
        n += 1;
    }
    if (sets.length === 0) {
        return findTeamById(pool, id);
    }
    sets.push(`updated_at = now()`);
    values.push(id);
    const r = await pool.query(`
    UPDATE teams
    SET ${sets.join(', ')}
    WHERE id = $${n}::uuid AND deleted_at IS NULL
    RETURNING id, name, description, is_active, deleted_at, created_at, updated_at
    `, values);
    return r.rows[0] ?? null;
}
export async function softDeleteTeam(pool, id) {
    const r = await pool.query(`
    UPDATE teams
    SET deleted_at = now(), updated_at = now()
    WHERE id = $1::uuid AND deleted_at IS NULL
    RETURNING id, name, description, is_active, deleted_at, created_at, updated_at
    `, [id]);
    return r.rows[0] ?? null;
}
export async function listActiveMembersForTeam(pool, teamId) {
    const r = await pool.query(`
    SELECT
      tm.id,
      tm.team_id,
      tm.collaborator_id,
      tm.role,
      tm.is_primary,
      tm.is_active,
      tm.created_at,
      tm.updated_at,
      c.full_name AS collaborator_full_name,
      c.email AS collaborator_email,
      c.status AS collaborator_status,
      c.is_active AS collaborator_is_active,
      c.deleted_at AS collaborator_deleted_at
    FROM team_members tm
    INNER JOIN collaborators c ON c.id = tm.collaborator_id
    WHERE tm.team_id = $1::uuid AND tm.is_active = true
    ORDER BY tm.is_primary DESC, c.full_name ASC
    `, [teamId]);
    return r.rows;
}
export async function findMemberById(pool, teamId, memberId) {
    const r = await pool.query(`
    SELECT
      tm.id,
      tm.team_id,
      tm.collaborator_id,
      tm.role,
      tm.is_primary,
      tm.is_active,
      tm.created_at,
      tm.updated_at,
      c.full_name AS collaborator_full_name,
      c.email AS collaborator_email,
      c.status AS collaborator_status,
      c.is_active AS collaborator_is_active,
      c.deleted_at AS collaborator_deleted_at
    FROM team_members tm
    INNER JOIN collaborators c ON c.id = tm.collaborator_id
    WHERE tm.team_id = $1::uuid AND tm.id = $2::uuid
    `, [teamId, memberId]);
    return r.rows[0] ?? null;
}
export async function findCollaboratorEligibility(pool, collaboratorId) {
    const r = await pool.query(`SELECT id, status, is_active, deleted_at FROM collaborators WHERE id = $1::uuid`, [collaboratorId]);
    return r.rows[0] ?? null;
}
export async function clearPrimaryForTeam(client, teamId, exceptMemberId) {
    if (exceptMemberId) {
        await client.query(`
      UPDATE team_members
      SET is_primary = false, updated_at = now()
      WHERE team_id = $1::uuid AND is_active = true AND id <> $2::uuid
      `, [teamId, exceptMemberId]);
    }
    else {
        await client.query(`
      UPDATE team_members
      SET is_primary = false, updated_at = now()
      WHERE team_id = $1::uuid AND is_active = true
      `, [teamId]);
    }
}
export async function insertTeamMember(client, input) {
    const ins = await client.query(`
    INSERT INTO team_members (team_id, collaborator_id, role, is_primary, is_active)
    VALUES ($1::uuid, $2::uuid, $3, $4, true)
    RETURNING id
    `, [
        input.team_id,
        input.collaborator_id,
        input.role,
        input.is_primary,
    ]);
    const id = ins.rows[0].id;
    const r = await client.query(`
    SELECT
      tm.id,
      tm.team_id,
      tm.collaborator_id,
      tm.role,
      tm.is_primary,
      tm.is_active,
      tm.created_at,
      tm.updated_at,
      c.full_name AS collaborator_full_name,
      c.email AS collaborator_email,
      c.status AS collaborator_status,
      c.is_active AS collaborator_is_active,
      c.deleted_at AS collaborator_deleted_at
    FROM team_members tm
    INNER JOIN collaborators c ON c.id = tm.collaborator_id
    WHERE tm.id = $1::uuid
    `, [id]);
    return r.rows[0];
}
export async function updateTeamMember(pool, teamId, memberId, patch) {
    const sets = [];
    const values = [];
    let n = 1;
    if (patch.role !== undefined) {
        sets.push(`role = $${n}`);
        values.push(patch.role);
        n += 1;
    }
    if (patch.is_primary !== undefined) {
        sets.push(`is_primary = $${n}`);
        values.push(patch.is_primary);
        n += 1;
    }
    if (patch.is_active !== undefined) {
        sets.push(`is_active = $${n}`);
        values.push(patch.is_active);
        n += 1;
    }
    if (sets.length === 0) {
        return findMemberById(pool, teamId, memberId);
    }
    sets.push(`updated_at = now()`);
    values.push(teamId, memberId);
    const pTeam = n;
    const pMember = n + 1;
    await pool.query(`
    UPDATE team_members
    SET ${sets.join(', ')}
    WHERE team_id = $${pTeam}::uuid AND id = $${pMember}::uuid
    `, values);
    return findMemberById(pool, teamId, memberId);
}
export async function softDeactivateTeamMember(pool, teamId, memberId) {
    await pool.query(`
    UPDATE team_members
    SET is_active = false, is_primary = false, updated_at = now()
    WHERE team_id = $1::uuid AND id = $2::uuid AND is_active = true
    `, [teamId, memberId]);
    return findMemberById(pool, teamId, memberId);
}
//# sourceMappingURL=teams.repository.js.map