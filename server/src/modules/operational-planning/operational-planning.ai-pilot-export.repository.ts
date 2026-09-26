/**
 * Queries de leitura do export para o piloto de sugestão via IA — uma por aba.
 * Somente SELECT; não altera nenhuma tabela.
 */
import type pg from 'pg'
import { OPERATIONAL_PLANNING_BACKLOG_EXCLUDED_CONVEYOR_STATUSES } from './operational-planning.backlog-eligibility.js'

export type AiPilotActivityDbRow = {
  activity_id: string
  name: string
  order_index: number
  operational_status: string
  planned_minutes: number | null
  planned_quantity: number | null
  conveyor_id: string
  conveyor_code: string | null
  conveyor_priority: string
  /** bigint → string no driver pg. */
  conveyor_sequence: string
}

/** STEPs pendentes / em andamento / reabertos de esteiras elegíveis ao backlog (dentro ou fora do plano). */
export async function listAiPilotActivities(pool: pg.Pool): Promise<AiPilotActivityDbRow[]> {
  const r = await pool.query<AiPilotActivityDbRow>(
    `
    WITH steps AS (
      SELECT
        step.id::text AS activity_id,
        step.name,
        step.order_index,
        step.operational_status,
        step.planned_minutes,
        step.planned_quantity,
        cv.id::text AS conveyor_id,
        cv.code AS conveyor_code,
        cv.priority AS conveyor_priority,
        ROW_NUMBER() OVER (
          PARTITION BY cv.id
          ORDER BY opt.order_index, opt.id, area.order_index, area.id, step.order_index, step.id
        ) AS conveyor_sequence
      FROM conveyor_nodes step
      INNER JOIN conveyor_nodes area
        ON area.id = step.parent_id
        AND area.node_type = 'AREA'
        AND area.deleted_at IS NULL
        AND area.is_active = TRUE
      INNER JOIN conveyor_nodes opt
        ON opt.id = area.parent_id
        AND opt.node_type = 'OPTION'
        AND opt.deleted_at IS NULL
        AND opt.is_active = TRUE
      INNER JOIN conveyors cv
        ON cv.id = step.conveyor_id
        AND cv.deleted_at IS NULL
      WHERE step.node_type = 'STEP'
        AND step.deleted_at IS NULL
        AND step.is_active = TRUE
        AND cv.operational_status <> ALL ($1::text[])
    )
    SELECT *
    FROM steps
    WHERE operational_status IN ('PENDING', 'IN_PROGRESS', 'REOPENED')
    ORDER BY conveyor_id, conveyor_sequence
    `,
    [[...OPERATIONAL_PLANNING_BACKLOG_EXCLUDED_CONVEYOR_STATUSES]],
  )
  return r.rows
}

export type AiPilotSequenceDbRow = {
  activity_id: string
  collaborator_id: string
  collaborator_name: string
  origin: 'designado_direto' | 'via_equipe' | 'responsavel_padrao'
  sequence_position: string
}

/**
 * Colaboradores elegíveis por atividade: designados diretos, membros de equipes designadas e,
 * quando a atividade não tem nenhuma designação, o responsável padrão do STEP.
 * Posição = ordem da designação (`order_index`), desempatando por direto > equipe e principal.
 */
export async function listAiPilotSequences(
  pool: pg.Pool,
  activityIds: readonly string[],
): Promise<AiPilotSequenceDbRow[]> {
  if (activityIds.length === 0) return []
  const r = await pool.query<AiPilotSequenceDbRow>(
    `
    WITH candidates AS (
      SELECT
        cna.conveyor_node_id AS activity_id,
        cna.collaborator_id,
        'designado_direto' AS origin,
        0 AS origin_rank,
        cna.order_index,
        CASE WHEN cna.is_primary THEN 0 ELSE 1 END AS primary_rank
      FROM conveyor_node_assignees cna
      WHERE cna.deleted_at IS NULL
        AND cna.assignment_type = 'COLLABORATOR'
        AND cna.collaborator_id IS NOT NULL
        AND cna.conveyor_node_id = ANY ($1::uuid[])
      UNION ALL
      SELECT
        cna.conveyor_node_id,
        tm.collaborator_id,
        'via_equipe',
        1,
        cna.order_index,
        CASE WHEN tm.is_primary THEN 0 ELSE 1 END
      FROM conveyor_node_assignees cna
      INNER JOIN teams t ON t.id = cna.team_id AND t.deleted_at IS NULL
      INNER JOIN team_members tm ON tm.team_id = cna.team_id AND tm.is_active = TRUE
      WHERE cna.deleted_at IS NULL
        AND cna.assignment_type = 'TEAM'
        AND cna.conveyor_node_id = ANY ($1::uuid[])
      UNION ALL
      SELECT step.id, step.default_responsible_id, 'responsavel_padrao', 2, 0, 0
      FROM conveyor_nodes step
      WHERE step.id = ANY ($1::uuid[])
        AND step.default_responsible_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM conveyor_node_assignees x
          WHERE x.conveyor_node_id = step.id AND x.deleted_at IS NULL
        )
    ),
    dedup AS (
      SELECT DISTINCT ON (activity_id, collaborator_id) *
      FROM candidates
      ORDER BY activity_id, collaborator_id, order_index, origin_rank, primary_rank
    )
    SELECT
      d.activity_id::text AS activity_id,
      d.collaborator_id::text AS collaborator_id,
      c.full_name AS collaborator_name,
      d.origin,
      (ROW_NUMBER() OVER w)::text AS sequence_position
    FROM dedup d
    INNER JOIN collaborators c
      ON c.id = d.collaborator_id
      AND c.deleted_at IS NULL
      AND c.status = 'ACTIVE'
    WINDOW w AS (
      PARTITION BY d.activity_id
      ORDER BY d.order_index, d.origin_rank, d.primary_rank, c.full_name, d.collaborator_id
    )
    ORDER BY d.activity_id, ROW_NUMBER() OVER w
    `,
    [activityIds],
  )
  return r.rows
}

export type AiPilotCollaboratorDbRow = { id: string; full_name: string }

/** Colaboradores ativos + quaisquer outros que já tenham alocação no período (`extraIds`). */
export async function listAiPilotCapacityCollaborators(
  pool: pg.Pool,
  extraIds: readonly string[],
): Promise<AiPilotCollaboratorDbRow[]> {
  const r = await pool.query<AiPilotCollaboratorDbRow>(
    `
    SELECT id::text AS id, full_name
    FROM collaborators
    WHERE (deleted_at IS NULL AND status = 'ACTIVE')
       OR id = ANY ($1::uuid[])
    ORDER BY full_name, id
    `,
    [extraIds],
  )
  return r.rows
}

/** Filtro comum às duas queries de alocação: itens ativos de planos PUBLICADOS no intervalo. */
const PUBLISHED_ITEMS_FROM = `
  FROM operational_work_plan_items owpi
  INNER JOIN operational_work_plans owp
    ON owp.id = owpi.work_plan_id
    AND owp.deleted_at IS NULL
    AND owp.status = 'PUBLISHED'
  WHERE owpi.deleted_at IS NULL
    AND owpi.status <> 'CANCELLED'
    AND owpi.planned_date BETWEEN $1::date AND $2::date
`

export type AiPilotFixedAllocationDbRow = {
  activity_id: string
  collaborator_id: string | null
  planned_date: string
  duration_minutes: number
}

export async function listAiPilotFixedAllocations(
  pool: pg.Pool,
  startDate: string,
  endDate: string,
): Promise<AiPilotFixedAllocationDbRow[]> {
  const r = await pool.query<AiPilotFixedAllocationDbRow>(
    `
    SELECT
      owpi.activity_node_id::text AS activity_id,
      owpi.assigned_collaborator_id::text AS collaborator_id,
      to_char(owpi.planned_date, 'YYYY-MM-DD') AS planned_date,
      COALESCE(owpi.planned_minutes, 0)::int AS duration_minutes
    ${PUBLISHED_ITEMS_FROM}
    ORDER BY owpi.planned_date, owpi.assigned_collaborator_id NULLS LAST, owpi.planned_order, owpi.id
    `,
    [startDate, endDate],
  )
  return r.rows
}

export type AiPilotAllocatedMinutesDbRow = {
  collaborator_id: string
  planned_date: string
  allocated_minutes: string
}

/** SOMA dos minutos já alocados por colaborador × dia (mesmo filtro de AlocacoesFixas). */
export async function sumAiPilotAllocatedMinutesByCollaboratorDay(
  pool: pg.Pool,
  startDate: string,
  endDate: string,
): Promise<AiPilotAllocatedMinutesDbRow[]> {
  const r = await pool.query<AiPilotAllocatedMinutesDbRow>(
    `
    SELECT
      owpi.assigned_collaborator_id::text AS collaborator_id,
      to_char(owpi.planned_date, 'YYYY-MM-DD') AS planned_date,
      SUM(COALESCE(owpi.planned_minutes, 0))::text AS allocated_minutes
    ${PUBLISHED_ITEMS_FROM}
      AND owpi.assigned_collaborator_id IS NOT NULL
    GROUP BY owpi.assigned_collaborator_id, owpi.planned_date
    `,
    [startDate, endDate],
  )
  return r.rows
}
