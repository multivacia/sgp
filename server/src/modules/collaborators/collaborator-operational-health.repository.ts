import type pg from 'pg'

export type OpenAssignmentAggRow = {
  open_distinct_steps: string
  planned_open_sum: string
  realized_open_sum: string
  pending_open_sum: string
  primary_step_count: string
  support_step_count: string
  team_linked_step_count: string
  collaborator_direct_step_count: string
}

/**
 * STEPs «abertos» para o colaborador: alocação COLLABORATOR direta ou TEAM onde é membro ativo.
 * Exclui `operational_status = 'COMPLETED'` (conclusão explícita de STEP).
 */
export async function aggregateOpenAssignmentsForCollaborator(
  pool: pg.Pool,
  collaboratorId: string,
): Promise<OpenAssignmentAggRow> {
  const r = await pool.query<OpenAssignmentAggRow>(
    `
    WITH matched AS (
      SELECT
        step.id AS step_id,
        step.planned_minutes,
        cna.is_primary,
        cna.assignment_type::text AS assignment_type
      FROM conveyor_node_assignees cna
      INNER JOIN conveyor_nodes step
        ON step.id = cna.conveyor_node_id
        AND step.deleted_at IS NULL
        AND step.is_active = TRUE
        AND step.node_type = 'STEP'
      INNER JOIN conveyors cv
        ON cv.id = cna.conveyor_id
        AND cv.deleted_at IS NULL
      WHERE cna.deleted_at IS NULL
        AND (step.operational_status IS DISTINCT FROM 'COMPLETED')
        AND (
          (cna.assignment_type = 'COLLABORATOR' AND cna.collaborator_id = $1::uuid)
          OR (
            cna.assignment_type = 'TEAM'
            AND EXISTS (
              SELECT 1
              FROM team_members tm
              WHERE tm.team_id = cna.team_id
                AND tm.collaborator_id = $1::uuid
                AND tm.is_active = TRUE
            )
          )
        )
    ),
    per_step AS (
      SELECT
        step_id,
        MAX(COALESCE(planned_minutes, 0))::bigint AS planned_minutes,
        MAX(
          CASE
            WHEN assignment_type = 'COLLABORATOR' AND is_primary THEN 1
            ELSE 0
          END
        )::int AS has_primary_collab,
        MAX(
          CASE
            WHEN assignment_type = 'COLLABORATOR' AND NOT is_primary THEN 1
            ELSE 0
          END
        )::int AS has_support_collab,
        MAX(CASE WHEN assignment_type = 'TEAM' THEN 1 ELSE 0 END)::int AS has_team
      FROM matched
      GROUP BY step_id
    ),
    per_step_realized AS (
      SELECT
        ps.step_id,
        ps.planned_minutes,
        ps.has_primary_collab,
        ps.has_support_collab,
        ps.has_team,
        COALESCE(
          (
            SELECT SUM(cte.minutes)::bigint
            FROM conveyor_time_entries cte
            WHERE cte.deleted_at IS NULL
              AND cte.conveyor_node_id = ps.step_id
              AND cte.collaborator_id = $1::uuid
          ),
          0
        ) AS realized_by_collaborator
      FROM per_step ps
    )
    SELECT
      COUNT(*)::text AS open_distinct_steps,
      COALESCE(SUM(planned_minutes), 0)::text AS planned_open_sum,
      COALESCE(SUM(realized_by_collaborator), 0)::text AS realized_open_sum,
      COALESCE(
        SUM(GREATEST(0::bigint, planned_minutes - realized_by_collaborator)),
        0
      )::text AS pending_open_sum,
      SUM(CASE WHEN has_primary_collab = 1 THEN 1 ELSE 0 END)::text AS primary_step_count,
      SUM(
        CASE
          WHEN has_support_collab = 1 AND has_primary_collab = 0 THEN 1
          ELSE 0
        END
      )::text AS support_step_count,
      SUM(CASE WHEN has_team = 1 THEN 1 ELSE 0 END)::text AS team_linked_step_count,
      SUM(
        CASE
          WHEN has_primary_collab = 1 OR has_support_collab = 1 THEN 1
          ELSE 0
        END
      )::text AS collaborator_direct_step_count
    FROM per_step_realized
    `,
    [collaboratorId],
  )
  const row = r.rows[0]
  if (!row) {
    return {
      open_distinct_steps: '0',
      planned_open_sum: '0',
      realized_open_sum: '0',
      pending_open_sum: '0',
      primary_step_count: '0',
      support_step_count: '0',
      team_linked_step_count: '0',
      collaborator_direct_step_count: '0',
    }
  }
  return row
}

export type TimeEntryWindowAggRow = {
  total_minutes: string
  entry_count: string
  last_entry_at: Date | null
}

export async function aggregateTimeEntriesForCollaboratorWindow(
  pool: pg.Pool,
  collaboratorId: string,
  fromInclusive: Date,
  toExclusive: Date,
): Promise<TimeEntryWindowAggRow> {
  const r = await pool.query<TimeEntryWindowAggRow>(
    `
    SELECT
      COALESCE(SUM(minutes), 0)::text AS total_minutes,
      COUNT(*)::text AS entry_count,
      MAX(entry_at) AS last_entry_at
    FROM conveyor_time_entries
    WHERE deleted_at IS NULL
      AND collaborator_id = $1::uuid
      AND entry_at >= $2::timestamptz
      AND entry_at < $3::timestamptz
    `,
    [collaboratorId, fromInclusive, toExclusive],
  )
  const row = r.rows[0]
  return {
    total_minutes: row?.total_minutes ?? '0',
    entry_count: row?.entry_count ?? '0',
    last_entry_at: row?.last_entry_at ?? null,
  }
}
