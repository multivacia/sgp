export async function listConveyorsForDashboard(pool) {
    const r = await pool.query(`
    SELECT id::text, name, code,
           operational_status::text AS operational_status,
           estimated_deadline
    FROM conveyors
    WHERE deleted_at IS NULL
    ORDER BY name ASC
    `);
    return r.rows;
}
export async function countAssigneeRoles(pool) {
    const r = await pool.query(`
    SELECT
      COUNT(*)::text AS total,
      SUM(CASE WHEN is_primary THEN 1 ELSE 0 END)::text AS primary,
      SUM(CASE WHEN NOT is_primary THEN 1 ELSE 0 END)::text AS support
    FROM conveyor_node_assignees
    WHERE deleted_at IS NULL
    `);
    const row = r.rows[0];
    return {
        total: Number.parseInt(row.total, 10) || 0,
        primary: Number.parseInt(row.primary, 10) || 0,
        support: Number.parseInt(row.support, 10) || 0,
    };
}
export async function sumConveyorPlannedMinutes(pool) {
    const r = await pool.query(`SELECT COALESCE(SUM(total_planned_minutes), 0)::text AS s
     FROM conveyors WHERE deleted_at IS NULL`);
    return Number.parseInt(r.rows[0]?.s ?? '0', 10) || 0;
}
export async function sumStepPlannedMinutes(pool) {
    const r = await pool.query(`
    SELECT COALESCE(SUM(planned_minutes), 0)::text AS s
    FROM conveyor_nodes
    WHERE deleted_at IS NULL
      AND is_active = TRUE
      AND node_type = 'STEP'
    `);
    return Number.parseInt(r.rows[0]?.s ?? '0', 10) || 0;
}
export async function sumRealizedMinutes(pool) {
    const r = await pool.query(`SELECT COALESCE(SUM(minutes), 0)::text AS s
     FROM conveyor_time_entries WHERE deleted_at IS NULL`);
    return Number.parseInt(r.rows[0]?.s ?? '0', 10) || 0;
}
/** Soma global de minutos apontados com `entry_at` no intervalo (inclusivo nas extremidades via query). */
export async function sumRealizedMinutesBetween(pool, from, to) {
    const r = await pool.query(`
    SELECT COALESCE(SUM(minutes), 0)::text AS s
    FROM conveyor_time_entries
    WHERE deleted_at IS NULL
      AND entry_at >= $1::timestamptz
      AND entry_at <= $2::timestamptz
    `, [from, to]);
    return Number.parseInt(r.rows[0]?.s ?? '0', 10) || 0;
}
export async function listCollaboratorLoadAggregates(pool) {
    const r = await pool.query(`
    SELECT
      cna.collaborator_id::text,
      c.full_name,
      COUNT(*)::text AS assignment_count,
      SUM(CASE WHEN cna.is_primary THEN 1 ELSE 0 END)::text AS primary_count,
      SUM(CASE WHEN NOT cna.is_primary THEN 1 ELSE 0 END)::text AS support_count,
      COALESCE(SUM(COALESCE(step.planned_minutes, 0)), 0)::text AS planned_minutes_steps
    FROM conveyor_node_assignees cna
    INNER JOIN collaborators c
      ON c.id = cna.collaborator_id AND c.deleted_at IS NULL
    INNER JOIN conveyor_nodes step
      ON step.id = cna.conveyor_node_id
      AND step.deleted_at IS NULL
      AND step.is_active = TRUE
      AND step.node_type = 'STEP'
    WHERE cna.deleted_at IS NULL
    GROUP BY cna.collaborator_id, c.full_name
    ORDER BY COUNT(*) DESC, c.full_name ASC
    `);
    return r.rows;
}
export async function sumRealizedMinutesByCollaborator(pool) {
    const r = await pool.query(`
    SELECT collaborator_id::text AS id, COALESCE(SUM(minutes), 0)::text AS s
    FROM conveyor_time_entries
    WHERE deleted_at IS NULL
    GROUP BY collaborator_id
    `);
    const m = new Map();
    for (const row of r.rows) {
        m.set(row.id, Number.parseInt(row.s, 10) || 0);
    }
    return m;
}
export async function listRecentTimeEntries(pool, limit) {
    const r = await pool.query(`
    SELECT
      cte.id::text,
      cte.conveyor_id::text,
      cv.name AS conveyor_name,
      cte.conveyor_node_id::text,
      step.name AS step_name,
      cte.collaborator_id::text,
      col.full_name AS collaborator_name,
      cte.minutes,
      cte.entry_at,
      cte.notes
    FROM conveyor_time_entries cte
    INNER JOIN conveyors cv ON cv.id = cte.conveyor_id AND cv.deleted_at IS NULL
    INNER JOIN conveyor_nodes step
      ON step.id = cte.conveyor_node_id AND step.deleted_at IS NULL
    LEFT JOIN collaborators col ON col.id = cte.collaborator_id AND col.deleted_at IS NULL
    WHERE cte.deleted_at IS NULL
    ORDER BY cte.entry_at DESC, cte.created_at DESC
    LIMIT $1
    `, [limit]);
    return r.rows;
}
export async function countActiveConveyors(pool) {
    const r = await pool.query(`
    SELECT COUNT(*)::text AS c
    FROM conveyors
    WHERE deleted_at IS NULL
      AND operational_status IS DISTINCT FROM 'CONCLUIDA'
    `);
    return Number.parseInt(r.rows[0]?.c ?? '0', 10) || 0;
}
export async function countCompletedInWindow(pool, days) {
    const r = await pool.query(`
    SELECT COUNT(*)::text AS c
    FROM conveyors
    WHERE deleted_at IS NULL
      AND operational_status = 'CONCLUIDA'
      AND completed_at IS NOT NULL
      AND completed_at >= NOW() - ($1::int * INTERVAL '1 day')
    `, [days]);
    return Number.parseInt(r.rows[0]?.c ?? '0', 10) || 0;
}
//# sourceMappingURL=dashboard.repository.js.map