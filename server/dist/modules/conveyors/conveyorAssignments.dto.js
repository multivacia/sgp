function delegationFromStoredMetadata(metadataJson, recordedByUserEmail) {
    const isObj = metadataJson !== null &&
        metadataJson !== undefined &&
        typeof metadataJson === 'object' &&
        !Array.isArray(metadataJson);
    const o = isObj ? metadataJson : {};
    const ridRaw = o.recordedByAppUserId;
    const recordedByAppUserId = typeof ridRaw === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(ridRaw)
        ? ridRaw
        : null;
    const isDelegated = o.isDelegated === true || Boolean(recordedByAppUserId);
    const dr = o.delegationReason;
    const delegationReason = typeof dr === 'string' && dr.trim().length > 0 ? dr.trim() : null;
    return {
        isDelegated,
        recordedByAppUserId,
        recordedByUserEmail: recordedByUserEmail ?? null,
        delegationReason,
    };
}
export function assigneeRowToCreated(row) {
    return {
        id: row.id,
        conveyorId: row.conveyor_id,
        stepNodeId: row.conveyor_node_id,
        type: row.assignment_type,
        collaboratorId: row.collaborator_id,
        teamId: row.team_id,
        isPrimary: row.is_primary,
        assignmentOrigin: row.assignment_origin,
        orderIndex: row.order_index,
        createdAt: row.created_at.toISOString(),
    };
}
export function assigneeListRowToDto(row) {
    return {
        id: row.id,
        type: row.assignment_type,
        collaboratorId: row.collaborator_id,
        collaboratorName: row.collaborator_name,
        teamId: row.team_id,
        teamName: row.team_name,
        isPrimary: row.is_primary,
        assignmentOrigin: row.assignment_origin,
        orderIndex: row.order_index,
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
    };
}
export function timeEntryRowToCreated(row, recordedByUserEmail) {
    const d = delegationFromStoredMetadata(row.metadata_json, recordedByUserEmail);
    return {
        ...d,
        id: row.id,
        conveyorId: row.conveyor_id,
        stepNodeId: row.conveyor_node_id,
        collaboratorId: row.collaborator_id,
        conveyorNodeAssigneeId: row.conveyor_node_assignee_id,
        minutes: row.minutes,
        notes: row.notes,
        entryMode: row.entry_mode,
        entryAt: row.entry_at.toISOString(),
        createdAt: row.created_at.toISOString(),
    };
}
export function timeEntryListRowToDto(row) {
    const d = delegationFromStoredMetadata(row.metadata_json, row.recorded_by_user_email);
    return {
        ...d,
        id: row.id,
        collaboratorId: row.collaborator_id,
        collaboratorName: row.collaborator_name,
        conveyorNodeAssigneeId: row.conveyor_node_assignee_id,
        minutes: row.minutes,
        notes: row.notes,
        entryMode: row.entry_mode,
        entryAt: row.entry_at.toISOString(),
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
    };
}
//# sourceMappingURL=conveyorAssignments.dto.js.map