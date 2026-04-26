import { randomUUID } from 'node:crypto';
export async function insertConveyorNodeAssignee(client, row) {
    const id = row.id ?? randomUUID();
    const r = await client.query(`INSERT INTO conveyor_node_assignees (
      id, conveyor_id, conveyor_node_id, collaborator_id,
      is_primary, assignment_origin, order_index, metadata_json
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8::jsonb
    )
    RETURNING id`, [
        id,
        row.conveyor_id,
        row.conveyor_node_id,
        row.collaborator_id,
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
export async function insertConveyorTimeEntry(client, row) {
    const id = row.id ?? randomUUID();
    const entryAt = row.entry_at === undefined
        ? new Date()
        : new Date(row.entry_at);
    const r = await client.query(`INSERT INTO conveyor_time_entries (
      id, conveyor_id, conveyor_node_id, collaborator_id,
      conveyor_node_assignee_id, entry_at, minutes, notes, entry_mode, metadata_json
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb
    )
    RETURNING id`, [
        id,
        row.conveyor_id,
        row.conveyor_node_id,
        row.collaborator_id,
        row.conveyor_node_assignee_id,
        entryAt.toISOString(),
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
export async function getConveyorNodeForStepValidation(pool, conveyorNodeId) {
    const r = await pool.query(`SELECT conveyor_id, node_type FROM conveyor_nodes
     WHERE id = $1::uuid AND deleted_at IS NULL`, [conveyorNodeId]);
    return r.rows[0] ?? null;
}
export async function collaboratorExistsActive(pool, id) {
    const r = await pool.query(`SELECT 1::text AS ok FROM collaborators
     WHERE id = $1::uuid AND deleted_at IS NULL AND status = 'ACTIVE'
     LIMIT 1`, [id]);
    return Boolean(r.rows[0]);
}
//# sourceMappingURL=conveyorExecution.repository.js.map