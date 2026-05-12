import type pg from 'pg'
import { randomUUID } from 'node:crypto'

export type OperationalWorkPlanRow = {
  id: string
  week_start_date: string
  week_end_date: string
  status: 'DRAFT' | 'PUBLISHED'
  created_by: string
  published_at: string | null
  published_by: string | null
  created_at: string
  updated_at: string
}

export type OperationalWorkPlanItemInsert = {
  conveyorId: string
  activityNodeId: string
  assignedCollaboratorId: string
  assignedTeamId: string | null
  plannedDate: string
  plannedOrder: number
  plannedMinutes: number | null
  notes: string | null
}

export async function findOperationalWorkPlanByWeekStart(
  pool: pg.Pool | pg.PoolClient,
  weekStartDate: string,
): Promise<OperationalWorkPlanRow | null> {
  const r = await pool.query<{
    id: string
    week_start_date: string
    week_end_date: string
    status: 'DRAFT' | 'PUBLISHED'
    created_by: string
    published_at: Date | null
    published_by: string | null
    created_at: Date
    updated_at: Date
  }>(
    `
    SELECT
      id::text,
      week_start_date::text AS week_start_date,
      week_end_date::text AS week_end_date,
      status,
      created_by::text,
      published_at,
      published_by::text,
      created_at,
      updated_at
    FROM operational_work_plans
    WHERE week_start_date = $1::date
      AND deleted_at IS NULL
    LIMIT 1
    `,
    [weekStartDate],
  )
  const row = r.rows[0]
  if (!row) return null
  return {
    id: row.id,
    week_start_date: row.week_start_date.trim(),
    week_end_date: row.week_end_date.trim(),
    status: row.status,
    created_by: row.created_by,
    published_at: row.published_at ? row.published_at.toISOString() : null,
    published_by: row.published_by,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  }
}

export async function findOperationalWorkPlanById(
  pool: pg.Pool | pg.PoolClient,
  planId: string,
): Promise<OperationalWorkPlanRow | null> {
  const r = await pool.query<{
    id: string
    week_start_date: string
    week_end_date: string
    status: 'DRAFT' | 'PUBLISHED'
    created_by: string
    published_at: Date | null
    published_by: string | null
    created_at: Date
    updated_at: Date
  }>(
    `
    SELECT
      id::text,
      week_start_date::text AS week_start_date,
      week_end_date::text AS week_end_date,
      status,
      created_by::text,
      published_at,
      published_by::text,
      created_at,
      updated_at
    FROM operational_work_plans
    WHERE id = $1::uuid
      AND deleted_at IS NULL
    LIMIT 1
    `,
    [planId],
  )
  const row = r.rows[0]
  if (!row) return null
  return {
    id: row.id,
    week_start_date: row.week_start_date.trim(),
    week_end_date: row.week_end_date.trim(),
    status: row.status,
    created_by: row.created_by,
    published_at: row.published_at ? row.published_at.toISOString() : null,
    published_by: row.published_by,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  }
}

export async function insertOperationalWorkPlan(
  client: pg.PoolClient,
  input: {
    weekStartDate: string
    weekEndDate: string
    createdByUserId: string
    status: 'DRAFT' | 'PUBLISHED'
  },
): Promise<string> {
  const id = randomUUID()
  await client.query(
    `
    INSERT INTO operational_work_plans (
      id,
      week_start_date,
      week_end_date,
      status,
      created_by,
      created_at,
      updated_at
    ) VALUES (
      $1::uuid,
      $2::date,
      $3::date,
      $4::varchar,
      $5::uuid,
      now(),
      now()
    )
    `,
    [id, input.weekStartDate, input.weekEndDate, input.status, input.createdByUserId],
  )
  return id
}

export async function deleteItemsForWorkPlan(
  client: pg.PoolClient,
  workPlanId: string,
): Promise<void> {
  await client.query(`DELETE FROM operational_work_plan_items WHERE work_plan_id = $1::uuid`, [
    workPlanId,
  ])
}

export async function insertWorkPlanItems(
  client: pg.PoolClient,
  workPlanId: string,
  items: OperationalWorkPlanItemInsert[],
): Promise<void> {
  for (const it of items) {
    await client.query(
      `
      INSERT INTO operational_work_plan_items (
        id,
        work_plan_id,
        conveyor_id,
        activity_node_id,
        assigned_collaborator_id,
        assigned_team_id,
        planned_date,
        planned_order,
        planned_minutes,
        status,
        notes,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        $1::uuid,
        $2::uuid,
        $3::uuid,
        $4::uuid,
        $5::uuid,
        $6::date,
        $7::int,
        $8::int,
        'PLANNED',
        $9::text,
        now(),
        now()
      )
      `,
      [
        workPlanId,
        it.conveyorId,
        it.activityNodeId,
        it.assignedCollaboratorId,
        it.assignedTeamId,
        it.plannedDate,
        it.plannedOrder,
        it.plannedMinutes,
        it.notes,
      ],
    )
  }
}

export type PlanItemEnrichedRow = {
  id: string
  conveyor_id: string
  conveyor_title: string
  activity_node_id: string
  activity_title: string
  task_title: string
  sector_title: string
  assigned_collaborator_id: string | null
  assigned_collaborator_name: string | null
  planned_date: string
  planned_order: number
  planned_minutes: number | null
  status: string
  notes: string | null
}

export async function listEnrichedItemsForWorkPlan(
  pool: pg.Pool | pg.PoolClient,
  workPlanId: string,
): Promise<PlanItemEnrichedRow[]> {
  const r = await pool.query<{
    id: string
    conveyor_id: string
    conveyor_title: string
    activity_node_id: string
    activity_title: string
    task_title: string
    sector_title: string
    assigned_collaborator_id: string | null
    assigned_collaborator_name: string | null
    planned_date: Date
    planned_order: number
    planned_minutes: number | null
    status: string
    notes: string | null
  }>(
    `
    SELECT
      i.id::text,
      cv.id::text AS conveyor_id,
      cv.name AS conveyor_title,
      step.id::text AS activity_node_id,
      step.name AS activity_title,
      opt.name AS task_title,
      area.name AS sector_title,
      i.assigned_collaborator_id::text,
      col.full_name AS assigned_collaborator_name,
      i.planned_date,
      i.planned_order,
      i.planned_minutes,
      i.status,
      i.notes
    FROM operational_work_plan_items i
    INNER JOIN conveyors cv
      ON cv.id = i.conveyor_id
      AND cv.deleted_at IS NULL
    INNER JOIN conveyor_nodes step
      ON step.id = i.activity_node_id
      AND step.deleted_at IS NULL
    INNER JOIN conveyor_nodes area
      ON area.id = step.parent_id
      AND area.node_type = 'AREA'
      AND area.deleted_at IS NULL
    INNER JOIN conveyor_nodes opt
      ON opt.id = area.parent_id
      AND opt.node_type = 'OPTION'
      AND opt.deleted_at IS NULL
    LEFT JOIN collaborators col
      ON col.id = i.assigned_collaborator_id
      AND col.deleted_at IS NULL
    WHERE i.work_plan_id = $1::uuid
      AND i.deleted_at IS NULL
    ORDER BY
      i.planned_date ASC,
      i.assigned_collaborator_id::text ASC NULLS LAST,
      i.planned_order ASC,
      i.id ASC
    `,
    [workPlanId],
  )
  return r.rows.map((row) => ({
    id: row.id,
    conveyor_id: row.conveyor_id,
    conveyor_title: row.conveyor_title,
    activity_node_id: row.activity_node_id,
    activity_title: row.activity_title,
    task_title: row.task_title,
    sector_title: row.sector_title,
    assigned_collaborator_id: row.assigned_collaborator_id,
    assigned_collaborator_name: row.assigned_collaborator_name,
    planned_date: row.planned_date.toISOString().slice(0, 10),
    planned_order: row.planned_order,
    planned_minutes: row.planned_minutes,
    status: row.status,
    notes: row.notes,
  }))
}

export async function touchOperationalWorkPlanUpdatedAt(
  client: pg.PoolClient,
  planId: string,
): Promise<void> {
  await client.query(
    `UPDATE operational_work_plans SET updated_at = now() WHERE id = $1::uuid AND deleted_at IS NULL`,
    [planId],
  )
}

export async function publishOperationalWorkPlan(
  client: pg.PoolClient,
  planId: string,
  publisherUserId: string,
): Promise<boolean> {
  const r = await client.query<{ id: string }>(
    `
    UPDATE operational_work_plans
    SET
      status = 'PUBLISHED',
      published_at = now(),
      published_by = $2::uuid,
      updated_at = now()
    WHERE id = $1::uuid
      AND deleted_at IS NULL
      AND status = 'DRAFT'
    RETURNING id::text
    `,
    [planId, publisherUserId],
  )
  return Boolean(r.rows[0])
}

export type StepPlanningValidationRow = {
  conveyor_id: string
  conveyor_operational_status: string
  node_type: string
  is_active: boolean
  operational_status: string | null
}

export async function loadStepForPlanningValidation(
  pool: pg.Pool | pg.PoolClient,
  conveyorId: string,
  activityNodeId: string,
): Promise<StepPlanningValidationRow | null> {
  const r = await pool.query<{
    conveyor_id: string
    conveyor_operational_status: string
    node_type: string
    is_active: boolean
    operational_status: string | null
  }>(
    `
    SELECT
      cv.id::text AS conveyor_id,
      cv.operational_status::text AS conveyor_operational_status,
      cn.node_type::text AS node_type,
      cn.is_active,
      cn.operational_status::text AS operational_status
    FROM conveyor_nodes cn
    INNER JOIN conveyors cv ON cv.id = cn.conveyor_id AND cv.deleted_at IS NULL
    WHERE cn.id = $2::uuid
      AND cn.conveyor_id = $1::uuid
      AND cn.deleted_at IS NULL
    `,
    [conveyorId, activityNodeId],
  )
  const row = r.rows[0]
  if (!row) return null
  return {
    conveyor_id: row.conveyor_id,
    conveyor_operational_status: row.conveyor_operational_status,
    node_type: row.node_type,
    is_active: row.is_active,
    operational_status: row.operational_status,
  }
}

export type BacklogRawRow = {
  conveyor_id: string
  conveyor_title: string
  client_name: string | null
  vehicle_description: string | null
  license_plate: string | null
  estimated_deadline: string | null
  activity_node_id: string
  activity_title: string
  task_title: string
  sector_title: string
  planned_minutes: number | null
  realized_minutes: number
  pending_minutes: number
  assigned_collaborators_json: unknown
  assigned_teams_json: unknown
}

export async function listOperationalPlanningBacklog(
  pool: pg.Pool,
  options: {
    q: string | null
    limit: number
    conveyorId: string | null
    collaboratorId: string | null
  },
): Promise<BacklogRawRow[]> {
  const r = await pool.query<{
    conveyor_id: string
    conveyor_title: string
    client_name: string | null
    vehicle_description: string | null
    license_plate: string | null
    estimated_deadline: string | null
    activity_node_id: string
    activity_title: string
    task_title: string
    sector_title: string
    planned_minutes: string | null
    realized_minutes: string
    pending_minutes: string
    assigned_collaborators_json: unknown
    assigned_teams_json: unknown
  }>(
    `
    WITH realized AS (
      SELECT conveyor_node_id AS step_id, COALESCE(SUM(minutes), 0)::numeric AS realized
      FROM conveyor_time_entries
      WHERE deleted_at IS NULL
      GROUP BY conveyor_node_id
    )
    SELECT
      cv.id::text AS conveyor_id,
      cv.name AS conveyor_title,
      cv.client_name AS client_name,
      cv.vehicle AS vehicle_description,
      cv.plate AS license_plate,
      cv.estimated_deadline::text AS estimated_deadline,
      step.id::text AS activity_node_id,
      step.name AS activity_title,
      opt.name AS task_title,
      area.name AS sector_title,
      step.planned_minutes::text AS planned_minutes,
      COALESCE(realized.realized, 0)::text AS realized_minutes,
      GREATEST(
        0,
        COALESCE(step.planned_minutes, 0) - COALESCE(realized.realized, 0)
      )::text AS pending_minutes,
      COALESCE(
        (
          SELECT json_agg(json_build_object(
            'id', col.id::text,
            'fullName', col.full_name
          ))
          FROM conveyor_node_assignees cna
          INNER JOIN collaborators col
            ON col.id = cna.collaborator_id
            AND col.deleted_at IS NULL
          WHERE cna.conveyor_node_id = step.id
            AND cna.deleted_at IS NULL
            AND cna.assignment_type = 'COLLABORATOR'
        ),
        '[]'::json
      ) AS assigned_collaborators_json,
      COALESCE(
        (
          SELECT json_agg(json_build_object(
            'id', t.id::text,
            'name', t.name
          ))
          FROM conveyor_node_assignees cna
          INNER JOIN teams t ON t.id = cna.team_id AND t.deleted_at IS NULL
          WHERE cna.conveyor_node_id = step.id
            AND cna.deleted_at IS NULL
            AND cna.assignment_type = 'TEAM'
        ),
        '[]'::json
      ) AS assigned_teams_json
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
      AND cv.operational_status <> 'CONCLUIDA'
    LEFT JOIN realized ON realized.step_id = step.id
    WHERE step.node_type = 'STEP'
      AND step.deleted_at IS NULL
      AND step.is_active = TRUE
      AND step.operational_status IS DISTINCT FROM 'COMPLETED'
      AND ($1::uuid IS NULL OR cv.id = $1::uuid)
      AND (
        $2::uuid IS NULL
        OR EXISTS (
          SELECT 1
          FROM conveyor_node_assignees cna
          WHERE cna.conveyor_node_id = step.id
            AND cna.deleted_at IS NULL
            AND (
              (
                cna.assignment_type = 'COLLABORATOR'
                AND cna.collaborator_id = $2::uuid
              )
              OR (
                cna.assignment_type = 'TEAM'
                AND EXISTS (
                  SELECT 1
                  FROM team_members tm
                  WHERE tm.team_id = cna.team_id
                    AND tm.collaborator_id = $2::uuid
                    AND tm.is_active = TRUE
                )
              )
            )
        )
      )
      AND (
        GREATEST(0, COALESCE(step.planned_minutes, 0) - COALESCE(realized.realized, 0)) > 0
      )
      AND (
        $3::text IS NULL
        OR trim($3) = ''
        OR cv.name ILIKE '%' || $3 || '%'
        OR COALESCE(cv.code, '') ILIKE '%' || $3 || '%'
        OR COALESCE(cv.client_name, '') ILIKE '%' || $3 || '%'
        OR COALESCE(cv.vehicle, '') ILIKE '%' || $3 || '%'
        OR COALESCE(cv.plate, '') ILIKE '%' || $3 || '%'
        OR opt.name ILIKE '%' || $3 || '%'
        OR area.name ILIKE '%' || $3 || '%'
        OR step.name ILIKE '%' || $3 || '%'
      )
    ORDER BY cv.name ASC, opt.order_index ASC, area.order_index ASC, step.order_index ASC
    LIMIT $4::int
    `,
    [options.conveyorId, options.collaboratorId, options.q, options.limit],
  )

  return r.rows.map((row) => ({
    conveyor_id: row.conveyor_id,
    conveyor_title: row.conveyor_title,
    client_name: row.client_name,
    vehicle_description: row.vehicle_description,
    license_plate: row.license_plate,
    estimated_deadline: row.estimated_deadline,
    activity_node_id: row.activity_node_id,
    activity_title: row.activity_title,
    task_title: row.task_title,
    sector_title: row.sector_title,
    planned_minutes:
      row.planned_minutes == null || row.planned_minutes === ''
        ? null
        : Number(row.planned_minutes),
    realized_minutes: Number.parseInt(row.realized_minutes, 10) || 0,
    pending_minutes: Number.parseInt(row.pending_minutes, 10) || 0,
    assigned_collaborators_json: row.assigned_collaborators_json,
    assigned_teams_json: row.assigned_teams_json,
  }))
}
