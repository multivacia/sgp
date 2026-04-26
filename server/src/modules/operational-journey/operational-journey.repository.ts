import type pg from 'pg'

export type CollaboratorBriefRow = {
  id: string
  full_name: string | null
}

export async function findCollaboratorBrief(
  pool: pg.Pool,
  collaboratorId: string,
): Promise<CollaboratorBriefRow | null> {
  const r = await pool.query<CollaboratorBriefRow>(
    `
    SELECT c.id::text, c.full_name
    FROM collaborators c
    WHERE c.id = $1::uuid AND c.deleted_at IS NULL
    `,
    [collaboratorId],
  )
  return r.rows[0] ?? null
}

export async function sumRealizedMinutesTotalForCollaborator(
  pool: pg.Pool,
  collaboratorId: string,
  conveyorId: string | null,
): Promise<number> {
  const r = await pool.query<{ s: string | null }>(
    `
    SELECT COALESCE(SUM(minutes), 0)::text AS s
    FROM conveyor_time_entries
    WHERE deleted_at IS NULL
      AND collaborator_id = $1::uuid
      AND ($2::uuid IS NULL OR conveyor_id = $2::uuid)
    `,
    [collaboratorId, conveyorId],
  )
  return Number.parseInt(r.rows[0]?.s ?? '0', 10) || 0
}

export async function sumRealizedMinutesInPeriodForCollaborator(
  pool: pg.Pool,
  args: {
    collaboratorId: string
    from: Date
    to: Date
    conveyorId: string | null
  },
): Promise<number> {
  const r = await pool.query<{ s: string | null }>(
    `
    SELECT COALESCE(SUM(minutes), 0)::text AS s
    FROM conveyor_time_entries
    WHERE deleted_at IS NULL
      AND collaborator_id = $1::uuid
      AND entry_at >= $2::timestamptz
      AND entry_at <= $3::timestamptz
      AND ($4::uuid IS NULL OR conveyor_id = $4::uuid)
    `,
    [args.collaboratorId, args.from, args.to, args.conveyorId],
  )
  return Number.parseInt(r.rows[0]?.s ?? '0', 10) || 0
}

export type TimeEntryHistoryRow = {
  id: string
  conveyor_id: string
  conveyor_name: string
  conveyor_node_id: string
  step_name: string
  minutes: number
  entry_at: Date
  notes: string | null
}

export async function listTimeEntriesForCollaboratorInPeriod(
  pool: pg.Pool,
  args: {
    collaboratorId: string
    from: Date
    to: Date
    conveyorId: string | null
    limit: number
  },
): Promise<TimeEntryHistoryRow[]> {
  const r = await pool.query<TimeEntryHistoryRow>(
    `
    SELECT
      cte.id::text,
      cte.conveyor_id::text,
      cv.name AS conveyor_name,
      cte.conveyor_node_id::text,
      step.name AS step_name,
      cte.minutes,
      cte.entry_at,
      cte.notes
    FROM conveyor_time_entries cte
    INNER JOIN conveyors cv ON cv.id = cte.conveyor_id AND cv.deleted_at IS NULL
    INNER JOIN conveyor_nodes step
      ON step.id = cte.conveyor_node_id AND step.deleted_at IS NULL
    WHERE cte.deleted_at IS NULL
      AND cte.collaborator_id = $1::uuid
      AND cte.entry_at >= $2::timestamptz
      AND cte.entry_at <= $3::timestamptz
      AND ($4::uuid IS NULL OR cte.conveyor_id = $4::uuid)
    ORDER BY cte.entry_at DESC, cte.created_at DESC
    LIMIT $5
    `,
    [args.collaboratorId, args.from, args.to, args.conveyorId, args.limit],
  )
  return r.rows
}
