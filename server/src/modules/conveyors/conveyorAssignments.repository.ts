import type pg from 'pg'
import { randomUUID } from 'node:crypto'

export type ConveyorNodeRow = {
  id: string
  conveyor_id: string
  node_type: 'OPTION' | 'AREA' | 'STEP'
}

export async function findConveyorNodeById(
  pool: pg.Pool,
  nodeId: string,
): Promise<ConveyorNodeRow | null> {
  const r = await pool.query<ConveyorNodeRow>(
    `SELECT id, conveyor_id, node_type
     FROM conveyor_nodes
     WHERE id = $1::uuid AND deleted_at IS NULL`,
    [nodeId],
  )
  return r.rows[0] ?? null
}

/** `operational_status` do STEP (null se nó inexistente). */
export async function findStepOperationalStatusByNodeId(
  pool: pg.Pool,
  conveyorNodeId: string,
): Promise<string | null> {
  const r = await pool.query<{ operational_status: string | null }>(
    `SELECT operational_status
     FROM conveyor_nodes
     WHERE id = $1::uuid AND deleted_at IS NULL`,
    [conveyorNodeId],
  )
  return r.rows[0]?.operational_status ?? null
}

export type InsertConveyorNodeAssigneeRow = {
  id: string
  conveyor_id: string
  conveyor_node_id: string
  assignment_type: 'COLLABORATOR' | 'TEAM'
  collaborator_id: string | null
  team_id: string | null
  is_primary: boolean
  assignment_origin: 'manual' | 'base' | 'reaproveitada'
  order_index: number
  metadata_json: unknown | null
}

/** Pool ou cliente de transação. */
export type PoolOrClient = pg.Pool | pg.PoolClient

export async function insertConveyorNodeAssignee(
  pool: PoolOrClient,
  row: InsertConveyorNodeAssigneeRow,
): Promise<{ id: string }> {
  const r = await pool.query<{ id: string }>(
    `INSERT INTO conveyor_node_assignees (
      id, conveyor_id, conveyor_node_id, assignment_type, collaborator_id, team_id,
      is_primary, assignment_origin, order_index, metadata_json
    ) VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10::jsonb
    )
    RETURNING id`,
    [
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
    ],
  )
  const out = r.rows[0]
  if (!out) throw new Error('insert conveyor_node_assignees failed')
  return { id: out.id }
}

export type InsertConveyorTimeEntryRow = {
  id: string
  conveyor_id: string
  conveyor_node_id: string
  collaborator_id: string
  conveyor_node_assignee_id: string | null
  entry_at: Date | string
  minutes: number
  notes: string | null
  entry_mode: 'manual' | 'guided' | 'imported'
  metadata_json: unknown | null
  entry_origin: 'ASSIGNED' | 'UNASSIGNED_EXCEPTION'
  exception_justification: string | null
  is_out_of_sequence: boolean
  out_of_sequence_justification: string | null
}

export async function insertConveyorTimeEntry(
  pool: PoolOrClient,
  row: InsertConveyorTimeEntryRow,
): Promise<{ id: string }> {
  const r = await pool.query<{ id: string }>(
    `INSERT INTO conveyor_time_entries (
      id, conveyor_id, conveyor_node_id, collaborator_id,
      conveyor_node_assignee_id, entry_at, minutes, notes, entry_mode, metadata_json,
      entry_origin, exception_justification,
      is_out_of_sequence, out_of_sequence_justification
    ) VALUES (
      $1, $2, $3, $4,
      $5, $6, $7, $8, $9, $10::jsonb,
      $11, $12,
      $13, $14
    )
    RETURNING id`,
    [
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
      row.entry_origin,
      row.exception_justification,
      row.is_out_of_sequence,
      row.out_of_sequence_justification,
    ],
  )
  const out = r.rows[0]
  if (!out) throw new Error('insert conveyor_time_entries failed')
  return { id: out.id }
}

export function newAssignmentId(): string {
  return randomUUID()
}

export type ConveyorNodeAssigneeRow = {
  id: string
  conveyor_id: string
  conveyor_node_id: string
  assignment_type: 'COLLABORATOR' | 'TEAM'
  collaborator_id: string | null
  team_id: string | null
  is_primary: boolean
  assignment_origin: 'manual' | 'base' | 'reaproveitada'
  order_index: number
  created_at: Date
  updated_at: Date
}

export type ConveyorNodeAssigneeListRow = {
  id: string
  assignment_type: 'COLLABORATOR' | 'TEAM'
  collaborator_id: string | null
  team_id: string | null
  collaborator_name: string | null
  team_name: string | null
  is_primary: boolean
  assignment_origin: 'manual' | 'base' | 'reaproveitada'
  order_index: number
  created_at: Date
  updated_at: Date
}

export async function findConveyorNodeAssigneeById(
  pool: pg.Pool,
  id: string,
): Promise<ConveyorNodeAssigneeRow | null> {
  const r = await pool.query<ConveyorNodeAssigneeRow>(
    `SELECT id, conveyor_id, conveyor_node_id, assignment_type, collaborator_id, team_id,
            is_primary, assignment_origin, order_index, created_at, updated_at
     FROM conveyor_node_assignees
     WHERE id = $1::uuid AND deleted_at IS NULL`,
    [id],
  )
  const row = r.rows[0]
  return row ?? null
}

/** Alocação ativa do colaborador no STEP (para apontamento autenticado). */
export async function findAssigneeIdForStepAndCollaborator(
  pool: pg.Pool,
  conveyorId: string,
  conveyorNodeId: string,
  collaboratorId: string,
): Promise<string | null> {
  const r = await pool.query<{ id: string }>(
    `SELECT id::text
     FROM (
       SELECT cna.id,
              CASE WHEN cna.assignment_type = 'COLLABORATOR' THEN 0 ELSE 1 END AS sort_pri
       FROM conveyor_node_assignees cna
       WHERE cna.conveyor_id = $1::uuid
         AND cna.conveyor_node_id = $2::uuid
         AND cna.deleted_at IS NULL
         AND (
           (
             cna.assignment_type = 'COLLABORATOR'
             AND cna.collaborator_id = $3::uuid
           )
           OR (
             cna.assignment_type = 'TEAM'
             AND EXISTS (
               SELECT 1
               FROM team_members tm
               WHERE tm.team_id = cna.team_id
                 AND tm.collaborator_id = $3::uuid
                 AND tm.is_active = TRUE
             )
           )
         )
     ) x
     ORDER BY x.sort_pri, x.id
     LIMIT 1`,
    [conveyorId, conveyorNodeId, collaboratorId],
  )
  return r.rows[0]?.id ?? null
}

/** Uma linha por alocação — para enriquecer GET detalhe (agrupar por `conveyor_node_id`). */
export type ConveyorNodeAssigneeDetailRow = {
  conveyor_node_id: string
  assignment_type: 'COLLABORATOR' | 'TEAM'
  collaborator_id: string | null
  collaborator_name: string | null
  team_id: string | null
  team_name: string | null
  is_primary: boolean
  order_index: number
  created_at: Date
}

/**
 * Todas as alocações ativas dos STEP desta esteira — uma query (join colaboradores/times).
 * Ordem: nó, order_index, created_at.
 */
export async function listConveyorNodeAssigneesForConveyorDetail(
  pool: pg.Pool,
  conveyorId: string,
): Promise<ConveyorNodeAssigneeDetailRow[]> {
  const r = await pool.query<ConveyorNodeAssigneeDetailRow>(
    `SELECT
       cna.conveyor_node_id::text AS conveyor_node_id,
       cna.assignment_type,
       cna.collaborator_id::text,
       c.full_name AS collaborator_name,
       cna.team_id::text,
       t.name AS team_name,
       cna.is_primary,
       cna.order_index,
       cna.created_at
     FROM conveyor_node_assignees cna
     INNER JOIN conveyor_nodes cn
       ON cn.id = cna.conveyor_node_id
      AND cn.deleted_at IS NULL
      AND cn.node_type = 'STEP'
     LEFT JOIN collaborators c
       ON c.id = cna.collaborator_id AND c.deleted_at IS NULL
     LEFT JOIN teams t
       ON t.id = cna.team_id AND t.deleted_at IS NULL
     WHERE cna.conveyor_id = $1::uuid
       AND cna.deleted_at IS NULL
     ORDER BY cna.conveyor_node_id, cna.order_index ASC, cna.created_at ASC`,
    [conveyorId],
  )
  return r.rows
}

export async function listConveyorNodeAssigneesByStep(
  pool: pg.Pool,
  conveyorId: string,
  conveyorNodeId: string,
): Promise<ConveyorNodeAssigneeListRow[]> {
  const r = await pool.query<ConveyorNodeAssigneeListRow>(
    `SELECT cna.id, cna.assignment_type, cna.collaborator_id, c.full_name AS collaborator_name,
            cna.team_id, t.name AS team_name,
            cna.is_primary, cna.assignment_origin, cna.order_index,
            cna.created_at, cna.updated_at
     FROM conveyor_node_assignees cna
     LEFT JOIN collaborators c ON c.id = cna.collaborator_id AND c.deleted_at IS NULL
     LEFT JOIN teams t ON t.id = cna.team_id AND t.deleted_at IS NULL
     WHERE cna.conveyor_id = $1::uuid
       AND cna.conveyor_node_id = $2::uuid
       AND cna.deleted_at IS NULL
     ORDER BY cna.is_primary DESC, cna.order_index ASC, cna.created_at ASC`,
    [conveyorId, conveyorNodeId],
  )
  return r.rows
}

export async function softDeleteConveyorNodeAssignee(
  pool: pg.Pool,
  args: { id: string; conveyorId: string; conveyorNodeId: string },
): Promise<boolean> {
  const r = await pool.query(
    `UPDATE conveyor_node_assignees
     SET deleted_at = now(), updated_at = now()
     WHERE id = $1::uuid
       AND conveyor_id = $2::uuid
       AND conveyor_node_id = $3::uuid
       AND deleted_at IS NULL
     RETURNING id`,
    [args.id, args.conveyorId, args.conveyorNodeId],
  )
  return r.rowCount !== null && r.rowCount > 0
}

export type ConveyorTimeEntryRow = {
  id: string
  conveyor_id: string
  conveyor_node_id: string
  collaborator_id: string
  conveyor_node_assignee_id: string | null
  entry_at: Date
  minutes: number
  notes: string | null
  entry_mode: 'manual' | 'guided' | 'imported'
  metadata_json: unknown | null
  entry_origin: 'ASSIGNED' | 'UNASSIGNED_EXCEPTION'
  exception_justification: string | null
  is_out_of_sequence: boolean
  out_of_sequence_justification: string | null
  created_at: Date
  updated_at: Date
}

export type ConveyorTimeEntryListRow = {
  id: string
  collaborator_id: string
  collaborator_name: string | null
  conveyor_node_assignee_id: string | null
  minutes: number
  notes: string | null
  entry_mode: 'manual' | 'guided' | 'imported'
  metadata_json: unknown | null
  entry_origin: 'ASSIGNED' | 'UNASSIGNED_EXCEPTION'
  exception_justification: string | null
  is_out_of_sequence: boolean
  out_of_sequence_justification: string | null
  recorded_by_user_email: string | null
  entry_at: Date
  created_at: Date
  updated_at: Date
}

export async function findConveyorTimeEntryById(
  pool: pg.Pool,
  id: string,
): Promise<ConveyorTimeEntryRow | null> {
  const r = await pool.query<ConveyorTimeEntryRow>(
    `SELECT id, conveyor_id, conveyor_node_id, collaborator_id,
            conveyor_node_assignee_id, entry_at, minutes, notes, entry_mode,
            metadata_json, entry_origin, exception_justification,
            is_out_of_sequence, out_of_sequence_justification,
            created_at, updated_at
     FROM conveyor_time_entries
     WHERE id = $1::uuid AND deleted_at IS NULL`,
    [id],
  )
  return r.rows[0] ?? null
}

export async function listConveyorTimeEntriesByStep(
  pool: pg.Pool,
  conveyorId: string,
  conveyorNodeId: string,
): Promise<ConveyorTimeEntryListRow[]> {
  const r = await pool.query<ConveyorTimeEntryListRow>(
    `SELECT cte.id, cte.collaborator_id, c.full_name AS collaborator_name,
            cte.conveyor_node_assignee_id, cte.minutes, cte.notes, cte.entry_mode,
            cte.metadata_json, cte.entry_origin, cte.exception_justification,
            cte.is_out_of_sequence, cte.out_of_sequence_justification,
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
     ORDER BY cte.entry_at DESC, cte.created_at DESC`,
    [conveyorId, conveyorNodeId],
  )
  return r.rows
}

export async function softDeleteConveyorTimeEntry(
  pool: PoolOrClient,
  args: { id: string; conveyorId: string; conveyorNodeId: string },
): Promise<boolean> {
  const r = await pool.query(
    `UPDATE conveyor_time_entries
     SET deleted_at = now(), updated_at = now()
     WHERE id = $1::uuid
       AND conveyor_id = $2::uuid
       AND conveyor_node_id = $3::uuid
       AND deleted_at IS NULL
     RETURNING id`,
    [args.id, args.conveyorId, args.conveyorNodeId],
  )
  return r.rowCount !== null && r.rowCount > 0
}
