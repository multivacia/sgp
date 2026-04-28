import type pg from 'pg'
import {
  DEFAULT_RECENT_ACTIVITY_LIMIT,
  RECENT_ACTIVITY_NOTE_PREVIEW_MAX_CHARS,
  type ConveyorHealthAnalysisV1,
  type PeopleExecutionSummaryRowV1,
  type RecentActivityV1,
  type RecentActivityEntryV1,
  type TeamExecutionSummaryRowV1,
} from './conveyor-health.argos-types.js'

export type ConveyorHealthSnapshotSummary = {
  totalOptions: number
  totalAreas: number
  totalSteps: number
  totalPlannedMinutes: number
  totalRealizedMinutes: number
  dataQuality: Record<string, unknown>
  peopleCount: number
  teamsCount: number
  recentActivityCount: number
}

export type PersistConveyorHealthAnalysisInput = {
  conveyorId: string
  requestId: string
  correlationId: string
  policy: string
  routeUsed?: string
  llmUsed?: boolean
  healthStatus?: string
  score?: number
  riskLevel?: string
  analysis: ConveyorHealthAnalysisV1
  snapshotSummary?: ConveyorHealthSnapshotSummary
  createdBy?: string | null
}

export type PersistedConveyorHealthAnalysisMeta = {
  analysisId: string
  createdAt: string
}

export type LatestConveyorHealthAnalysisRecord = {
  analysisId: string
  createdAt: string
  requestId: string
  correlationId: string
  routeUsed?: string
  llmUsed?: boolean
  analysis: ConveyorHealthAnalysisV1
}

export type ConveyorHealthHistoryRecord = {
  analysisId: string
  createdAt: string
  requestId: string
  correlationId: string
  policy: string
  routeUsed?: string
  llmUsed?: boolean
  healthStatus?: string
  score?: number
  riskLevel?: string
  analysis: ConveyorHealthAnalysisV1
}

export type ConveyorHealthSummaryRow = {
  conveyorId: string
  analysisId: string
  createdAt: string
  healthStatus?: string
  score?: number
  riskLevel?: string
  routeUsed?: string
  llmUsed?: boolean
}

export type TeamExecutionAggDbRow = {
  team_id: string
  team_name: string | null
  step_id: string
  planned_minutes: number
  step_realized: number
}

/** Expõe truncagem para testes unitários sem DB. */
export function truncateNoteForRecentActivity(
  notes: string | null | undefined,
  maxChars = RECENT_ACTIVITY_NOTE_PREVIEW_MAX_CHARS,
): { preview: string | null; truncated: boolean } {
  if (notes == null || notes.trim() === '') return { preview: null, truncated: false }
  const t = notes.trim()
  if (t.length <= maxChars) return { preview: t, truncated: false }
  return { preview: t.slice(0, maxChars), truncated: true }
}

/**
 * Agrupa linhas team×step (minutos realizados já são o total do STEP).
 * Semântica: inferência por alocação — ver `TeamExecutionSummaryRowV1`.
 */
export function rollupTeamExecutionFromAssignmentRows(
  rows: TeamExecutionAggDbRow[],
): TeamExecutionSummaryRowV1[] {
  type Acc = {
    teamName: string | null
    steps: Map<string, { planned: number; realized: number }>
  }
  const byTeam = new Map<string, Acc>()
  for (const r of rows) {
    let acc = byTeam.get(r.team_id)
    if (!acc) {
      acc = { teamName: r.team_name, steps: new Map() }
      byTeam.set(r.team_id, acc)
    }
    if (!acc.steps.has(r.step_id)) {
      acc.steps.set(r.step_id, {
        planned: Math.max(0, Number(r.planned_minutes) || 0),
        realized: Math.max(0, Number(r.step_realized) || 0),
      })
    }
    acc.teamName = acc.teamName ?? r.team_name
  }

  const out: TeamExecutionSummaryRowV1[] = []
  for (const [teamId, acc] of byTeam) {
    let plannedSum = 0
    let realizedSum = 0
    for (const [, s] of acc.steps) {
      plannedSum += s.planned
      realizedSum += s.realized
    }
    out.push({
      teamId,
      teamName: acc.teamName ?? '(sem nome)',
      assignedSteps: acc.steps.size,
      plannedMinutes: plannedSum,
      realizedMinutes: realizedSum,
      pendingMinutes: Math.max(0, plannedSum - realizedSum),
      completionRatio: plannedSum > 0 ? Math.max(0, Math.min(1, realizedSum / plannedSum)) : null,
    })
  }
  out.sort((a, b) =>
    b.realizedMinutes !== a.realizedMinutes
      ? b.realizedMinutes - a.realizedMinutes
      : a.teamId.localeCompare(b.teamId),
  )
  return out
}

async function loadAssignedStepsByCollaborator(
  pool: pg.Pool,
  conveyorId: string,
): Promise<Map<string, number>> {
  const r = await pool.query<{ collaborator_id: string; n: string }>(
    `
    SELECT collaborator_id::text, COUNT(DISTINCT conveyor_node_id)::text AS n
    FROM conveyor_node_assignees
    WHERE conveyor_id = $1::uuid
      AND deleted_at IS NULL
      AND assignment_type = 'COLLABORATOR'
      AND collaborator_id IS NOT NULL
    GROUP BY collaborator_id
    `,
    [conveyorId],
  )
  const m = new Map<string, number>()
  for (const row of r.rows) {
    m.set(row.collaborator_id, Number.parseInt(row.n, 10) || 0)
  }
  return m
}

async function loadPrimaryStepsByCollaborator(
  pool: pg.Pool,
  conveyorId: string,
): Promise<Map<string, number>> {
  const r = await pool.query<{ collaborator_id: string; n: string }>(
    `
    SELECT collaborator_id::text, COUNT(*)::text AS n
    FROM conveyor_node_assignees
    WHERE conveyor_id = $1::uuid
      AND deleted_at IS NULL
      AND assignment_type = 'COLLABORATOR'
      AND collaborator_id IS NOT NULL
      AND is_primary = TRUE
    GROUP BY collaborator_id
    `,
    [conveyorId],
  )
  const m = new Map<string, number>()
  for (const row of r.rows) {
    m.set(row.collaborator_id, Number.parseInt(row.n, 10) || 0)
  }
  return m
}

export async function listPeopleExecutionSummaryForConveyor(
  pool: pg.Pool,
  conveyorId: string,
): Promise<PeopleExecutionSummaryRowV1[]> {
  const [r, assignedMap, primaryMap] = await Promise.all([
    pool.query<{
      collaborator_id: string
      collaborator_name: string | null
      total_realized_minutes: string
      entries_count: string
      last_entry_at: Date | null
    }>(
      `
      SELECT
        cte.collaborator_id::text AS collaborator_id,
        MAX(col.full_name) AS collaborator_name,
        SUM(cte.minutes)::text AS total_realized_minutes,
        COUNT(*)::text AS entries_count,
        MAX(cte.entry_at) AS last_entry_at
      FROM conveyor_time_entries cte
      LEFT JOIN collaborators col ON col.id = cte.collaborator_id AND col.deleted_at IS NULL
      WHERE cte.conveyor_id = $1::uuid
        AND cte.deleted_at IS NULL
      GROUP BY cte.collaborator_id
      ORDER BY SUM(cte.minutes) DESC
      `,
      [conveyorId],
    ),
    loadAssignedStepsByCollaborator(pool, conveyorId),
    loadPrimaryStepsByCollaborator(pool, conveyorId),
  ])

  return r.rows.map((row) => ({
    collaboratorId: row.collaborator_id,
    collaboratorName: row.collaborator_name ?? '(sem nome)',
    assignedSteps: assignedMap.get(row.collaborator_id) ?? 0,
    primarySteps: primaryMap.get(row.collaborator_id) ?? 0,
    plannedMinutes: 0,
    realizedMinutes: Number.parseInt(row.total_realized_minutes, 10) || 0,
    pendingMinutes: 0,
    completionRatio: null,
  }))
}

export async function listTeamExecutionSummaryForConveyor(
  pool: pg.Pool,
  conveyorId: string,
): Promise<TeamExecutionSummaryRowV1[]> {
  const r = await pool.query<{
    team_id: string
    team_name: string | null
    step_id: string
    planned_minutes: string | null
    step_realized: string | null
  }>(
    `
    WITH step_realized AS (
      SELECT conveyor_node_id AS step_id, SUM(minutes)::text AS realized
      FROM conveyor_time_entries
      WHERE conveyor_id = $1::uuid
        AND deleted_at IS NULL
      GROUP BY conveyor_node_id
    )
    SELECT
      cna.team_id::text AS team_id,
      t.name AS team_name,
      cna.conveyor_node_id::text AS step_id,
      cn.planned_minutes::text AS planned_minutes,
      COALESCE(sr.realized, '0') AS step_realized
    FROM conveyor_node_assignees cna
    INNER JOIN teams t ON t.id = cna.team_id AND t.deleted_at IS NULL
    INNER JOIN conveyor_nodes cn
      ON cn.id = cna.conveyor_node_id
      AND cn.conveyor_id = $1::uuid
      AND cn.node_type = 'STEP'
      AND cn.deleted_at IS NULL
    LEFT JOIN step_realized sr ON sr.step_id = cna.conveyor_node_id
    WHERE cna.conveyor_id = $1::uuid
      AND cna.deleted_at IS NULL
      AND cna.assignment_type = 'TEAM'
      AND cna.team_id IS NOT NULL
    `,
    [conveyorId],
  )

  const rows: TeamExecutionAggDbRow[] = r.rows.map((row) => ({
    team_id: row.team_id,
    team_name: row.team_name,
    step_id: row.step_id,
    planned_minutes:
      row.planned_minutes == null || row.planned_minutes === ''
        ? 0
        : Number(row.planned_minutes),
    step_realized:
      row.step_realized == null || row.step_realized === ''
        ? 0
        : Number.parseInt(row.step_realized, 10) || 0,
  }))

  return rollupTeamExecutionFromAssignmentRows(rows)
}

export async function listRecentActivityForConveyor(
  pool: pg.Pool,
  conveyorId: string,
  limit: number = DEFAULT_RECENT_ACTIVITY_LIMIT,
): Promise<RecentActivityV1> {
  const lim = Math.min(Math.max(1, Math.floor(limit)), 500)
  const r = await pool.query<{
    id: string
    conveyor_node_id: string
    step_name: string | null
    collaborator_id: string
    collaborator_name: string | null
    minutes: string | number
    entry_at: Date
    created_at: Date
    notes: string | null
    entry_mode: string
  }>(
    `
    SELECT
      cte.id::text AS id,
      cte.conveyor_node_id::text AS conveyor_node_id,
      step.name AS step_name,
      cte.collaborator_id::text AS collaborator_id,
      col.full_name AS collaborator_name,
      cte.minutes,
      cte.entry_at,
      cte.created_at,
      cte.notes,
      cte.entry_mode
    FROM conveyor_time_entries cte
    INNER JOIN conveyor_nodes step
      ON step.id = cte.conveyor_node_id
      AND step.deleted_at IS NULL
    LEFT JOIN collaborators col ON col.id = cte.collaborator_id AND col.deleted_at IS NULL
    WHERE cte.conveyor_id = $1::uuid
      AND cte.deleted_at IS NULL
    ORDER BY cte.entry_at DESC, cte.created_at DESC
    LIMIT $2
    `,
    [conveyorId, lim],
  )

  const timeEntries: RecentActivityEntryV1[] = r.rows.map((row) => {
    const { preview, truncated } = truncateNoteForRecentActivity(row.notes)
    const mins =
      typeof row.minutes === 'number' ? row.minutes : Number.parseInt(String(row.minutes), 10) || 0
    return {
      id: row.id,
      stepId: row.conveyor_node_id,
      stepName: row.step_name ?? '(sem etapa)',
      collaboratorId: row.collaborator_id,
      collaboratorName: row.collaborator_name ?? '(sem colaborador)',
      minutes: mins,
      entryDate: new Date(row.entry_at).toISOString(),
      note: truncated ? preview : row.notes,
    }
  })
  return {
    lastTimeEntryAt: timeEntries[0]?.entryDate ?? null,
    timeEntries,
  }
}

export async function insertConveyorHealthAnalysis(
  pool: pg.Pool,
  input: PersistConveyorHealthAnalysisInput,
): Promise<PersistedConveyorHealthAnalysisMeta> {
  const r = await pool.query<{ id: string; created_at: Date }>(
    `
    INSERT INTO conveyor_health_analyses (
      conveyor_id,
      request_id,
      correlation_id,
      policy,
      route_used,
      llm_used,
      health_status,
      score,
      risk_level,
      analysis_json,
      snapshot_summary_json,
      created_by
    ) VALUES (
      $1::uuid,
      $2::uuid,
      $3::uuid,
      $4::varchar(20),
      NULLIF($5::text, ''),
      $6::boolean,
      NULLIF($7::text, ''),
      $8::numeric,
      NULLIF($9::text, ''),
      $10::jsonb,
      $11::jsonb,
      $12::uuid
    )
    RETURNING id::text, created_at
    `,
    [
      input.conveyorId,
      input.requestId,
      input.correlationId,
      input.policy,
      input.routeUsed ?? null,
      input.llmUsed ?? null,
      input.healthStatus ?? null,
      input.score ?? null,
      input.riskLevel ?? null,
      JSON.stringify(input.analysis),
      input.snapshotSummary ? JSON.stringify(input.snapshotSummary) : null,
      input.createdBy ?? null,
    ],
  )
  const row = r.rows[0]!
  return {
    analysisId: row.id,
    createdAt: new Date(row.created_at).toISOString(),
  }
}

export async function getLatestConveyorHealthAnalysis(
  pool: pg.Pool,
  conveyorId: string,
): Promise<LatestConveyorHealthAnalysisRecord | null> {
  const r = await pool.query<{
    id: string
    created_at: Date
    request_id: string
    correlation_id: string
    route_used: string | null
    llm_used: boolean | null
    analysis_json: unknown
  }>(
    `
    SELECT
      id::text AS id,
      created_at,
      request_id::text AS request_id,
      correlation_id::text AS correlation_id,
      route_used,
      llm_used,
      analysis_json
    FROM conveyor_health_analyses
    WHERE conveyor_id = $1::uuid
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [conveyorId],
  )
  const row = r.rows[0]
  if (!row) return null
  return {
    analysisId: row.id,
    createdAt: new Date(row.created_at).toISOString(),
    requestId: row.request_id,
    correlationId: row.correlation_id,
    routeUsed: row.route_used ?? undefined,
    llmUsed: row.llm_used ?? undefined,
    analysis: (row.analysis_json ?? {}) as ConveyorHealthAnalysisV1,
  }
}

export async function listConveyorHealthAnalyses(
  pool: pg.Pool,
  conveyorId: string,
  options?: { limit?: number },
): Promise<ConveyorHealthHistoryRecord[]> {
  const limit = Math.min(Math.max(1, Math.floor(options?.limit ?? 10)), 50)
  const r = await pool.query<{
    id: string
    created_at: Date
    request_id: string
    correlation_id: string
    policy: string
    route_used: string | null
    llm_used: boolean | null
    health_status: string | null
    score: string | number | null
    risk_level: string | null
    analysis_json: unknown
  }>(
    `
    SELECT
      id::text AS id,
      created_at,
      request_id::text AS request_id,
      correlation_id::text AS correlation_id,
      policy,
      route_used,
      llm_used,
      health_status,
      score,
      risk_level,
      analysis_json
    FROM conveyor_health_analyses
    WHERE conveyor_id = $1::uuid
    ORDER BY created_at DESC
    LIMIT $2
    `,
    [conveyorId, limit + 1],
  )
  return r.rows.map((row) => ({
    analysisId: row.id,
    createdAt: new Date(row.created_at).toISOString(),
    requestId: row.request_id,
    correlationId: row.correlation_id,
    policy: row.policy,
    routeUsed: row.route_used ?? undefined,
    llmUsed: row.llm_used ?? undefined,
    healthStatus: row.health_status ?? undefined,
    score:
      row.score == null ? undefined : typeof row.score === 'number' ? row.score : Number(row.score),
    riskLevel: row.risk_level ?? undefined,
    analysis: (row.analysis_json ?? {}) as ConveyorHealthAnalysisV1,
  }))
}

export async function listLatestConveyorHealthSummaries(
  pool: pg.Pool,
  options?: { limit?: number },
): Promise<ConveyorHealthSummaryRow[]> {
  const limit = Math.min(Math.max(1, Math.floor(options?.limit ?? 100)), 500)
  const r = await pool.query<{
    conveyor_id: string
    id: string
    created_at: Date
    health_status: string | null
    score: string | number | null
    risk_level: string | null
    route_used: string | null
    llm_used: boolean | null
  }>(
    `
    SELECT DISTINCT ON (cha.conveyor_id)
      cha.conveyor_id::text AS conveyor_id,
      cha.id::text AS id,
      cha.created_at,
      cha.health_status,
      cha.score,
      cha.risk_level,
      cha.route_used,
      cha.llm_used
    FROM conveyor_health_analyses cha
    ORDER BY cha.conveyor_id, cha.created_at DESC
    LIMIT $1
    `,
    [limit],
  )
  return r.rows
    .map((row) => ({
      conveyorId: row.conveyor_id,
      analysisId: row.id,
      createdAt: new Date(row.created_at).toISOString(),
      healthStatus: row.health_status ?? undefined,
      score:
        row.score == null ? undefined : typeof row.score === 'number' ? row.score : Number(row.score),
      riskLevel: row.risk_level ?? undefined,
      routeUsed: row.route_used ?? undefined,
      llmUsed: row.llm_used ?? undefined,
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}
