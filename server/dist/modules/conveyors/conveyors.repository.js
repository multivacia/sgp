import { randomUUID } from 'node:crypto';
export async function findConveyorById(pool, id) {
    const r = await pool.query(`
    SELECT
      id::text,
      code,
      name,
      client_name,
      vehicle,
      model_version,
      plate,
      initial_notes,
      responsible,
      priority,
      origin_register,
      base_ref_snapshot,
      base_code_snapshot,
      base_name_snapshot,
      base_version_snapshot,
      metadata_json,
      operational_status,
      created_at,
      completed_at,
      estimated_deadline,
      total_options,
      total_areas,
      total_steps,
      total_planned_minutes
    FROM conveyors
    WHERE id = $1::uuid AND deleted_at IS NULL
    `, [id]);
    const row = r.rows[0];
    if (!row)
        return null;
    return {
        id: row.id,
        code: row.code,
        name: row.name,
        client_name: row.client_name,
        vehicle: row.vehicle,
        model_version: row.model_version,
        plate: row.plate,
        initial_notes: row.initial_notes,
        responsible: row.responsible,
        priority: row.priority,
        origin_register: row.origin_register,
        base_ref_snapshot: row.base_ref_snapshot,
        base_code_snapshot: row.base_code_snapshot,
        base_name_snapshot: row.base_name_snapshot,
        base_version_snapshot: row.base_version_snapshot,
        metadata_json: row.metadata_json,
        operational_status: row.operational_status,
        created_at: row.created_at.toISOString(),
        completed_at: row.completed_at ? row.completed_at.toISOString() : null,
        estimated_deadline: row.estimated_deadline,
        total_options: row.total_options,
        total_areas: row.total_areas,
        total_steps: row.total_steps,
        total_planned_minutes: row.total_planned_minutes,
    };
}
export async function listConveyorNodesByConveyorId(pool, conveyorId) {
    const r = await pool.query(`
    SELECT id::text, parent_id::text, node_type, order_index, name, planned_minutes
    FROM conveyor_nodes
    WHERE conveyor_id = $1::uuid AND deleted_at IS NULL
    `, [conveyorId]);
    return r.rows.map((row) => ({
        id: row.id,
        parent_id: row.parent_id,
        node_type: row.node_type,
        order_index: row.order_index,
        name: row.name,
        planned_minutes: row.planned_minutes,
    }));
}
export async function updateConveyorOperationalStatus(pool, conveyorId, nextStatus, completedAtMode) {
    const r = await pool.query(`
    UPDATE conveyors SET
      operational_status = $2::varchar,
      completed_at = CASE
        WHEN $3::text = 'now' THEN now()
        WHEN $3::text = 'clear' THEN NULL
        ELSE completed_at
      END,
      updated_at = now()
    WHERE id = $1::uuid AND deleted_at IS NULL
    RETURNING
      id::text,
      code,
      name,
      client_name,
      vehicle,
      model_version,
      plate,
      initial_notes,
      responsible,
      priority,
      origin_register,
      base_ref_snapshot,
      base_code_snapshot,
      base_name_snapshot,
      base_version_snapshot,
      metadata_json,
      operational_status,
      created_at,
      completed_at,
      estimated_deadline,
      total_options,
      total_areas,
      total_steps,
      total_planned_minutes
    `, [conveyorId, nextStatus, completedAtMode]);
    const row = r.rows[0];
    if (!row)
        return null;
    return {
        id: row.id,
        code: row.code,
        name: row.name,
        client_name: row.client_name,
        vehicle: row.vehicle,
        model_version: row.model_version,
        plate: row.plate,
        initial_notes: row.initial_notes,
        responsible: row.responsible,
        priority: row.priority,
        origin_register: row.origin_register,
        base_ref_snapshot: row.base_ref_snapshot,
        base_code_snapshot: row.base_code_snapshot,
        base_name_snapshot: row.base_name_snapshot,
        base_version_snapshot: row.base_version_snapshot,
        metadata_json: row.metadata_json,
        operational_status: row.operational_status,
        created_at: row.created_at.toISOString(),
        completed_at: row.completed_at ? row.completed_at.toISOString() : null,
        estimated_deadline: row.estimated_deadline,
        total_options: row.total_options,
        total_areas: row.total_areas,
        total_steps: row.total_steps,
        total_planned_minutes: row.total_planned_minutes,
    };
}
export async function insertConveyor(client, row) {
    const r = await client.query(`INSERT INTO conveyors (
      id, code, name, client_name, vehicle, model_version, plate,
      initial_notes, responsible, estimated_deadline, priority,
      origin_register, base_ref_snapshot, base_code_snapshot, base_name_snapshot, base_version_snapshot,
      total_options, total_areas, total_steps, total_planned_minutes, metadata_json,
      operational_status, completed_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7,
      $8, $9, $10, $11,
      $12, $13, $14, $15, $16,
      $17, $18, $19, $20, $21::jsonb,
      $22, $23
    )
    RETURNING id, created_at`, [
        row.id,
        row.code,
        row.name,
        row.client_name,
        row.vehicle,
        row.model_version,
        row.plate,
        row.initial_notes,
        row.responsible,
        row.estimated_deadline,
        row.priority,
        row.origin_register,
        row.base_ref_snapshot,
        row.base_code_snapshot,
        row.base_name_snapshot,
        row.base_version_snapshot,
        row.total_options,
        row.total_areas,
        row.total_steps,
        row.total_planned_minutes,
        row.metadata_json === null || row.metadata_json === undefined
            ? null
            : JSON.stringify(row.metadata_json),
        row.operational_status,
        row.completed_at,
    ]);
    const out = r.rows[0];
    if (!out)
        throw new Error('insert conveyor failed');
    return { id: out.id, created_at: out.created_at.toISOString() };
}
export async function insertConveyorNode(client, row) {
    await client.query(`INSERT INTO conveyor_nodes (
      id, conveyor_id, parent_id, root_id, node_type, source_origin,
      code, name, description, order_index, level_depth, is_active,
      planned_minutes, default_responsible_id, required, source_key, metadata_json
    ) VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10, $11, $12,
      $13, $14, $15, $16, $17::jsonb
    )`, [
        row.id,
        row.conveyor_id,
        row.parent_id,
        row.root_id,
        row.node_type,
        row.source_origin,
        row.code,
        row.name,
        row.description,
        row.order_index,
        row.level_depth,
        row.is_active,
        row.planned_minutes,
        row.default_responsible_id,
        row.required,
        row.source_key,
        row.metadata_json === null || row.metadata_json === undefined
            ? null
            : JSON.stringify(row.metadata_json),
    ]);
}
export function newNodeId() {
    return randomUUID();
}
export async function listConveyors(pool, filters) {
    const conditions = ['deleted_at IS NULL'];
    const params = [];
    let n = 1;
    const q = filters.q?.trim() ?? '';
    if (q.length > 0) {
        conditions.push(`(name ILIKE $${n} OR COALESCE(code, '') ILIKE $${n} OR COALESCE(client_name, '') ILIKE $${n})`);
        params.push(`%${q}%`);
        n++;
    }
    if (filters.priority !== undefined) {
        conditions.push(`priority = $${n}`);
        params.push(filters.priority);
        n++;
    }
    const resp = filters.responsible?.trim() ?? '';
    if (resp.length > 0) {
        conditions.push(`COALESCE(responsible, '') ILIKE $${n}`);
        params.push(`%${resp}%`);
        n++;
    }
    if (filters.operationalStatus !== undefined) {
        conditions.push(`operational_status = $${n}`);
        params.push(filters.operationalStatus);
        n++;
    }
    const sql = `
    SELECT
      id::text,
      code,
      name,
      client_name,
      responsible,
      priority,
      origin_register,
      created_at,
      operational_status,
      completed_at,
      estimated_deadline,
      total_steps
    FROM conveyors
    WHERE ${conditions.join(' AND ')}
    ORDER BY created_at DESC
  `;
    const r = await pool.query(sql, params);
    return r.rows.map((row) => ({
        id: row.id,
        code: row.code,
        name: row.name,
        client_name: row.client_name,
        responsible: row.responsible,
        priority: row.priority,
        origin_register: row.origin_register,
        created_at: row.created_at.toISOString(),
        operational_status: row.operational_status,
        completed_at: row.completed_at ? row.completed_at.toISOString() : null,
        estimated_deadline: row.estimated_deadline,
        total_steps: row.total_steps,
    }));
}
export async function countActiveTimeEntriesByConveyor(pool, conveyorId) {
    const r = await pool.query(`
    SELECT COUNT(*)::text AS c
    FROM conveyor_time_entries
    WHERE conveyor_id = $1::uuid AND deleted_at IS NULL
    `, [conveyorId]);
    const raw = r.rows[0]?.c ?? '0';
    return Number.parseInt(raw, 10) || 0;
}
/**
 * Remove alocações e nós da esteira (para substituir a estrutura).
 * Exige que não existam apontamentos (`conveyor_time_entries`) ativos.
 */
export async function deleteConveyorAssigneesAndNodes(client, conveyorId) {
    await client.query(`DELETE FROM conveyor_node_assignees WHERE conveyor_id = $1::uuid`, [conveyorId]);
    await client.query(`
    DELETE FROM conveyor_nodes
    WHERE conveyor_id = $1::uuid AND node_type = 'STEP'
    `, [conveyorId]);
    await client.query(`
    DELETE FROM conveyor_nodes
    WHERE conveyor_id = $1::uuid AND node_type = 'AREA'
    `, [conveyorId]);
    await client.query(`
    DELETE FROM conveyor_nodes
    WHERE conveyor_id = $1::uuid AND node_type = 'OPTION'
    `, [conveyorId]);
}
export async function updateConveyorDados(pool, conveyorId, patch) {
    const sets = ['updated_at = now()'];
    const params = [];
    let n = 1;
    if (patch.name !== undefined) {
        sets.push(`name = $${n}`);
        params.push(patch.name);
        n++;
    }
    if (patch.client_name !== undefined) {
        sets.push(`client_name = $${n}`);
        params.push(patch.client_name);
        n++;
    }
    if (patch.vehicle !== undefined) {
        sets.push(`vehicle = $${n}`);
        params.push(patch.vehicle);
        n++;
    }
    if (patch.model_version !== undefined) {
        sets.push(`model_version = $${n}`);
        params.push(patch.model_version);
        n++;
    }
    if (patch.plate !== undefined) {
        sets.push(`plate = $${n}`);
        params.push(patch.plate);
        n++;
    }
    if (patch.initial_notes !== undefined) {
        sets.push(`initial_notes = $${n}`);
        params.push(patch.initial_notes);
        n++;
    }
    if (patch.responsible !== undefined) {
        sets.push(`responsible = $${n}`);
        params.push(patch.responsible);
        n++;
    }
    if (patch.estimated_deadline !== undefined) {
        sets.push(`estimated_deadline = $${n}`);
        params.push(patch.estimated_deadline);
        n++;
    }
    if (patch.priority !== undefined) {
        sets.push(`priority = $${n}`);
        params.push(patch.priority);
        n++;
    }
    if (patch.metadata_json !== undefined) {
        sets.push(`metadata_json = $${n}::jsonb`);
        params.push(patch.metadata_json === null || patch.metadata_json === undefined
            ? null
            : JSON.stringify(patch.metadata_json));
        n++;
    }
    params.push(conveyorId);
    const idParam = n;
    const r = await pool.query(`
    UPDATE conveyors SET
      ${sets.join(', ')}
    WHERE id = $${idParam}::uuid AND deleted_at IS NULL
    RETURNING
      id::text,
      code,
      name,
      client_name,
      vehicle,
      model_version,
      plate,
      initial_notes,
      responsible,
      priority,
      origin_register,
      base_ref_snapshot,
      base_code_snapshot,
      base_name_snapshot,
      base_version_snapshot,
      metadata_json,
      operational_status,
      created_at,
      completed_at,
      estimated_deadline,
      total_options,
      total_areas,
      total_steps,
      total_planned_minutes
    `, params);
    const row = r.rows[0];
    if (!row)
        return null;
    return {
        id: row.id,
        code: row.code,
        name: row.name,
        client_name: row.client_name,
        vehicle: row.vehicle,
        model_version: row.model_version,
        plate: row.plate,
        initial_notes: row.initial_notes,
        responsible: row.responsible,
        priority: row.priority,
        origin_register: row.origin_register,
        base_ref_snapshot: row.base_ref_snapshot,
        base_code_snapshot: row.base_code_snapshot,
        base_name_snapshot: row.base_name_snapshot,
        base_version_snapshot: row.base_version_snapshot,
        metadata_json: row.metadata_json,
        operational_status: row.operational_status,
        created_at: row.created_at.toISOString(),
        completed_at: row.completed_at ? row.completed_at.toISOString() : null,
        estimated_deadline: row.estimated_deadline,
        total_options: row.total_options,
        total_areas: row.total_areas,
        total_steps: row.total_steps,
        total_planned_minutes: row.total_planned_minutes,
    };
}
export async function updateConveyorStructureMeta(client, conveyorId, row) {
    await client.query(`
    UPDATE conveyors SET
      origin_register = $2::varchar,
      base_ref_snapshot = $3,
      base_code_snapshot = $4,
      base_name_snapshot = $5,
      base_version_snapshot = $6,
      metadata_json = $7::jsonb,
      total_options = $8,
      total_areas = $9,
      total_steps = $10,
      total_planned_minutes = $11,
      updated_at = now()
    WHERE id = $1::uuid AND deleted_at IS NULL
    `, [
        conveyorId,
        row.origin_register,
        row.base_ref_snapshot,
        row.base_code_snapshot,
        row.base_name_snapshot,
        row.base_version_snapshot,
        row.metadata_json === null || row.metadata_json === undefined
            ? null
            : JSON.stringify(row.metadata_json),
        row.total_options,
        row.total_areas,
        row.total_steps,
        row.total_planned_minutes,
    ]);
}
//# sourceMappingURL=conveyors.repository.js.map