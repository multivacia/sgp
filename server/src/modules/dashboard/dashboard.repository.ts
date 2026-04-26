import type pg from 'pg'
import type { ConveyorRowForBucket } from './dashboard.dto.js'

export async function listConveyorsForDashboard(
  pool: pg.Pool,
): Promise<ConveyorRowForBucket[]> {
  const r = await pool.query<ConveyorRowForBucket>(
    `
    SELECT id::text, name, code,
           operational_status::text AS operational_status,
           estimated_deadline
    FROM conveyors
    WHERE deleted_at IS NULL
    ORDER BY name ASC
    `,
  )
  return r.rows
}

export async function countAssigneeRoles(pool: pg.Pool): Promise<{
  total: number
  primary: number
  support: number
}> {
  const r = await pool.query<{
    total: string
    primary: string
    support: string
  }>(
    `
    SELECT
      COUNT(*)::text AS total,
      SUM(CASE WHEN is_primary THEN 1 ELSE 0 END)::text AS primary,
      SUM(CASE WHEN NOT is_primary THEN 1 ELSE 0 END)::text AS support
    FROM conveyor_node_assignees
    WHERE deleted_at IS NULL
    `,
  )
  const row = r.rows[0]!
  return {
    total: Number.parseInt(row.total, 10) || 0,
    primary: Number.parseInt(row.primary, 10) || 0,
    support: Number.parseInt(row.support, 10) || 0,
  }
}

export async function sumConveyorPlannedMinutes(pool: pg.Pool): Promise<number> {
  const r = await pool.query<{ s: string | null }>(
    `SELECT COALESCE(SUM(total_planned_minutes), 0)::text AS s
     FROM conveyors WHERE deleted_at IS NULL`,
  )
  return Number.parseInt(r.rows[0]?.s ?? '0', 10) || 0
}

export async function sumStepPlannedMinutes(pool: pg.Pool): Promise<number> {
  const r = await pool.query<{ s: string | null }>(
    `
    SELECT COALESCE(SUM(planned_minutes), 0)::text AS s
    FROM conveyor_nodes
    WHERE deleted_at IS NULL
      AND is_active = TRUE
      AND node_type = 'STEP'
    `,
  )
  return Number.parseInt(r.rows[0]?.s ?? '0', 10) || 0
}

export async function sumRealizedMinutes(pool: pg.Pool): Promise<number> {
  const r = await pool.query<{ s: string | null }>(
    `SELECT COALESCE(SUM(minutes), 0)::text AS s
     FROM conveyor_time_entries WHERE deleted_at IS NULL`,
  )
  return Number.parseInt(r.rows[0]?.s ?? '0', 10) || 0
}

/** Soma global de minutos apontados com `entry_at` no intervalo (inclusivo nas extremidades via query). */
export async function sumRealizedMinutesBetween(
  pool: pg.Pool,
  from: Date,
  to: Date,
): Promise<number> {
  const r = await pool.query<{ s: string | null }>(
    `
    SELECT COALESCE(SUM(minutes), 0)::text AS s
    FROM conveyor_time_entries
    WHERE deleted_at IS NULL
      AND entry_at >= $1::timestamptz
      AND entry_at <= $2::timestamptz
    `,
    [from, to],
  )
  return Number.parseInt(r.rows[0]?.s ?? '0', 10) || 0
}

export type CollaboratorAggRow = {
  collaborator_id: string
  full_name: string | null
  assignment_count: string
  primary_count: string
  support_count: string
  planned_minutes_steps: string
}

export async function listCollaboratorLoadAggregates(
  pool: pg.Pool,
): Promise<CollaboratorAggRow[]> {
  const r = await pool.query<CollaboratorAggRow>(
    `
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
    `,
  )
  return r.rows
}

export async function sumRealizedMinutesByCollaborator(
  pool: pg.Pool,
): Promise<Map<string, number>> {
  const r = await pool.query<{ id: string; s: string }>(
    `
    SELECT collaborator_id::text AS id, COALESCE(SUM(minutes), 0)::text AS s
    FROM conveyor_time_entries
    WHERE deleted_at IS NULL
    GROUP BY collaborator_id
    `,
  )
  const m = new Map<string, number>()
  for (const row of r.rows) {
    m.set(row.id, Number.parseInt(row.s, 10) || 0)
  }
  return m
}

export type RecentEntryRow = {
  id: string
  conveyor_id: string
  conveyor_name: string
  conveyor_node_id: string
  step_name: string
  collaborator_id: string
  collaborator_name: string | null
  minutes: number
  entry_at: Date
  notes: string | null
}

export async function listRecentTimeEntries(
  pool: pg.Pool,
  limit: number,
): Promise<RecentEntryRow[]> {
  const r = await pool.query<RecentEntryRow>(
    `
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
    `,
    [limit],
  )
  return r.rows
}

export async function countActiveConveyors(pool: pg.Pool): Promise<number> {
  const r = await pool.query<{ c: string }>(
    `
    SELECT COUNT(*)::text AS c
    FROM conveyors
    WHERE deleted_at IS NULL
      AND operational_status IS DISTINCT FROM 'CONCLUIDA'
    `,
  )
  return Number.parseInt(r.rows[0]?.c ?? '0', 10) || 0
}

export async function countCompletedInWindow(
  pool: pg.Pool,
  days: number,
): Promise<number> {
  const r = await pool.query<{ c: string }>(
    `
    SELECT COUNT(*)::text AS c
    FROM conveyors
    WHERE deleted_at IS NULL
      AND operational_status = 'CONCLUIDA'
      AND completed_at IS NOT NULL
      AND completed_at >= NOW() - ($1::int * INTERVAL '1 day')
    `,
    [days],
  )
  return Number.parseInt(r.rows[0]?.c ?? '0', 10) || 0
}
