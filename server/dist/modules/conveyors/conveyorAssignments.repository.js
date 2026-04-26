import { randomUUID } from 'node:crypto';
export async function findConveyorNodeById(pool, nodeId) {
    const r = await pool.query(`SELECT id, conveyor_id, node_type
     FROM conveyor_nodes
     WHERE id = $1::uuid AND deleted_at IS NULL`, [nodeId]);
    return r.rows[0] ?? null;
}
export async function insertConveyorNodeAssignee(pool, row) {
    const r = await pool.query(`INSERT INTO conveyor_node_assignees (
      id, conveyor_id, conveyor_node_id, assignment_type, collaborator_id, team_id,
      is_primary, assignment_origin, order_index, metadata_json
    ) VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10::jsonb
    )
    RETURNING id`, [
        row.id,
        row.conveyor_id,
        row.conveyor_node_id,
        row.assignment_type,
        row.collaborator_id,
        row.team_id,
        row.is_primary,
        row.assignment_origin,
        row.order_index,
        row.metadata_json === null || row.metadata_json === undefined
            ? null
            : JSON.stringify(row.metadata_json),
    ]);
    const out = r.rows[0];
    if (!out)
        throw new Error('insert conveyor_node_assignees failed');
    return { id: out.id };
}
export async function insertConveyorTimeEntry(pool, row) {
    const r = await pool.query(`INSERT INTO conveyor_time_entries (
      id, conveyor_id, conveyor_node_id, collaborator_id,
      conveyor_node_assignee_id, entry_at, minutes, notes, entry_mode, metadata_json
    ) VALUES (
      $1, $2, $3, $4,
      $5, $6, $7, $8, $9, $10::jsonb
    )
    RETURNING id`, [
        row.id,
        row.conveyor_id,
        row.conveyor_node_id,
        row.collaborator_id,
        row.conveyor_node_assignee_id,
        typeof row.entry_at === 'string' ? row.entry_at : row.entry_at.toISOString(),
        row.minutes,
        row.notes,
        row.entry_mode,
        row.metadata_json === null || row.metadata_json === undefined
            ? null
            : JSON.stringify(row.metadata_json),
    ]);
    const out = r.rows[0];
    if (!out)
        throw new Error('insert conveyor_time_entries failed');
    return { id: out.id };
}
export function newAssignmentId() {
    return randomUUID();
}
export async function findConveyorNodeAssigneeById(pool, id) {
    const r = await pool.query(`SELECT id, conveyor_id, conveyor_node_id, assignment_type, collaborator_id, team_id,
            is_primary, assignment_origin, order_index, created_at, updated_at
     FROM conveyor_node_assignees
     WHERE id = $1::uuid AND deleted_at IS NULL`, [id]);
    const row = r.rows[0];
    return row ?? null;
}
/** Alocação ativa do colaborador no STEP (para apontamento autenticado). */
export async function findAssigneeIdForStepAndCollaborator(pool, conveyorId, conveyorNodeId, collaboratorId) {
    const r = await pool.query(`SELECT id::text
     FROM conveyor_node_assignees
     WHERE conveyor_id = $1::uuid
       AND conveyor_node_id = $2::uuid
       AND assignment_type = 'COLLABORATOR'
       AND collaborator_id = $3::uuid
       AND deleted_at IS NULL
     LIMIT 1`, [conveyorId, conveyorNodeId, collaboratorId]);
    return r.rows[0]?.id ?? null;
}
export async function listConveyorNodeAssigneesByStep(pool, conveyorId, conveyorNodeId) {
    const r = await pool.query(`SELECT cna.id, cna.assignment_type, cna.collaborator_id, c.full_name AS collaborator_name,
            cna.team_id, t.name AS team_name,
            cna.is_primary, cna.assignment_origin, cna.order_index,
            cna.created_at, cna.updated_at
     FROM conveyor_node_assignees cna
     LEFT JOIN collaborators c ON c.id = cna.collaborator_id AND c.deleted_at IS NULL
     LEFT JOIN teams t ON t.id = cna.team_id AND t.deleted_at IS NULL
     WHERE cna.conveyor_id = $1::uuid
       AND cna.conveyor_node_id = $2::uuid
       AND cna.deleted_at IS NULL
     ORDER BY cna.is_primary DESC, cna.order_index ASC, cna.created_at ASC`, [conveyorId, conveyorNodeId]);
    return r.rows;
}
export async function softDeleteConveyorNodeAssignee(pool, args) {
    const r = await pool.query(`UPDATE conveyor_node_assignees
     SET deleted_at = now(), updated_at = now()
     WHERE id = $1::uuid
       AND conveyor_id = $2::uuid
       AND conveyor_node_id = $3::uuid
       AND deleted_at IS NULL
     RETURNING id`, [args.id, args.conveyorId, args.conveyorNodeId]);
    return r.rowCount !== null && r.rowCount > 0;
}
export async function findConveyorTimeEntryById(pool, id) {
    const r = await pool.query(`SELECT id, conveyor_id, conveyor_node_id, collaborator_id,
            conveyor_node_assignee_id, entry_at, minutes, notes, entry_mode,
            metadata_json,
            created_at, updated_at
     FROM conveyor_time_entries
     WHERE id = $1::uuid AND deleted_at IS NULL`, [id]);
    return r.rows[0] ?? null;
}
export async function listConveyorTimeEntriesByStep(pool, conveyorId, conveyorNodeId) {
    const r = await pool.query(`SELECT cte.id, cte.collaborator_id, c.full_name AS collaborator_name,
            cte.conveyor_node_assignee_id, cte.minutes, cte.notes, cte.entry_mode,
            cte.metadata_json,
            au.email AS recorded_by_user_email,
            cte.entry_at, cte.created_at, cte.updated_at
     FROM conveyor_time_entries cte
     LEFT JOIN collaborators c ON c.id = cte.collaborator_id AND c.deleted_at IS NULL
     LEFT JOIN app_users au
       ON au.id = (cte.metadata_json->>'recordedByAppUserId')::uuid
      AND au.deleted_at IS NULL
     WHERE cte.conveyor_id = $1::uuid
       AND cte.conveyor_node_id = $2::uuid
       AND cte.deleted_at IS NULL
     ORDER BY cte.entry_at DESC, cte.created_at DESC`, [conveyorId, conveyorNodeId]);
    return r.rows;
}
export async function softDeleteConveyorTimeEntry(pool, args) {
    const r = await pool.query(`UPDATE conveyor_time_entries
     SET deleted_at = now(), updated_at = now()
     WHERE id = $1::uuid
       AND conveyor_id = $2::uuid
       AND conveyor_node_id = $3::uuid
       AND deleted_at IS NULL
     RETURNING id`, [args.id, args.conveyorId, args.conveyorNodeId]);
    return r.rowCount !== null && r.rowCount > 0;
}
//# sourceMappingURL=conveyorAssignments.repository.js.map