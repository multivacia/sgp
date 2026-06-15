import type pg from 'pg'

export type MyWorkQueuePlanRow = {
  id: string
  status: 'PUBLISHED'
  weekStartDate: string
  weekEndDate: string
}

export type MyWorkQueueListOptions = {
  /** Limita itens à janela seg–sex do plano publicado. */
  weekStartDate?: string
  weekEndDate?: string
  /** Ex.: `['PLANNED']` na fila de produção (ignora MOVED/CANCELLED). */
  planItemStatuses?: readonly string[]
}

export type MyWorkQueueRawRow = {
  work_plan_id: string
  work_plan_item_id: string
  planned_date: string
  planned_order: number
  planned_minutes: number | null
  status: string
  conveyor_id: string
  conveyor_operational_status: string
  conveyor_title: string
  client_name: string | null
  vehicle_description: string | null
  license_plate: string | null
  activity_node_id: string
  activity_title: string
  task_title: string
  sector_title: string
  activity_operational_status: string | null
  is_assigned_to_me: boolean
}

/** Plano publicado vigente da semana (segunda = `weekStartDate`). */
export async function findPublishedWorkPlanForWeek(
  pool: pg.Pool,
  weekStartDate: string,
): Promise<MyWorkQueuePlanRow | null> {
  const r = await pool.query<{
    id: string
    status: 'PUBLISHED'
    week_start_date: string
    week_end_date: string
  }>(
    `
    SELECT
      id::text,
      status,
      week_start_date::text AS week_start_date,
      week_end_date::text AS week_end_date
    FROM operational_work_plans
    WHERE week_start_date = $1::date
      AND status = 'PUBLISHED'
      AND deleted_at IS NULL
    ORDER BY published_at DESC NULLS LAST, updated_at DESC
    LIMIT 1
    `,
    [weekStartDate],
  )
  const row = r.rows[0]
  if (!row) return null
  return {
    id: row.id,
    status: row.status,
    weekStartDate: row.week_start_date.trim(),
    weekEndDate: row.week_end_date.trim(),
  }
}

const WORK_PLAN_ITEM_STATUSES = new Set(['PLANNED', 'MOVED', 'CANCELLED'])

function planItemStatusFilterSql(planItemStatuses: readonly string[] | undefined): string {
  if (!planItemStatuses?.length) {
    return `AND i.status <> 'CANCELLED'`
  }
  for (const status of planItemStatuses) {
    if (!WORK_PLAN_ITEM_STATUSES.has(status)) {
      throw new Error(`status de item de plano inválido: ${status}`)
    }
  }
  const list = planItemStatuses.map((s) => `'${s}'`).join(', ')
  return `AND i.status IN (${list})`
}

export async function listMyWorkQueueRows(
  pool: pg.Pool,
  input: {
    workPlanId: string
    collaboratorId: string
    date: string
    includePastDue: boolean
    listOptions?: MyWorkQueueListOptions
  },
): Promise<MyWorkQueueRawRow[]> {
  const listOptions = input.listOptions
  const statusFilterSql = planItemStatusFilterSql(listOptions?.planItemStatuses)
  const weekStart = listOptions?.weekStartDate?.trim()
  const weekEnd = listOptions?.weekEndDate?.trim()
  const weekBoundsSql =
    weekStart && weekEnd
      ? `AND i.planned_date >= $5::date AND i.planned_date <= $6::date`
      : ''
  const queryParams: unknown[] = [
    input.workPlanId,
    input.collaboratorId,
    input.date,
    input.includePastDue,
  ]
  if (weekStart && weekEnd) {
    queryParams.push(weekStart, weekEnd)
  }

  const r = await pool.query<{
    work_plan_id: string
    work_plan_item_id: string
    planned_date: string
    planned_order: number
    planned_minutes: number | null
    status: string
    conveyor_id: string
    conveyor_operational_status: string
    conveyor_title: string
    client_name: string | null
    vehicle_description: string | null
    license_plate: string | null
    activity_node_id: string
    activity_title: string
    task_title: string
    sector_title: string
    activity_operational_status: string | null
    is_assigned_to_me: boolean
  }>(
    `
    SELECT
      p.id::text AS work_plan_id,
      i.id::text AS work_plan_item_id,
      i.planned_date::text AS planned_date,
      i.planned_order,
      i.planned_minutes,
      i.status,
      cv.id::text AS conveyor_id,
      cv.operational_status::text AS conveyor_operational_status,
      cv.name AS conveyor_title,
      cv.client_name,
      cv.vehicle AS vehicle_description,
      cv.plate AS license_plate,
      step.id::text AS activity_node_id,
      step.name AS activity_title,
      opt.name AS task_title,
      area.name AS sector_title,
      step.operational_status::text AS activity_operational_status,
      EXISTS (
        SELECT 1
        FROM conveyor_node_assignees cna
        WHERE cna.conveyor_id = cv.id
          AND cna.conveyor_node_id = step.id
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
      ) AS is_assigned_to_me
    FROM operational_work_plan_items i
    INNER JOIN operational_work_plans p
      ON p.id = i.work_plan_id
      AND p.deleted_at IS NULL
      AND p.status = 'PUBLISHED'
    INNER JOIN conveyors cv
      ON cv.id = i.conveyor_id
      AND cv.deleted_at IS NULL
    INNER JOIN conveyor_nodes step
      ON step.id = i.activity_node_id
      AND step.conveyor_id = cv.id
      AND step.deleted_at IS NULL
      AND step.is_active = TRUE
      AND step.node_type = 'STEP'
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
      ${statusFilterSql}
      AND i.assigned_collaborator_id = $2::uuid
      ${weekBoundsSql}
      AND (
        i.planned_date = $3::date
        OR (
          $4::boolean = TRUE
          AND i.planned_date < $3::date
          AND step.operational_status IS DISTINCT FROM 'COMPLETED'
        )
      )
    ORDER BY
      CASE
        WHEN i.planned_date < $3::date THEN 0
        WHEN step.operational_status = 'COMPLETED' THEN 2
        ELSE 1
      END ASC,
      i.planned_date ASC,
      i.planned_order ASC,
      i.id ASC
    `,
    queryParams,
  )

  return r.rows.map((row) => ({
    work_plan_id: row.work_plan_id,
    work_plan_item_id: row.work_plan_item_id,
    planned_date: row.planned_date,
    planned_order: row.planned_order,
    planned_minutes: row.planned_minutes,
    status: row.status,
    conveyor_id: row.conveyor_id,
    conveyor_operational_status: row.conveyor_operational_status,
    conveyor_title: row.conveyor_title,
    client_name: row.client_name,
    vehicle_description: row.vehicle_description,
    license_plate: row.license_plate,
    activity_node_id: row.activity_node_id,
    activity_title: row.activity_title,
    task_title: row.task_title,
    sector_title: row.sector_title,
    activity_operational_status: row.activity_operational_status,
    is_assigned_to_me: row.is_assigned_to_me,
  }))
}
