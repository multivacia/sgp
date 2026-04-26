export function rowToMatrixNodeApi(row) {
    return {
        id: row.id,
        parent_id: row.parent_id,
        root_id: row.root_id,
        node_type: row.node_type,
        code: row.code,
        name: row.name,
        description: row.description,
        order_index: row.order_index,
        level_depth: row.level_depth,
        is_active: row.is_active,
        planned_minutes: row.planned_minutes,
        default_responsible_id: row.default_responsible_id,
        team_ids: Array.isArray(row.team_ids) ? row.team_ids : [],
        required: row.required,
        source_key: row.source_key,
        metadata_json: row.metadata_json,
        created_at: row.created_at.toISOString(),
        updated_at: row.updated_at.toISOString(),
        deleted_at: row.deleted_at ? row.deleted_at.toISOString() : null,
    };
}
//# sourceMappingURL=operation-matrix.dto.js.map