import type pg from 'pg'
import { OPERATIONAL_TIMEZONE } from '../../shared/operationalWorkDate.js'

export type CollaboratorBriefRow = {
  id: string
  full_name: string | null
}

/**
 * Fichas mínimas dos colaboradores do escopo (1..N). Mantém `deleted_at IS NULL`;
 * ids inexistentes simplesmente não voltam (o serviço decide o erro).
 */
export async function listCollaboratorBriefs(
  pool: pg.Pool,
  collaboratorIds: string[],
): Promise<CollaboratorBriefRow[]> {
  const r = await pool.query<CollaboratorBriefRow>(
    `
    SELECT c.id::text, c.full_name
    FROM collaborators c
    WHERE c.id = ANY($1::uuid[]) AND c.deleted_at IS NULL
    `,
    [collaboratorIds],
  )
  return r.rows
}

export async function sumRealizedMinutesTotalForCollaborators(
  pool: pg.Pool,
  collaboratorIds: string[],
  conveyorId: string | null,
): Promise<number> {
  const r = await pool.query<{ s: string | null }>(
    `
    SELECT COALESCE(SUM(minutes), 0)::text AS s
    FROM conveyor_time_entries
    WHERE deleted_at IS NULL
      AND collaborator_id = ANY($1::uuid[])
      AND ($2::uuid IS NULL OR conveyor_id = $2::uuid)
    `,
    [collaboratorIds, conveyorId],
  )
  return Number.parseInt(r.rows[0]?.s ?? '0', 10) || 0
}

export async function sumRealizedMinutesInPeriodForCollaborators(
  pool: pg.Pool,
  args: {
    collaboratorIds: string[]
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
      AND collaborator_id = ANY($1::uuid[])
      AND entry_at >= $2::timestamptz
      AND entry_at <= $3::timestamptz
      AND ($4::uuid IS NULL OR conveyor_id = $4::uuid)
    `,
    [args.collaboratorIds, args.from, args.to, args.conveyorId],
  )
  return Number.parseInt(r.rows[0]?.s ?? '0', 10) || 0
}

export type TimeEntryHistoryRow = {
  id: string
  collaborator_id: string
  collaborator_name: string | null
  conveyor_id: string
  conveyor_name: string
  conveyor_node_id: string
  step_name: string
  minutes: number
  entry_at: Date
  notes: string | null
  entry_origin: 'ASSIGNED' | 'UNASSIGNED_EXCEPTION'
  exception_justification: string | null
  is_out_of_sequence: boolean
  out_of_sequence_justification: string | null
}

export type ExtraTimeEntriesSummaryRow = {
  total_minutes: string
  entries_count: string
}

export type ExtraTimeEntryTopDescriptionRow = {
  description_id: string
  description: string
  total_minutes: string
  entries_count: string
}

/**
 * Histórico recente do escopo: uma linha por apontamento (sem duplicidade entre
 * colaboradores, já que cada lançamento pertence a um único colaborador). O `limit`
 * é aplicado ao conjunto consolidado, ordenado do mais recente para o mais antigo.
 */
export async function listTimeEntriesForCollaboratorsInPeriod(
  pool: pg.Pool,
  args: {
    collaboratorIds: string[]
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
      cte.collaborator_id::text AS collaborator_id,
      col.full_name AS collaborator_name,
      cte.conveyor_id::text,
      cv.name AS conveyor_name,
      cte.conveyor_node_id::text,
      step.name AS step_name,
      cte.minutes,
      cte.entry_at,
      cte.notes,
      cte.entry_origin,
      cte.exception_justification,
      cte.is_out_of_sequence,
      cte.out_of_sequence_justification
    FROM conveyor_time_entries cte
    INNER JOIN conveyors cv ON cv.id = cte.conveyor_id AND cv.deleted_at IS NULL
    INNER JOIN conveyor_nodes step
      ON step.id = cte.conveyor_node_id AND step.deleted_at IS NULL
    LEFT JOIN collaborators col ON col.id = cte.collaborator_id
    WHERE cte.deleted_at IS NULL
      AND cte.collaborator_id = ANY($1::uuid[])
      AND cte.entry_at >= $2::timestamptz
      AND cte.entry_at <= $3::timestamptz
      AND ($4::uuid IS NULL OR cte.conveyor_id = $4::uuid)
    ORDER BY cte.entry_at DESC, cte.created_at DESC
    LIMIT $5
    `,
    [args.collaboratorIds, args.from, args.to, args.conveyorId, args.limit],
  )
  return r.rows
}

export async function summarizeExtraTimeEntriesInPeriodForCollaborators(
  pool: pg.Pool,
  args: {
    collaboratorIds: string[]
    from: Date
    to: Date
  },
): Promise<{ totalMinutes: number; entriesCount: number }> {
  const r = await pool.query<ExtraTimeEntriesSummaryRow>(
    `
    SELECT
      COALESCE(SUM(e.minutes), 0)::text AS total_minutes,
      COUNT(*)::text AS entries_count
    FROM operational_extra_time_entries e
    INNER JOIN operational_extra_time_entry_descriptions d
      ON d.id = e.description_id
     AND d.deleted_at IS NULL
    WHERE e.collaborator_id = ANY($1::uuid[])
      AND e.deleted_at IS NULL
      AND e.entry_date >= ($2::timestamptz AT TIME ZONE '${OPERATIONAL_TIMEZONE}')::date
      AND e.entry_date <= ($3::timestamptz AT TIME ZONE '${OPERATIONAL_TIMEZONE}')::date
    `,
    [args.collaboratorIds, args.from, args.to],
  )
  const row = r.rows[0]
  return {
    totalMinutes: Number.parseInt(row?.total_minutes ?? '0', 10) || 0,
    entriesCount: Number.parseInt(row?.entries_count ?? '0', 10) || 0,
  }
}

/**
 * Top descrições de apontamento extra do escopo consolidado: agrupa por descrição
 * somando todos os colaboradores selecionados antes de ordenar (nunca um top por
 * colaborador concatenado).
 */
export async function listTopExtraTimeEntryDescriptionsInPeriodForCollaborators(
  pool: pg.Pool,
  args: {
    collaboratorIds: string[]
    from: Date
    to: Date
    limit: number
  },
): Promise<
  Array<{
    descriptionId: string
    description: string
    totalMinutes: number
    entriesCount: number
  }>
> {
  const r = await pool.query<ExtraTimeEntryTopDescriptionRow>(
    `
    SELECT
      e.description_id::text AS description_id,
      d.description,
      COALESCE(SUM(e.minutes), 0)::text AS total_minutes,
      COUNT(*)::text AS entries_count
    FROM operational_extra_time_entries e
    INNER JOIN operational_extra_time_entry_descriptions d
      ON d.id = e.description_id
     AND d.deleted_at IS NULL
    WHERE e.collaborator_id = ANY($1::uuid[])
      AND e.deleted_at IS NULL
      AND e.entry_date >= ($2::timestamptz AT TIME ZONE '${OPERATIONAL_TIMEZONE}')::date
      AND e.entry_date <= ($3::timestamptz AT TIME ZONE '${OPERATIONAL_TIMEZONE}')::date
    GROUP BY e.description_id, d.description
    ORDER BY SUM(e.minutes) DESC, COUNT(*) DESC, d.description ASC
    LIMIT $4::int
    `,
    [args.collaboratorIds, args.from, args.to, args.limit],
  )
  return r.rows.map((row) => ({
    descriptionId: row.description_id,
    description: row.description,
    totalMinutes: Number.parseInt(row.total_minutes, 10) || 0,
    entriesCount: Number.parseInt(row.entries_count, 10) || 0,
  }))
}
