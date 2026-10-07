import type pg from 'pg'
import { OPERATIONAL_TIMEZONE } from '../../shared/operationalWorkDate.js'

export type CollaboratorBriefRow = {
  id: string
  full_name: string | null
  code: string | null
  registration_code: string | null
}

export async function findCollaboratorBrief(
  pool: pg.Pool,
  collaboratorId: string,
): Promise<CollaboratorBriefRow | null> {
  const r = await pool.query<CollaboratorBriefRow>(
    `
    SELECT c.id::text, c.full_name, c.code, c.registration_code
    FROM collaborators c
    WHERE c.id = $1::uuid AND c.deleted_at IS NULL
    `,
    [collaboratorId],
  )
  return r.rows[0] ?? null
}

/**
 * Universo de apontamentos de esteira da jornada — mesmo critério para totais
 * (período / acumulado), histórico e exportação. Esteira e STEP precisam existir
 * (não removidos), senão o total contaria lançamentos que nunca aparecem no detalhe.
 * Alias: `cte` (conveyor_time_entries), `cv` (conveyors), `step` (conveyor_nodes).
 */
function journeyTimeEntriesFromSql(extraJoins = ''): string {
  return `
    FROM conveyor_time_entries cte
    INNER JOIN conveyors cv ON cv.id = cte.conveyor_id AND cv.deleted_at IS NULL
    INNER JOIN conveyor_nodes step
      ON step.id = cte.conveyor_node_id AND step.deleted_at IS NULL
    ${extraJoins}
    WHERE cte.deleted_at IS NULL
`
}

export async function sumRealizedMinutesTotalForCollaborator(
  pool: pg.Pool,
  collaboratorId: string,
  conveyorId: string | null,
): Promise<number> {
  const r = await pool.query<{ s: string | null }>(
    `
    SELECT COALESCE(SUM(cte.minutes), 0)::text AS s
    ${journeyTimeEntriesFromSql()}
      AND cte.collaborator_id = $1::uuid
      AND ($2::uuid IS NULL OR cte.conveyor_id = $2::uuid)
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
    SELECT COALESCE(SUM(cte.minutes), 0)::text AS s
    ${journeyTimeEntriesFromSql()}
      AND cte.collaborator_id = $1::uuid
      AND cte.entry_at >= $2::timestamptz
      AND cte.entry_at <= $3::timestamptz
      AND ($4::uuid IS NULL OR cte.conveyor_id = $4::uuid)
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
  entry_origin: 'ASSIGNED' | 'UNASSIGNED_EXCEPTION'
  exception_justification: string | null
  is_out_of_sequence: boolean
  out_of_sequence_justification: string | null
  /** Snapshot da justificativa padronizada (catálogo) — inclui a justificativa voluntária. */
  standard_justification_label: string | null
  standard_justification_complement: string | null
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
      cte.notes,
      cte.entry_origin,
      cte.exception_justification,
      cte.is_out_of_sequence,
      cte.out_of_sequence_justification,
      cte.standard_justification_label_snapshot AS standard_justification_label,
      cte.standard_justification_complement AS standard_justification_complement
    ${journeyTimeEntriesFromSql()}
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

export type TimeEntryExportRow = TimeEntryHistoryRow & {
  conveyor_code: string | null
  option_name: string | null
  area_name: string | null
  executed_quantity: number | null
}

/**
 * Todos os apontamentos de esteira do colaborador no período (sem limite) —
 * mesmo universo de `sumRealizedMinutesInPeriodForCollaborator`. Uso: exportação.
 */
export async function listAllTimeEntriesForCollaboratorInPeriod(
  pool: pg.Pool,
  args: {
    collaboratorId: string
    from: Date
    to: Date
    conveyorId: string | null
  },
): Promise<TimeEntryExportRow[]> {
  const r = await pool.query<TimeEntryExportRow>(
    `
    SELECT
      cte.id::text,
      cte.conveyor_id::text,
      cv.name AS conveyor_name,
      cv.code AS conveyor_code,
      cte.conveyor_node_id::text,
      step.name AS step_name,
      area.name AS area_name,
      opt.name AS option_name,
      cte.minutes,
      cte.executed_quantity,
      cte.entry_at,
      cte.notes,
      cte.entry_origin,
      cte.exception_justification,
      cte.is_out_of_sequence,
      cte.out_of_sequence_justification,
      cte.standard_justification_label_snapshot AS standard_justification_label,
      cte.standard_justification_complement AS standard_justification_complement
    ${journeyTimeEntriesFromSql(`
    LEFT JOIN conveyor_nodes area ON area.id = step.parent_id
    LEFT JOIN conveyor_nodes opt ON opt.id = step.root_id`)}
      AND cte.collaborator_id = $1::uuid
      AND cte.entry_at >= $2::timestamptz
      AND cte.entry_at <= $3::timestamptz
      AND ($4::uuid IS NULL OR cte.conveyor_id = $4::uuid)
    ORDER BY cte.entry_at ASC, cte.created_at ASC
    `,
    [args.collaboratorId, args.from, args.to, args.conveyorId],
  )
  return r.rows
}

export type ExtraTimeEntryExportRow = {
  id: string
  entry_date: string
  minutes: number
  description: string
  notes: string | null
}

/** Lançamentos fora de esteira no período — mesmo universo de `summarizeExtraTimeEntries…`. */
export async function listExtraTimeEntriesInPeriodForCollaborator(
  pool: pg.Pool,
  args: {
    collaboratorId: string
    from: Date
    to: Date
  },
): Promise<ExtraTimeEntryExportRow[]> {
  const r = await pool.query<ExtraTimeEntryExportRow>(
    `
    SELECT
      e.id::text,
      to_char(e.entry_date, 'YYYY-MM-DD') AS entry_date,
      e.minutes,
      d.description,
      e.notes
    FROM operational_extra_time_entries e
    INNER JOIN operational_extra_time_entry_descriptions d
      ON d.id = e.description_id
    WHERE e.collaborator_id = $1::uuid
      AND e.deleted_at IS NULL
      AND e.entry_date >= ($2::timestamptz AT TIME ZONE '${OPERATIONAL_TIMEZONE}')::date
      AND e.entry_date <= ($3::timestamptz AT TIME ZONE '${OPERATIONAL_TIMEZONE}')::date
    ORDER BY e.entry_date ASC, e.created_at ASC
    `,
    [args.collaboratorId, args.from, args.to],
  )
  return r.rows
}

export async function summarizeExtraTimeEntriesInPeriodForCollaborator(
  pool: pg.Pool,
  args: {
    collaboratorId: string
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
    WHERE e.collaborator_id = $1::uuid
      AND e.deleted_at IS NULL
      AND e.entry_date >= ($2::timestamptz AT TIME ZONE '${OPERATIONAL_TIMEZONE}')::date
      AND e.entry_date <= ($3::timestamptz AT TIME ZONE '${OPERATIONAL_TIMEZONE}')::date
    `,
    [args.collaboratorId, args.from, args.to],
  )
  const row = r.rows[0]
  return {
    totalMinutes: Number.parseInt(row?.total_minutes ?? '0', 10) || 0,
    entriesCount: Number.parseInt(row?.entries_count ?? '0', 10) || 0,
  }
}

export async function listTopExtraTimeEntryDescriptionsInPeriodForCollaborator(
  pool: pg.Pool,
  args: {
    collaboratorId: string
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
    WHERE e.collaborator_id = $1::uuid
      AND e.deleted_at IS NULL
      AND e.entry_date >= ($2::timestamptz AT TIME ZONE '${OPERATIONAL_TIMEZONE}')::date
      AND e.entry_date <= ($3::timestamptz AT TIME ZONE '${OPERATIONAL_TIMEZONE}')::date
    GROUP BY e.description_id, d.description
    ORDER BY SUM(e.minutes) DESC, COUNT(*) DESC, d.description ASC
    LIMIT $4::int
    `,
    [args.collaboratorId, args.from, args.to, args.limit],
  )
  return r.rows.map((row) => ({
    descriptionId: row.description_id,
    description: row.description,
    totalMinutes: Number.parseInt(row.total_minutes, 10) || 0,
    entriesCount: Number.parseInt(row.entries_count, 10) || 0,
  }))
}

export async function findConveyorBrief(
  pool: pg.Pool,
  conveyorId: string,
): Promise<{ id: string; name: string; code: string | null } | null> {
  const r = await pool.query<{ id: string; name: string; code: string | null }>(
    `SELECT cv.id::text, cv.name, cv.code FROM conveyors cv WHERE cv.id = $1::uuid`,
    [conveyorId],
  )
  return r.rows[0] ?? null
}

/**
 * Fichas mínimas dos colaboradores do escopo (1..N). Mantém `deleted_at IS NULL`;
 * ids inexistentes simplesmente não voltam (o serviço decide o erro).
 */
export async function listCollaboratorBriefs(
  pool: pg.Pool,
  collaboratorIds: string[],
): Promise<Array<Pick<CollaboratorBriefRow, 'id' | 'full_name'>>> {
  const r = await pool.query<Pick<CollaboratorBriefRow, 'id' | 'full_name'>>(
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
    SELECT COALESCE(SUM(cte.minutes), 0)::text AS s
    ${journeyTimeEntriesFromSql()}
      AND cte.collaborator_id = ANY($1::uuid[])
      AND ($2::uuid IS NULL OR cte.conveyor_id = $2::uuid)
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
    SELECT COALESCE(SUM(cte.minutes), 0)::text AS s
    ${journeyTimeEntriesFromSql()}
      AND cte.collaborator_id = ANY($1::uuid[])
      AND cte.entry_at >= $2::timestamptz
      AND cte.entry_at <= $3::timestamptz
      AND ($4::uuid IS NULL OR cte.conveyor_id = $4::uuid)
    `,
    [args.collaboratorIds, args.from, args.to, args.conveyorId],
  )
  return Number.parseInt(r.rows[0]?.s ?? '0', 10) || 0
}

/** Linha do histórico consolidado: apontamento + colaborador a que pertence. */
export type TimeEntryMultiHistoryRow = TimeEntryHistoryRow & {
  collaborator_id: string
  collaborator_name: string | null
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
): Promise<TimeEntryMultiHistoryRow[]> {
  const r = await pool.query<TimeEntryMultiHistoryRow>(
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
      cte.out_of_sequence_justification,
      cte.standard_justification_label_snapshot AS standard_justification_label,
      cte.standard_justification_complement AS standard_justification_complement
    ${journeyTimeEntriesFromSql('LEFT JOIN collaborators col ON col.id = cte.collaborator_id')}
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

export type ExtraTimeEntryJourneyRow = {
  id: string
  collaborator_id: string
  collaborator_name: string | null
  entry_date: string
  minutes: number
  description: string
  notes: string | null
  origin: string
}

/**
 * Lançamentos Extra Esteira no período (mais recentes primeiro) — mesmo universo de
 * `summarizeExtraTimeEntriesInPeriodForCollaborators`. Descrições excluídas do catálogo
 * continuam visíveis para preservar o histórico.
 */
export async function listExtraTimeEntriesInPeriodForCollaborators(
  pool: pg.Pool,
  args: {
    collaboratorIds: string[]
    from: Date
    to: Date
    limit: number
  },
): Promise<ExtraTimeEntryJourneyRow[]> {
  const r = await pool.query<ExtraTimeEntryJourneyRow>(
    `
    SELECT
      e.id::text,
      e.collaborator_id::text AS collaborator_id,
      col.full_name AS collaborator_name,
      to_char(e.entry_date, 'YYYY-MM-DD') AS entry_date,
      e.minutes,
      d.description,
      e.notes,
      e.origin
    FROM operational_extra_time_entries e
    INNER JOIN operational_extra_time_entry_descriptions d
      ON d.id = e.description_id
    LEFT JOIN collaborators col ON col.id = e.collaborator_id
    WHERE e.collaborator_id = ANY($1::uuid[])
      AND e.deleted_at IS NULL
      AND e.entry_date >= ($2::timestamptz AT TIME ZONE '${OPERATIONAL_TIMEZONE}')::date
      AND e.entry_date <= ($3::timestamptz AT TIME ZONE '${OPERATIONAL_TIMEZONE}')::date
    ORDER BY e.entry_date DESC, e.created_at DESC
    LIMIT $4::int
    `,
    [args.collaboratorIds, args.from, args.to, args.limit],
  )
  return r.rows
}
