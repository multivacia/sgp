import { rowToMatrixNodeApi } from './operation-matrix.dto.js';
const baseSelect = `
  SELECT
    id, parent_id, root_id, node_type, code, name, description,
    order_index, level_depth, is_active,
    planned_minutes, default_responsible_id, ARRAY[]::uuid[] AS team_ids,
    required,
    source_key, metadata_json,
    created_at, updated_at, deleted_at
  FROM matrix_nodes
`;
function isMissingRelationOrColumn(e) {
    if (!e || typeof e !== 'object')
        return false;
    const code = e.code;
    return code === '42P01' || code === '42703' || code === '42501';
}
async function fillTeamIdsForRows(pool, rows) {
    if (rows.length === 0)
        return rows;
    const nodeIds = [...new Set(rows.map((r) => r.id))];
    try {
        const r = await pool.query(`SELECT
         mnat.matrix_node_id::text AS matrix_node_id,
         ARRAY_AGG(mnat.team_id::text ORDER BY mnat.created_at ASC) AS team_ids
       FROM matrix_node_assignment_teams mnat
       WHERE mnat.deleted_at IS NULL
         AND mnat.matrix_node_id = ANY($1::uuid[])
       GROUP BY mnat.matrix_node_id`, [nodeIds]);
        const byNode = new Map(r.rows.map((x) => [x.matrix_node_id, x.team_ids ?? []]));
        return rows.map((row) => ({
            ...row,
            team_ids: byNode.get(row.id) ?? [],
        }));
    }
    catch (e) {
        if (isMissingRelationOrColumn(e)) {
            return rows.map((row) => ({ ...row, team_ids: [] }));
        }
        throw e;
    }
}
export function buildNestedTree(rows) {
    if (rows.length === 0) {
        throw new Error('empty tree');
    }
    const childrenByParent = new Map();
    for (const r of rows) {
        const p = r.parent_id;
        if (!childrenByParent.has(p))
            childrenByParent.set(p, []);
        childrenByParent.get(p).push(r);
    }
    for (const list of childrenByParent.values()) {
        list.sort((a, b) => a.order_index - b.order_index || a.name.localeCompare(b.name, 'pt-BR'));
    }
    const root = rows.find((r) => r.node_type === 'ITEM' && r.parent_id === null);
    if (!root) {
        throw new Error('root ITEM not found');
    }
    function toTree(r) {
        const api = rowToMatrixNodeApi(r);
        const ch = childrenByParent.get(r.id) ?? [];
        return {
            ...api,
            children: ch.map(toTree),
        };
    }
    return toTree(root);
}
export async function listRootItems(pool, filters) {
    const parts = [
        "node_type = 'ITEM'",
        'parent_id IS NULL',
        'deleted_at IS NULL',
    ];
    const values = [];
    let n = 1;
    if (filters.is_active === true) {
        parts.push(`is_active = true`);
    }
    else if (filters.is_active === false) {
        parts.push(`is_active = false`);
    }
    const q = filters.search?.trim();
    if (q) {
        parts.push(`(name ILIKE $${n} OR COALESCE(code, '') ILIKE $${n} OR COALESCE(description, '') ILIKE $${n})`);
        values.push(`%${q}%`);
        n += 1;
    }
    const r = await pool.query(`${baseSelect} WHERE ${parts.join(' AND ')} ORDER BY name ASC`, values);
    const rows = await fillTeamIdsForRows(pool, r.rows);
    return rows.map(rowToMatrixNodeApi);
}
export async function findNodeRowById(pool, id, opts) {
    const del = opts?.includeDeleted
        ? ''
        : 'AND deleted_at IS NULL';
    const r = await pool.query(`${baseSelect} WHERE id = $1::uuid ${del}`, [id]);
    const rows = await fillTeamIdsForRows(pool, r.rows);
    return rows[0] ?? null;
}
/** Todos os nós da árvore (ativos), ordenados para montagem da árvore aninhada. */
export async function listTreeRowsByRootId(pool, rootId) {
    const r = await pool.query(`${baseSelect}
     WHERE root_id = $1::uuid AND deleted_at IS NULL
     ORDER BY level_depth ASC, order_index ASC, name ASC`, [rootId]);
    return fillTeamIdsForRows(pool, r.rows);
}
export async function collaboratorExists(pool, id) {
    const r = await pool.query(`SELECT 1::text AS ok FROM collaborators WHERE id = $1::uuid AND deleted_at IS NULL LIMIT 1`, [id]);
    return Boolean(r.rows[0]);
}
export async function listExistingTeamIds(pool, ids) {
    if (ids.length === 0)
        return new Set();
    const r = await pool.query(`SELECT id::text AS id
     FROM teams
     WHERE id = ANY($1::uuid[])`, [ids]);
    return new Set(r.rows.map((x) => x.id));
}
export async function nextSiblingOrderIndex(pool, parentId) {
    if (parentId === null) {
        return 0;
    }
    const r = await pool.query(`SELECT COALESCE(MAX(order_index), -1)::text AS m FROM matrix_nodes
     WHERE parent_id = $1::uuid AND deleted_at IS NULL`, [parentId]);
    return Number(r.rows[0]?.m ?? -1) + 1;
}
export async function insertNode(client, input) {
    const r = await client.query(`INSERT INTO matrix_nodes (
      id, parent_id, root_id, node_type, code, name, description,
      order_index, level_depth, is_active,
      planned_minutes, default_responsible_id, required,
      source_key, metadata_json
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7,
      $8, $9, $10,
      $11, $12, $13,
      $14, $15::jsonb
    )
    RETURNING
      id, parent_id, root_id, node_type, code, name, description,
      order_index, level_depth, is_active,
      planned_minutes, default_responsible_id,
      ARRAY[]::uuid[] AS team_ids,
      required,
      source_key, metadata_json,
      created_at, updated_at, deleted_at`, [
        input.id,
        input.parent_id,
        input.root_id,
        input.node_type,
        input.code,
        input.name,
        input.description,
        input.order_index,
        input.level_depth,
        input.is_active,
        input.planned_minutes,
        input.default_responsible_id,
        input.required,
        input.source_key,
        input.metadata_json === null || input.metadata_json === undefined
            ? null
            : JSON.stringify(input.metadata_json),
    ]);
    const row = r.rows[0];
    if (!row)
        throw new Error('insert failed');
    return row;
}
export async function replaceNodeTeamLinks(client, matrixNodeId, teamIds) {
    await client.query(`UPDATE matrix_node_assignment_teams
     SET deleted_at = now(), updated_at = now()
     WHERE matrix_node_id = $1::uuid AND deleted_at IS NULL`, [matrixNodeId]);
    if (teamIds.length === 0)
        return;
    await client.query(`INSERT INTO matrix_node_assignment_teams (matrix_node_id, team_id, deleted_at)
     SELECT $1::uuid, x.team_id, NULL
     FROM UNNEST($2::uuid[]) AS x(team_id)`, [matrixNodeId, teamIds]);
}
export async function updateNode(pool, id, patch) {
    const sets = [];
    const values = [];
    let n = 1;
    const push = (col, val) => {
        sets.push(`${col} = $${n}`);
        values.push(val);
        n += 1;
    };
    if (patch.name !== undefined)
        push('name', patch.name);
    if (patch.code !== undefined)
        push('code', patch.code);
    if (patch.description !== undefined)
        push('description', patch.description);
    if (patch.order_index !== undefined)
        push('order_index', patch.order_index);
    if (patch.is_active !== undefined)
        push('is_active', patch.is_active);
    if (patch.planned_minutes !== undefined) {
        push('planned_minutes', patch.planned_minutes);
    }
    if (patch.default_responsible_id !== undefined) {
        push('default_responsible_id', patch.default_responsible_id);
    }
    if (patch.required !== undefined)
        push('required', patch.required);
    if (patch.source_key !== undefined)
        push('source_key', patch.source_key);
    if (patch.metadata_json !== undefined) {
        sets.push(`metadata_json = $${n}::jsonb`);
        values.push(patch.metadata_json === null
            ? null
            : JSON.stringify(patch.metadata_json));
        n += 1;
    }
    if (sets.length === 0) {
        return findNodeRowById(pool, id);
    }
    sets.push('updated_at = now()');
    values.push(id);
    const idParam = `$${values.length}`;
    const q = `
    UPDATE matrix_nodes
    SET ${sets.join(', ')}
    WHERE id = ${idParam}::uuid AND deleted_at IS NULL
    RETURNING
      id, parent_id, root_id, node_type, code, name, description,
      order_index, level_depth, is_active,
      planned_minutes, default_responsible_id, required,
      source_key, metadata_json,
      created_at, updated_at, deleted_at
  `;
    const r = await pool.query(q, values);
    return r.rows[0] ?? null;
}
export async function softDeleteCascade(pool, id) {
    const r = await pool.query(`WITH RECURSIVE sub AS (
       SELECT id FROM matrix_nodes WHERE id = $1::uuid AND deleted_at IS NULL
       UNION ALL
       SELECT m.id FROM matrix_nodes m
       INNER JOIN sub ON m.parent_id = sub.id
       WHERE m.deleted_at IS NULL
     )
     UPDATE matrix_nodes SET deleted_at = now(), updated_at = now()
     WHERE id IN (SELECT id FROM sub)`, [id]);
    return r.rowCount ?? 0;
}
export async function restoreCascade(pool, id) {
    const r = await pool.query(`WITH RECURSIVE sub AS (
       SELECT id FROM matrix_nodes WHERE id = $1::uuid
       UNION ALL
       SELECT m.id FROM matrix_nodes m
       INNER JOIN sub ON m.parent_id = sub.id
     )
     UPDATE matrix_nodes SET deleted_at = NULL, updated_at = now()
     WHERE id IN (SELECT id FROM sub) AND deleted_at IS NOT NULL`, [id]);
    return r.rowCount ?? 0;
}
export async function listSubtreeRowsForCopy(pool, rootId) {
    const r = await pool.query(`${baseSelect}
     WHERE root_id = $1::uuid AND deleted_at IS NULL
     ORDER BY level_depth ASC, order_index ASC, name ASC`, [rootId]);
    return fillTeamIdsForRows(pool, r.rows);
}
export async function listSubtreeFromNode(pool, nodeId) {
    const r = await pool.query(`WITH RECURSIVE sub AS (
       SELECT id FROM matrix_nodes WHERE id = $1::uuid AND deleted_at IS NULL
       UNION ALL
       SELECT m.id FROM matrix_nodes m
       INNER JOIN sub ON m.parent_id = sub.id
       WHERE m.deleted_at IS NULL
     )
     SELECT mn.id, mn.parent_id, mn.root_id, mn.node_type, mn.code, mn.name, mn.description,
       mn.order_index, mn.level_depth, mn.is_active,
       mn.planned_minutes, mn.default_responsible_id, ARRAY[]::uuid[] AS team_ids,
       mn.required,
       mn.source_key, mn.metadata_json,
       mn.created_at, mn.updated_at, mn.deleted_at
     FROM matrix_nodes mn
     INNER JOIN sub ON mn.id = sub.id
     ORDER BY mn.level_depth ASC, mn.order_index ASC, mn.name ASC`, [nodeId]);
    return fillTeamIdsForRows(pool, r.rows);
}
export async function swapSiblingOrder(pool, nodeId, direction) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const cur = await client.query(`${baseSelect} WHERE id = $1::uuid AND deleted_at IS NULL FOR UPDATE`, [nodeId]);
        const row = cur.rows[0];
        if (!row) {
            await client.query('ROLLBACK');
            return null;
        }
        const parentId = row.parent_id;
        const siblings = await client.query(`${baseSelect}
       WHERE parent_id IS NOT DISTINCT FROM $2 AND root_id = $1::uuid AND deleted_at IS NULL
       ORDER BY order_index ASC, name ASC`, [row.root_id, parentId]);
        const list = siblings.rows;
        const idx = list.findIndex((s) => s.id === nodeId);
        if (idx < 0) {
            await client.query('ROLLBACK');
            return null;
        }
        const swapWith = direction === 'up' ? idx - 1 : idx + 1;
        if (swapWith < 0 || swapWith >= list.length) {
            await client.query('ROLLBACK');
            return row;
        }
        const a = list[idx];
        const b = list[swapWith];
        await client.query(`UPDATE matrix_nodes SET order_index = $2, updated_at = now() WHERE id = $1::uuid`, [a.id, b.order_index]);
        await client.query(`UPDATE matrix_nodes SET order_index = $2, updated_at = now() WHERE id = $1::uuid`, [b.id, a.order_index]);
        await client.query('COMMIT');
        return findNodeRowById(pool, nodeId);
    }
    catch (e) {
        await client.query('ROLLBACK');
        throw e;
    }
    finally {
        client.release();
    }
}
/**
 * Uma entrada por texto distinto por tipo (dedupe por nome normalizado).
 */
export async function listDistinctLabelCatalogForNodeType(pool, nodeType) {
    const r = await pool.query(`
    SELECT DISTINCT ON (lower(btrim(name)))
      id::text AS id,
      btrim(name) AS label,
      code
    FROM matrix_nodes
    WHERE node_type = $1
      AND deleted_at IS NULL
      AND is_active = true
      AND btrim(name) <> ''
    ORDER BY lower(btrim(name)), id
    `, [nodeType]);
    return r.rows;
}
export async function listMatrixSuggestionCatalogRows(pool) {
    const [options, areas, activities] = await Promise.all([
        listDistinctLabelCatalogForNodeType(pool, 'TASK'),
        listDistinctLabelCatalogForNodeType(pool, 'SECTOR'),
        listDistinctLabelCatalogForNodeType(pool, 'ACTIVITY'),
    ]);
    return { options, areas, activities };
}
export function labelCatalogRowToApi(row) {
    return {
        id: row.id,
        label: row.label,
        code: row.code,
    };
}
//# sourceMappingURL=operation-matrix.repository.js.map