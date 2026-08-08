import type pg from 'pg'
import { mondayOfWeekContaining } from '../operational-planning/operational-planning.week.js'
import { findPublishedWorkPlanForWeek } from '../my-work-queue/my-work-queue.repository.js'

export type MyActivityRawRow = {
  assignee_id: string
  conveyor_id: string
  conveyor_code: string | null
  conveyor_name: string
  conveyor_status: string
  estimated_deadline: string | null
  step_node_id: string
  step_name: string
  option_name: string
  area_name: string
  is_primary: boolean
  planned_minutes: string | null
  planned_quantity: string
  realized_minutes: string | null
  opt_order_index: string
  area_order_index: string
  step_order_index: string
}

export async function listActivitiesRawForCollaborator(
  pool: pg.Pool,
  collaboratorId: string,
  options?: { conveyorId?: string | null },
): Promise<MyActivityRawRow[]> {
  const conveyorId = options?.conveyorId?.trim() || null
  const r = await pool.query<MyActivityRawRow>(
    `
    SELECT
      cna.id::text AS assignee_id,
      cv.id::text AS conveyor_id,
      cv.code AS conveyor_code,
      cv.name AS conveyor_name,
      cv.operational_status::text AS conveyor_status,
      cv.estimated_deadline AS estimated_deadline,
      step.id::text AS step_node_id,
      step.name AS step_name,
      opt.name AS option_name,
      area.name AS area_name,
      cna.is_primary,
      step.planned_minutes::text AS planned_minutes,
      (
        SELECT SUM(cte.minutes)::text
        FROM conveyor_time_entries cte
        WHERE cte.deleted_at IS NULL
          AND cte.conveyor_node_id = step.id
          AND cte.collaborator_id = cna.collaborator_id
      ) AS realized_minutes,
      opt.order_index::text AS opt_order_index,
      area.order_index::text AS area_order_index,
      step.order_index::text AS step_order_index
    FROM conveyor_node_assignees cna
    INNER JOIN conveyor_nodes step
      ON step.id = cna.conveyor_node_id
      AND step.deleted_at IS NULL
      AND step.is_active = TRUE
      AND step.node_type = 'STEP'
    INNER JOIN conveyors cv
      ON cv.id = cna.conveyor_id
      AND cv.deleted_at IS NULL
    INNER JOIN conveyor_nodes area
      ON area.id = step.parent_id
      AND area.deleted_at IS NULL
      AND area.is_active = TRUE
      AND area.node_type = 'AREA'
    INNER JOIN conveyor_nodes opt
      ON opt.id = area.parent_id
      AND opt.deleted_at IS NULL
      AND opt.is_active = TRUE
      AND opt.node_type = 'OPTION'
    WHERE cna.deleted_at IS NULL
      AND cna.collaborator_id = $1::uuid
      AND ($2::uuid IS NULL OR cv.id = $2::uuid)
    ORDER BY cna.id ASC
    `,
    [collaboratorId, conveyorId],
  )
  return r.rows
}

export type TimeEntryCandidateRawRow = {
  assignee_id: string
  conveyor_id: string
  conveyor_code: string | null
  conveyor_name: string
  client_name: string | null
  vehicle_label: string | null
  plate: string | null
  step_node_id: string
  step_name: string
  area_name: string
  option_name: string
  is_primary: boolean
  assignment_type: 'COLLABORATOR' | 'TEAM'
  planned_minutes: string | null
  planned_quantity: string
  realized_minutes: string | null
  opt_order_index: string
  area_order_index: string
  step_order_index: string
  planned_date: string | null
}

/**
 * STEPs apontáveis: esteira ativa (não concluída), STEP ativo e não concluído operacionalmente;
 * alocação direta ou via time (membro ativo). Uma linha por STEP (prioriza assignee COLLABORATOR).
 */
export async function listTimeEntryCandidatesForCollaborator(
  pool: pg.Pool,
  collaboratorId: string,
  options: { q: string | null; limit: number },
): Promise<TimeEntryCandidateRawRow[]> {
  const q = options.q?.trim() || null
  const limit = options.limit
  const r = await pool.query<TimeEntryCandidateRawRow>(
    `
    WITH ranked AS (
      SELECT
        cna.id::text AS assignee_id,
        cv.id::text AS conveyor_id,
        cv.code AS conveyor_code,
        cv.name AS conveyor_name,
        cv.client_name AS client_name,
        cv.vehicle AS vehicle_label,
        cv.plate AS plate,
        step.id::text AS step_node_id,
        step.name AS step_name,
        area.name AS area_name,
        opt.name AS option_name,
        cna.is_primary,
        cna.assignment_type::text AS assignment_type,
        step.planned_minutes::text AS planned_minutes,
        step.planned_quantity::text AS planned_quantity,
        (
          SELECT COALESCE(SUM(cte.minutes), 0)::text
          FROM conveyor_time_entries cte
          WHERE cte.deleted_at IS NULL
            AND cte.conveyor_node_id = step.id
            AND cte.collaborator_id = $1::uuid
        ) AS realized_minutes,
        opt.order_index::text AS opt_order_index,
        area.order_index::text AS area_order_index,
        step.order_index::text AS step_order_index,
        NULL::text AS planned_date,
        ROW_NUMBER() OVER (
          PARTITION BY step.id
          ORDER BY
            CASE WHEN cna.assignment_type = 'COLLABORATOR' THEN 0 ELSE 1 END,
            cna.id
        ) AS rn
      FROM conveyor_node_assignees cna
      INNER JOIN conveyor_nodes step
        ON step.id = cna.conveyor_node_id
        AND step.deleted_at IS NULL
        AND step.is_active = TRUE
        AND step.node_type = 'STEP'
        AND ((step.operational_status IS DISTINCT FROM 'COMPLETED' AND step.operational_status IS DISTINCT FROM 'ABORTED'))
      INNER JOIN conveyors cv
        ON cv.id = cna.conveyor_id
        AND cv.deleted_at IS NULL
        AND cv.operational_status IN ('A_INICIAR', 'EM_ANDAMENTO')
      INNER JOIN conveyor_nodes area
        ON area.id = step.parent_id
        AND area.deleted_at IS NULL
        AND area.is_active = TRUE
        AND area.node_type = 'AREA'
      INNER JOIN conveyor_nodes opt
        ON opt.id = area.parent_id
        AND opt.deleted_at IS NULL
        AND opt.is_active = TRUE
        AND opt.node_type = 'OPTION'
      WHERE cna.deleted_at IS NULL
        AND (
          (
            cna.assignment_type = 'COLLABORATOR'
            AND cna.collaborator_id = $1::uuid
          )
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
        AND (
          $2::text IS NULL
          OR trim($2) = ''
          OR cv.name ILIKE '%' || $2 || '%'
          OR COALESCE(cv.code, '') ILIKE '%' || $2 || '%'
          OR COALESCE(cv.client_name, '') ILIKE '%' || $2 || '%'
          OR COALESCE(cv.vehicle, '') ILIKE '%' || $2 || '%'
          OR COALESCE(cv.plate, '') ILIKE '%' || $2 || '%'
          OR area.name ILIKE '%' || $2 || '%'
          OR step.name ILIKE '%' || $2 || '%'
        )
    )
    SELECT
      assignee_id,
      conveyor_id,
      conveyor_code,
      conveyor_name,
      client_name,
      vehicle_label,
      plate,
      step_node_id,
      step_name,
      area_name,
      option_name,
      is_primary,
      assignment_type,
      planned_minutes,
      planned_quantity,
      realized_minutes,
      opt_order_index,
      area_order_index,
      step_order_index,
      planned_date
    FROM ranked
    WHERE rn = 1
    ORDER BY
      opt_order_index::int,
      area_order_index::int,
      step_order_index::int
    LIMIT $3::int
    `,
    [collaboratorId, q, limit],
  )
  return r.rows
}

/**
 * STEPs em aberto nas quais o colaborador não tem alocação (direta nem via time).
 * Usado em conjunto com `listTimeEntryCandidatesForCollaborator` quando `includeUnassigned=true`.
 */
export async function listTimeEntryUnassignedOpenStepsForCollaborator(
  pool: pg.Pool,
  collaboratorId: string,
  options: { q: string | null; limit: number },
): Promise<TimeEntryCandidateRawRow[]> {
  const q = options.q?.trim() || null
  const limit = options.limit
  const r = await pool.query<TimeEntryCandidateRawRow>(
    `
    SELECT
      ''::text AS assignee_id,
      cv.id::text AS conveyor_id,
      cv.code AS conveyor_code,
      cv.name AS conveyor_name,
      cv.client_name AS client_name,
      cv.vehicle AS vehicle_label,
      cv.plate AS plate,
      step.id::text AS step_node_id,
      step.name AS step_name,
      area.name AS area_name,
      opt.name AS option_name,
      false AS is_primary,
      'COLLABORATOR'::text AS assignment_type,
      step.planned_minutes::text AS planned_minutes,
      step.planned_quantity::text AS planned_quantity,
      (
        SELECT COALESCE(SUM(cte.minutes), 0)::text
        FROM conveyor_time_entries cte
        WHERE cte.deleted_at IS NULL
          AND cte.conveyor_node_id = step.id
          AND cte.collaborator_id = $1::uuid
      ) AS realized_minutes,
      opt.order_index::text AS opt_order_index,
      area.order_index::text AS area_order_index,
      step.order_index::text AS step_order_index,
      NULL::text AS planned_date
    FROM conveyor_nodes step
    INNER JOIN conveyors cv
      ON cv.id = step.conveyor_id
      AND cv.deleted_at IS NULL
        AND cv.operational_status IN ('A_INICIAR', 'EM_ANDAMENTO')
    INNER JOIN conveyor_nodes area
      ON area.id = step.parent_id
      AND area.deleted_at IS NULL
      AND area.is_active = TRUE
      AND area.node_type = 'AREA'
    INNER JOIN conveyor_nodes opt
      ON opt.id = area.parent_id
      AND opt.deleted_at IS NULL
      AND opt.is_active = TRUE
      AND opt.node_type = 'OPTION'
    WHERE step.deleted_at IS NULL
      AND step.is_active = TRUE
      AND step.node_type = 'STEP'
      AND ((step.operational_status IS DISTINCT FROM 'COMPLETED' AND step.operational_status IS DISTINCT FROM 'ABORTED'))
      AND NOT EXISTS (
        SELECT 1
        FROM conveyor_node_assignees cna
        WHERE cna.conveyor_node_id = step.id
          AND cna.deleted_at IS NULL
          AND cna.conveyor_id = step.conveyor_id
          AND (
            (
              cna.assignment_type = 'COLLABORATOR'
              AND cna.collaborator_id = $1::uuid
            )
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
      )
      AND (
        $2::text IS NULL
        OR trim($2) = ''
        OR cv.name ILIKE '%' || $2 || '%'
        OR COALESCE(cv.code, '') ILIKE '%' || $2 || '%'
        OR COALESCE(cv.client_name, '') ILIKE '%' || $2 || '%'
        OR COALESCE(cv.vehicle, '') ILIKE '%' || $2 || '%'
        OR COALESCE(cv.plate, '') ILIKE '%' || $2 || '%'
        OR area.name ILIKE '%' || $2 || '%'
        OR opt.name ILIKE '%' || $2 || '%'
        OR step.name ILIKE '%' || $2 || '%'
      )
    ORDER BY
      opt.order_index::int,
      area.order_index::int,
      step.order_index::int
    LIMIT $3::int
    `,
    [collaboratorId, q, limit],
  )
  return r.rows
}

/**
 * STEPs apontáveis alocados no plano semanal publicado vigente (hoje + atrasadas na semana).
 * Complementa `listTimeEntryCandidatesForCollaborator` quando a alocação operacional difere da estrutural.
 */
export async function listTimeEntryCandidatesFromPublishedPlan(
  pool: pg.Pool,
  input: {
    collaboratorId: string
    date: string
    q: string | null
    limit: number
  },
): Promise<TimeEntryCandidateRawRow[]> {
  const date = input.date.trim()
  const plan = await findPublishedWorkPlanForWeek(pool, mondayOfWeekContaining(date))
  if (!plan) return []

  const q = input.q?.trim() || null
  const limit = input.limit

  const r = await pool.query<TimeEntryCandidateRawRow>(
    `
    SELECT
      COALESCE(
        (
          SELECT cna.id::text
          FROM conveyor_node_assignees cna
          WHERE cna.deleted_at IS NULL
            AND cna.conveyor_id = cv.id
            AND cna.conveyor_node_id = step.id
            AND cna.assignment_type = 'COLLABORATOR'
            AND cna.collaborator_id = $2::uuid
          ORDER BY cna.is_primary DESC, cna.order_index, cna.id
          LIMIT 1
        ),
        ''::text
      ) AS assignee_id,
      cv.id::text AS conveyor_id,
      cv.code AS conveyor_code,
      cv.name AS conveyor_name,
      cv.client_name AS client_name,
      cv.vehicle AS vehicle_label,
      cv.plate AS plate,
      step.id::text AS step_node_id,
      step.name AS step_name,
      area.name AS area_name,
      opt.name AS option_name,
      false AS is_primary,
      'COLLABORATOR'::text AS assignment_type,
      COALESCE(i.planned_minutes, step.planned_minutes)::text AS planned_minutes,
      step.planned_quantity::text AS planned_quantity,
      (
        SELECT COALESCE(SUM(cte.minutes), 0)::text
        FROM conveyor_time_entries cte
        WHERE cte.deleted_at IS NULL
          AND cte.conveyor_node_id = step.id
          AND cte.collaborator_id = $2::uuid
      ) AS realized_minutes,
      opt.order_index::text AS opt_order_index,
      area.order_index::text AS area_order_index,
      step.order_index::text AS step_order_index,
      i.planned_date::text AS planned_date
    FROM operational_work_plan_items i
    INNER JOIN operational_work_plans p
      ON p.id = i.work_plan_id
      AND p.deleted_at IS NULL
      AND p.status = 'PUBLISHED'
    INNER JOIN conveyors cv
      ON cv.id = i.conveyor_id
      AND cv.deleted_at IS NULL
      AND cv.operational_status IN ('A_INICIAR', 'EM_ANDAMENTO')
    INNER JOIN conveyor_nodes step
      ON step.id = i.activity_node_id
      AND step.conveyor_id = cv.id
      AND step.deleted_at IS NULL
      AND step.is_active = TRUE
      AND step.node_type = 'STEP'
      AND ((step.operational_status IS DISTINCT FROM 'COMPLETED' AND step.operational_status IS DISTINCT FROM 'ABORTED'))
    INNER JOIN conveyor_nodes area
      ON area.id = step.parent_id
      AND area.deleted_at IS NULL
      AND area.is_active = TRUE
      AND area.node_type = 'AREA'
    INNER JOIN conveyor_nodes opt
      ON opt.id = area.parent_id
      AND opt.deleted_at IS NULL
      AND opt.is_active = TRUE
      AND opt.node_type = 'OPTION'
    WHERE i.work_plan_id = $1::uuid
      AND i.deleted_at IS NULL
      AND i.status = 'PLANNED'
      AND i.assigned_collaborator_id = $2::uuid
      AND i.planned_date >= $5::date
      AND i.planned_date <= $6::date
      AND (
        i.planned_date = $3::date
        OR (
          i.planned_date < $3::date
          AND (step.operational_status IS DISTINCT FROM 'COMPLETED' AND step.operational_status IS DISTINCT FROM 'ABORTED')
        )
      )
      AND (
        $4::text IS NULL
        OR trim($4) = ''
        OR cv.name ILIKE '%' || $4 || '%'
        OR COALESCE(cv.code, '') ILIKE '%' || $4 || '%'
        OR COALESCE(cv.client_name, '') ILIKE '%' || $4 || '%'
        OR COALESCE(cv.vehicle, '') ILIKE '%' || $4 || '%'
        OR COALESCE(cv.plate, '') ILIKE '%' || $4 || '%'
        OR area.name ILIKE '%' || $4 || '%'
        OR step.name ILIKE '%' || $4 || '%'
      )
    ORDER BY
      CASE WHEN i.planned_date < $3::date THEN 0 ELSE 1 END ASC,
      i.planned_date ASC,
      i.planned_order ASC,
      opt.order_index::int,
      area.order_index::int,
      step.order_index::int
    LIMIT $7::int
    `,
    [
      plan.id,
      input.collaboratorId,
      date,
      q,
      plan.weekStartDate,
      plan.weekEndDate,
      limit,
    ],
  )
  return r.rows
}
