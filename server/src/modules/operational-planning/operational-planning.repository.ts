import type pg from 'pg'
import { randomUUID } from 'node:crypto'
import {
  operationalPlanningBacklogConveyorStatusSql,
  operationalPlanningBacklogExcludeConveyorPlanItemsSql,
  operationalPlanningBacklogExcludeEmProducaoWithActivePlanSql,
} from './operational-planning.backlog-eligibility.js'
import { sqlConveyorStepPlannedTotalMinutes } from '../../shared/activityOperationalQuantity.js'
import {
  EXECUTION_OUTSIDE_PLAN_TIMEZONE,
  type ExecutionOutsidePlanEntryRow,
} from './operational-planning.execution-outside-plan.js'
import type {
  WeekActivityStepEventRow,
  WeekActivityTimeEntryRow,
} from './operational-planning.week-activity.js'

/** Carga no backlog/plano semanal: total planejado (min/un. × qtd), não só unitário. */
const STEP_PLANNED_TOTAL_MINUTES_SQL = sqlConveyorStepPlannedTotalMinutes('step')

/** Encaixe ativo na fábrica: somente itens vinculados a plano semanal PUBLISHED. */
export const SQL_FACTORY_LINKED_TO_PUBLISHED_PLAN = `
  EXISTS (
    SELECT 1
    FROM operational_work_plan_items owpi
    INNER JOIN operational_work_plans owp
      ON owp.id = owpi.work_plan_id
      AND owp.deleted_at IS NULL
      AND owp.status = 'PUBLISHED'
    WHERE owpi.conveyor_operational_plan_item_id = i.id
      AND owpi.deleted_at IS NULL
  )
`

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
  conveyorOperationalPlanItemId?: string | null
}

export type InsertedWorkPlanItemRow = {
  id: string
  conveyorOperationalPlanItemId: string | null
}

export type WorkPlanItemLinkRow = {
  factoryItemId: string
  conveyorOperationalPlanItemId: string
}

function mapOperationalWorkPlanRow(row: {
  id: string
  week_start_date: string
  week_end_date: string
  status: 'DRAFT' | 'PUBLISHED'
  created_by: string
  published_at: Date | null
  published_by: string | null
  created_at: Date
  updated_at: Date
}): OperationalWorkPlanRow {
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

async function queryOperationalWorkPlanByWeekStartAndStatus(
  pool: pg.Pool | pg.PoolClient,
  weekStartDate: string,
  status: 'DRAFT' | 'PUBLISHED',
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
      AND status = $2::varchar
      AND deleted_at IS NULL
    LIMIT 1
    `,
    [weekStartDate, status],
  )
  const row = r.rows[0]
  if (!row) return null
  return mapOperationalWorkPlanRow(row)
}

export async function findDraftOperationalWorkPlanByWeekStart(
  pool: pg.Pool | pg.PoolClient,
  weekStartDate: string,
): Promise<OperationalWorkPlanRow | null> {
  return queryOperationalWorkPlanByWeekStartAndStatus(pool, weekStartDate, 'DRAFT')
}

export async function findPublishedOperationalWorkPlanByWeekStart(
  pool: pg.Pool | pg.PoolClient,
  weekStartDate: string,
): Promise<OperationalWorkPlanRow | null> {
  return queryOperationalWorkPlanByWeekStartAndStatus(pool, weekStartDate, 'PUBLISHED')
}

/** Plano editável na semana: revisão DRAFT se existir; senão PUBLISHED vigente. */
export async function findEditableOperationalWorkPlanForWeek(
  pool: pg.Pool | pg.PoolClient,
  weekStartDate: string,
): Promise<OperationalWorkPlanRow | null> {
  const draft = await findDraftOperationalWorkPlanByWeekStart(pool, weekStartDate)
  if (draft) return draft
  return findPublishedOperationalWorkPlanByWeekStart(pool, weekStartDate)
}

/** @deprecated Prefer findEditableOperationalWorkPlanForWeek or status-specific finders. */
export async function findOperationalWorkPlanByWeekStart(
  pool: pg.Pool | pg.PoolClient,
  weekStartDate: string,
): Promise<OperationalWorkPlanRow | null> {
  return findEditableOperationalWorkPlanForWeek(pool, weekStartDate)
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
  return mapOperationalWorkPlanRow(row)
}

export async function softDeleteOperationalWorkPlanWithItems(
  client: pg.PoolClient,
  planId: string,
): Promise<void> {
  await client.query(
    `
    UPDATE operational_work_plan_items
    SET deleted_at = now(), updated_at = now()
    WHERE work_plan_id = $1::uuid
      AND deleted_at IS NULL
    `,
    [planId],
  )
  await client.query(
    `
    UPDATE operational_work_plans
    SET deleted_at = now(), updated_at = now()
    WHERE id = $1::uuid
      AND deleted_at IS NULL
    `,
    [planId],
  )
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

export async function listWorkPlanItemLinks(
  client: pg.Pool | pg.PoolClient,
  workPlanId: string,
): Promise<WorkPlanItemLinkRow[]> {
  const r = await client.query<{
    factory_item_id: string
    conveyor_operational_plan_item_id: string
  }>(
    `
    SELECT
      id::text AS factory_item_id,
      conveyor_operational_plan_item_id::text
    FROM operational_work_plan_items
    WHERE work_plan_id = $1::uuid
      AND deleted_at IS NULL
      AND conveyor_operational_plan_item_id IS NOT NULL
    `,
    [workPlanId],
  )
  return r.rows.map((row) => ({
    factoryItemId: row.factory_item_id,
    conveyorOperationalPlanItemId: row.conveyor_operational_plan_item_id,
  }))
}

/** `operational_work_plan_items.planned_minutes` = carga planejada total no plano (não min/un.). */
export async function insertWorkPlanItems(
  client: pg.PoolClient,
  workPlanId: string,
  items: OperationalWorkPlanItemInsert[],
): Promise<InsertedWorkPlanItemRow[]> {
  const inserted: InsertedWorkPlanItemRow[] = []
  for (const it of items) {
    const id = randomUUID()
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
        conveyor_operational_plan_item_id,
        created_at,
        updated_at
      ) VALUES (
        $1::uuid,
        $2::uuid,
        $3::uuid,
        $4::uuid,
        $5::uuid,
        $6::uuid,
        $7::date,
        $8::int,
        $9::int,
        'PLANNED',
        $10::text,
        $11::uuid,
        now(),
        now()
      )
      `,
      [
        id,
        workPlanId,
        it.conveyorId,
        it.activityNodeId,
        it.assignedCollaboratorId,
        it.assignedTeamId,
        it.plannedDate,
        it.plannedOrder,
        it.plannedMinutes,
        it.notes,
        it.conveyorOperationalPlanItemId ?? null,
      ],
    )
    inserted.push({
      id,
      conveyorOperationalPlanItemId: it.conveyorOperationalPlanItemId ?? null,
    })
  }
  return inserted
}

export type FactoryIntakeRawRow = {
  conveyor_operational_plan_id: string
  conveyor_operational_plan_item_id: string
  conveyor_id: string
  conveyor_name: string
  activity_node_id: string
  planned_date: string | null
  planned_order: number
  planned_minutes: number | null
  planned_collaborator_id: string | null
  planned_collaborator_name: string | null
  planned_team_id: string | null
  planned_team_name: string | null
  task_title: string
  sector_title: string
  activity_title: string
  activity_operational_status: string | null
  realized_minutes: number
  review_required: boolean
  sync_status: string | null
  factory_planning_status: string | null
  operational_plan_status: string
  plan_item_status: string
  total_plan_items: number
  linked_plan_items: number
  pending_plan_items: number
}

/** Itens do plano da esteira aguardando encaixe na fábrica (MVP: todos, sem filtro por semana). */
export async function listFactoryIntakeItems(
  pool: pg.Pool,
): Promise<FactoryIntakeRawRow[]> {
  const r = await pool.query<{
    conveyor_operational_plan_id: string
    conveyor_operational_plan_item_id: string
    conveyor_id: string
    conveyor_name: string
    activity_node_id: string
    planned_date: string | null
    planned_order: number
    planned_minutes: number | null
    planned_collaborator_id: string | null
    planned_collaborator_name: string | null
    planned_team_id: string | null
    planned_team_name: string | null
    task_title: string
    sector_title: string
    activity_title: string
    activity_operational_status: string | null
    realized_minutes: string
    review_required: boolean
    sync_status: string | null
    factory_planning_status: string | null
    operational_plan_status: string
    plan_item_status: string
    total_plan_items: number
    linked_plan_items: number
    pending_plan_items: number
  }>(
    `
    WITH realized AS (
      SELECT conveyor_node_id AS step_id, COALESCE(SUM(minutes), 0)::numeric AS realized
      FROM conveyor_time_entries
      WHERE deleted_at IS NULL
      GROUP BY conveyor_node_id
    )
    SELECT
      p.id::text AS conveyor_operational_plan_id,
      i.id::text AS conveyor_operational_plan_item_id,
      cv.id::text AS conveyor_id,
      cv.name AS conveyor_name,
      step.id::text AS activity_node_id,
      i.planned_date::text,
      i.planned_order,
      i.planned_minutes,
      i.planned_collaborator_id::text,
      col.full_name AS planned_collaborator_name,
      i.planned_team_id::text,
      tm.name AS planned_team_name,
      opt.name AS task_title,
      area.name AS sector_title,
      step.name AS activity_title,
      step.operational_status::text AS activity_operational_status,
      COALESCE(realized.realized, 0)::text AS realized_minutes,
      i.review_required,
      i.sync_status,
      p.factory_planning_status,
      p.status::text AS operational_plan_status,
      i.status AS plan_item_status,
      plan_stats.total_plan_items,
      plan_stats.linked_plan_items,
      plan_stats.pending_plan_items
    FROM conveyor_operational_plan_items i
    INNER JOIN conveyor_operational_plans p
      ON p.id = i.plan_id
      AND p.deleted_at IS NULL
      AND p.status = 'WAITING_FACTORY_PLANNING'
    INNER JOIN conveyors cv
      ON cv.id = i.conveyor_id
      AND cv.deleted_at IS NULL
      AND cv.operational_status NOT IN ('FINALIZADA', 'CANCELADA')
    INNER JOIN conveyor_nodes step
      ON step.id = i.activity_node_id
      AND step.deleted_at IS NULL
      AND step.node_type = 'STEP'
      AND step.is_active = TRUE
      AND step.operational_status IS DISTINCT FROM 'COMPLETED'
    INNER JOIN conveyor_nodes area
      ON area.id = step.parent_id
      AND area.node_type = 'AREA'
      AND area.deleted_at IS NULL
    INNER JOIN conveyor_nodes opt
      ON opt.id = area.parent_id
      AND opt.node_type = 'OPTION'
      AND opt.deleted_at IS NULL
    LEFT JOIN collaborators col
      ON col.id = i.planned_collaborator_id
      AND col.deleted_at IS NULL
    LEFT JOIN teams tm
      ON tm.id = i.planned_team_id
      AND tm.deleted_at IS NULL
    LEFT JOIN realized ON realized.step_id = step.id
    CROSS JOIN LATERAL (
      SELECT
        COUNT(*)::int AS total_plan_items,
        COUNT(*) FILTER (
          WHERE EXISTS (
            SELECT 1
            FROM operational_work_plan_items owpi
            INNER JOIN operational_work_plans owp
              ON owp.id = owpi.work_plan_id
              AND owp.deleted_at IS NULL
              AND owp.status = 'PUBLISHED'
            WHERE owpi.conveyor_operational_plan_item_id = ci.id
              AND owpi.deleted_at IS NULL
          )
        )::int AS linked_plan_items,
        COUNT(*) FILTER (
          WHERE NOT EXISTS (
            SELECT 1
            FROM operational_work_plan_items owpi
            INNER JOIN operational_work_plans owp
              ON owp.id = owpi.work_plan_id
              AND owp.deleted_at IS NULL
              AND owp.status = 'PUBLISHED'
            WHERE owpi.conveyor_operational_plan_item_id = ci.id
              AND owpi.deleted_at IS NULL
          )
        )::int AS pending_plan_items
      FROM conveyor_operational_plan_items ci
      INNER JOIN conveyor_nodes step_ci
        ON step_ci.id = ci.activity_node_id
        AND step_ci.deleted_at IS NULL
        AND step_ci.node_type = 'STEP'
        AND step_ci.is_active = TRUE
        AND step_ci.operational_status IS DISTINCT FROM 'COMPLETED'
      WHERE ci.plan_id = p.id
        AND ci.deleted_at IS NULL
        AND ci.status IN ('PLANNED', 'NEEDS_REVIEW')
        AND ci.origin_work_plan_item_id IS NULL
    ) plan_stats
    WHERE i.deleted_at IS NULL
      AND i.status IN ('PLANNED', 'NEEDS_REVIEW')
      AND i.origin_work_plan_item_id IS NULL
      AND NOT EXISTS (
        SELECT 1
        FROM operational_work_plan_items owpi
        INNER JOIN operational_work_plans owp
          ON owp.id = owpi.work_plan_id
          AND owp.deleted_at IS NULL
          AND owp.status = 'PUBLISHED'
        WHERE owpi.conveyor_operational_plan_item_id = i.id
          AND owpi.deleted_at IS NULL
      )
    ORDER BY
      i.planned_date ASC NULLS LAST,
      cv.name ASC,
      i.planned_order ASC,
      i.id ASC
    `,
  )

  return r.rows.map((row) => ({
    conveyor_operational_plan_id: row.conveyor_operational_plan_id,
    conveyor_operational_plan_item_id: row.conveyor_operational_plan_item_id,
    conveyor_id: row.conveyor_id,
    conveyor_name: row.conveyor_name,
    activity_node_id: row.activity_node_id,
    planned_date: row.planned_date?.trim() ?? null,
    planned_order: row.planned_order,
    planned_minutes: row.planned_minutes,
    planned_collaborator_id: row.planned_collaborator_id,
    planned_collaborator_name: row.planned_collaborator_name,
    planned_team_id: row.planned_team_id,
    planned_team_name: row.planned_team_name,
    task_title: row.task_title,
    sector_title: row.sector_title,
    activity_title: row.activity_title,
    activity_operational_status: row.activity_operational_status,
    realized_minutes: parsePlanItemRealizedMinutes(row.realized_minutes),
    review_required: row.review_required,
    sync_status: row.sync_status,
    factory_planning_status: row.factory_planning_status,
    operational_plan_status: row.operational_plan_status,
    plan_item_status: row.plan_item_status,
    total_plan_items: row.total_plan_items,
    linked_plan_items: row.linked_plan_items,
    pending_plan_items: row.pending_plan_items,
  }))
}

export type ConveyorPlanItemLinkValidationRow = {
  id: string
  plan_id: string
  conveyor_id: string
  activity_node_id: string
  status: string
  plan_status: string
}

export async function loadConveyorPlanItemForFactoryLink(
  pool: pg.Pool | pg.PoolClient,
  conveyorPlanItemId: string,
): Promise<ConveyorPlanItemLinkValidationRow | null> {
  const r = await pool.query<{
    id: string
    plan_id: string
    conveyor_id: string
    activity_node_id: string
    status: string
    plan_status: string
  }>(
    `
    SELECT
      i.id::text,
      i.plan_id::text,
      i.conveyor_id::text,
      i.activity_node_id::text,
      i.status,
      p.status AS plan_status
    FROM conveyor_operational_plan_items i
    INNER JOIN conveyor_operational_plans p
      ON p.id = i.plan_id
      AND p.deleted_at IS NULL
    WHERE i.id = $1::uuid
      AND i.deleted_at IS NULL
    `,
    [conveyorPlanItemId],
  )
  const row = r.rows[0]
  if (!row) return null
  return {
    id: row.id,
    plan_id: row.plan_id,
    conveyor_id: row.conveyor_id,
    activity_node_id: row.activity_node_id,
    status: row.status,
    plan_status: row.plan_status,
  }
}

export async function isConveyorPlanItemLinkedElsewhere(
  pool: pg.Pool | pg.PoolClient,
  conveyorPlanItemId: string,
  excludeWorkPlanIds?: string | readonly string[],
): Promise<boolean> {
  const excludes = excludeWorkPlanIds
    ? Array.isArray(excludeWorkPlanIds)
      ? [...excludeWorkPlanIds]
      : [excludeWorkPlanIds]
    : []
  const r = await pool.query<{ id: string }>(
    `
    SELECT owpi.id::text
    FROM operational_work_plan_items owpi
    INNER JOIN operational_work_plans owp
      ON owp.id = owpi.work_plan_id
      AND owp.deleted_at IS NULL
      AND owp.status = 'PUBLISHED'
    WHERE owpi.conveyor_operational_plan_item_id = $1::uuid
      AND owpi.deleted_at IS NULL
      AND (
        cardinality($2::uuid[]) = 0
        OR owpi.work_plan_id <> ALL($2::uuid[])
      )
    LIMIT 1
    `,
    [conveyorPlanItemId, excludes],
  )
  return Boolean(r.rows[0])
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
  assigned_team_id: string | null
  planned_date: string
  planned_order: number
  planned_minutes: number | null
  status: string
  notes: string | null
  realized_minutes: number
  activity_operational_status: string | null
  conveyor_operational_plan_item_id: string | null
}

export function parsePlanItemRealizedMinutes(raw: string | number | null | undefined): number {
  if (raw == null || raw === '') return 0
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return Math.max(0, Math.floor(raw))
  }
  const n = Number.parseInt(String(raw), 10)
  return Number.isFinite(n) ? Math.max(0, n) : 0
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
    assigned_team_id: string | null
    planned_date: Date
    planned_order: number
    planned_minutes: number | null
    status: string
    notes: string | null
    realized_minutes: string
    activity_operational_status: string | null
    conveyor_operational_plan_item_id: string | null
  }>(
    `
    WITH realized AS (
      SELECT conveyor_node_id AS step_id, COALESCE(SUM(minutes), 0)::numeric AS realized
      FROM conveyor_time_entries
      WHERE deleted_at IS NULL
      GROUP BY conveyor_node_id
    )
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
      i.assigned_team_id::text,
      i.planned_date,
      i.planned_order,
      i.planned_minutes,
      i.status,
      i.notes,
      COALESCE(realized.realized, 0)::text AS realized_minutes,
      step.operational_status::text AS activity_operational_status,
      i.conveyor_operational_plan_item_id::text
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
    LEFT JOIN realized ON realized.step_id = step.id
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
    assigned_team_id: row.assigned_team_id,
    planned_date: row.planned_date.toISOString().slice(0, 10),
    planned_order: row.planned_order,
    planned_minutes: row.planned_minutes,
    status: row.status,
    notes: row.notes,
    realized_minutes: parsePlanItemRealizedMinutes(row.realized_minutes),
    activity_operational_status: row.activity_operational_status,
    conveyor_operational_plan_item_id: row.conveyor_operational_plan_item_id,
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
      ${STEP_PLANNED_TOTAL_MINUTES_SQL}::text AS planned_minutes,
      COALESCE(realized.realized, 0)::text AS realized_minutes,
      GREATEST(
        0,
        ${STEP_PLANNED_TOTAL_MINUTES_SQL} - COALESCE(realized.realized, 0)
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
      AND ${operationalPlanningBacklogConveyorStatusSql('cv')}
    LEFT JOIN realized ON realized.step_id = step.id
    WHERE step.node_type = 'STEP'
      AND step.deleted_at IS NULL
      AND step.is_active = TRUE
      AND step.operational_status IS DISTINCT FROM 'COMPLETED'
      ${operationalPlanningBacklogExcludeConveyorPlanItemsSql('step', 'cv')}
      ${operationalPlanningBacklogExcludeEmProducaoWithActivePlanSql('cv')}
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
        GREATEST(0, ${STEP_PLANNED_TOTAL_MINUTES_SQL} - COALESCE(realized.realized, 0)) > 0
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

export type WorkPlanItemForSyncApplyRow = {
  id: string
  work_plan_id: string
  week_start_date: string
  week_end_date: string
  conveyor_operational_plan_item_id: string | null
  planned_date: string
  planned_minutes: number | null
  assigned_collaborator_id: string | null
  assigned_team_id: string | null
  status: string
  activity_operational_status: string | null
}

export async function loadWorkPlanItemForSyncApply(
  pool: pg.Pool | pg.PoolClient,
  workPlanItemId: string,
): Promise<WorkPlanItemForSyncApplyRow | null> {
  const r = await pool.query<{
    id: string
    work_plan_id: string
    week_start_date: Date
    week_end_date: Date
    conveyor_operational_plan_item_id: string | null
    planned_date: Date
    planned_minutes: number | null
    assigned_collaborator_id: string | null
    assigned_team_id: string | null
    status: string
    activity_operational_status: string | null
  }>(
    `
    SELECT
      i.id::text,
      i.work_plan_id::text,
      p.week_start_date,
      p.week_end_date,
      i.conveyor_operational_plan_item_id::text,
      i.planned_date,
      i.planned_minutes,
      i.assigned_collaborator_id::text,
      i.assigned_team_id::text,
      i.status,
      step.operational_status::text AS activity_operational_status
    FROM operational_work_plan_items i
    INNER JOIN operational_work_plans p
      ON p.id = i.work_plan_id
      AND p.deleted_at IS NULL
    INNER JOIN conveyor_nodes step
      ON step.id = i.activity_node_id
      AND step.deleted_at IS NULL
    WHERE i.id = $1::uuid
      AND i.deleted_at IS NULL
    `,
    [workPlanItemId],
  )
  const row = r.rows[0]
  if (!row) return null
  return {
    id: row.id,
    work_plan_id: row.work_plan_id,
    week_start_date: row.week_start_date.toISOString().slice(0, 10),
    week_end_date: row.week_end_date.toISOString().slice(0, 10),
    conveyor_operational_plan_item_id: row.conveyor_operational_plan_item_id,
    planned_date: row.planned_date.toISOString().slice(0, 10),
    planned_minutes: row.planned_minutes,
    assigned_collaborator_id: row.assigned_collaborator_id,
    assigned_team_id: row.assigned_team_id,
    status: row.status,
    activity_operational_status: row.activity_operational_status,
  }
}

export type WorkPlanItemConveyorPlanApplyValues = {
  plannedDate: string
  plannedMinutes: number | null
  assignedCollaboratorId: string | null
  assignedTeamId: string | null
}

export async function updateWorkPlanItemFromConveyorPlan(
  client: pg.PoolClient,
  workPlanItemId: string,
  values: WorkPlanItemConveyorPlanApplyValues,
): Promise<void> {
  await client.query(
    `
    UPDATE operational_work_plan_items
    SET
      planned_date = $2::date,
      planned_minutes = $3::int,
      assigned_collaborator_id = $4::uuid,
      assigned_team_id = $5::uuid,
      updated_at = now()
    WHERE id = $1::uuid
      AND deleted_at IS NULL
    `,
    [
      workPlanItemId,
      values.plannedDate,
      values.plannedMinutes,
      values.assignedCollaboratorId,
      values.assignedTeamId,
    ],
  )
}

/** Apontamentos na semana (seg–sex) em STEP sem item ativo no plano semanal. */
export async function listExecutionOutsidePlanEntriesForWeek(
  pool: pg.Pool | pg.PoolClient,
  args: {
    weekStartDate: string
    weekEndDate: string
    workPlanId: string | null
  },
): Promise<ExecutionOutsidePlanEntryRow[]> {
  const r = await pool.query<{
    id: string
    conveyor_id: string
    conveyor_title: string
    activity_node_id: string
    activity_title: string
    task_title: string
    sector_title: string
    collaborator_id: string
    collaborator_name: string
    entry_at: Date
    minutes: number
    entry_origin: 'ASSIGNED' | 'UNASSIGNED_EXCEPTION'
    exception_justification: string | null
    notes: string | null
  }>(
    `
    SELECT
      cte.id::text,
      cv.id::text AS conveyor_id,
      cv.name AS conveyor_title,
      step.id::text AS activity_node_id,
      step.name AS activity_title,
      opt.name AS task_title,
      area.name AS sector_title,
      col.id::text AS collaborator_id,
      col.full_name AS collaborator_name,
      cte.entry_at,
      cte.minutes,
      cte.entry_origin,
      cte.exception_justification,
      cte.notes
    FROM conveyor_time_entries cte
    INNER JOIN conveyor_nodes step
      ON step.id = cte.conveyor_node_id
      AND step.deleted_at IS NULL
      AND step.node_type = 'STEP'
    INNER JOIN conveyors cv
      ON cv.id = cte.conveyor_id
      AND cv.deleted_at IS NULL
    INNER JOIN conveyor_nodes area
      ON area.id = step.parent_id
      AND area.node_type = 'AREA'
      AND area.deleted_at IS NULL
    INNER JOIN conveyor_nodes opt
      ON opt.id = area.parent_id
      AND opt.node_type = 'OPTION'
      AND opt.deleted_at IS NULL
    INNER JOIN collaborators col
      ON col.id = cte.collaborator_id
      AND col.deleted_at IS NULL
    WHERE cte.deleted_at IS NULL
      AND cte.minutes > 0
      AND (cte.entry_at AT TIME ZONE '${EXECUTION_OUTSIDE_PLAN_TIMEZONE}')::date >= $1::date
      AND (cte.entry_at AT TIME ZONE '${EXECUTION_OUTSIDE_PLAN_TIMEZONE}')::date <= $2::date
      AND (
        $3::uuid IS NULL
        OR NOT EXISTS (
          SELECT 1
          FROM operational_work_plan_items i
          WHERE i.work_plan_id = $3::uuid
            AND i.activity_node_id = cte.conveyor_node_id
            AND i.deleted_at IS NULL
            AND i.status <> 'CANCELLED'
        )
      )
    ORDER BY cte.entry_at DESC, cte.id ASC
    `,
    [args.weekStartDate, args.weekEndDate, args.workPlanId],
  )

  return r.rows.map((row) => ({
    id: row.id,
    conveyor_id: row.conveyor_id,
    conveyor_title: row.conveyor_title,
    activity_node_id: row.activity_node_id,
    activity_title: row.activity_title,
    task_title: row.task_title,
    sector_title: row.sector_title,
    collaborator_id: row.collaborator_id,
    collaborator_name: row.collaborator_name,
    entry_at: row.entry_at,
    minutes: row.minutes,
    entry_origin: row.entry_origin,
    exception_justification: row.exception_justification,
    notes: row.notes,
  }))
}

/** Apontamentos na semana (seg–sex) em STEPs ativos — base do histórico operacional. */
export async function listWeekActivityTimeEntriesForWeek(
  pool: pg.Pool | pg.PoolClient,
  args: {
    weekStartDate: string
    weekEndDate: string
    workPlanId: string | null
    fetchLimit: number
  },
): Promise<WeekActivityTimeEntryRow[]> {
  const r = await pool.query<{
    id: string
    occurred_at: Date
    conveyor_id: string
    conveyor_name: string
    activity_node_id: string
    activity_title: string
    task_title: string
    sector_title: string
    collaborator_id: string
    collaborator_name: string
    minutes: number
    entry_origin: 'ASSIGNED' | 'UNASSIGNED_EXCEPTION'
    exception_justification: string | null
    outside_plan: boolean
  }>(
    `
    SELECT
      cte.id::text,
      cte.entry_at AS occurred_at,
      cv.id::text AS conveyor_id,
      cv.name AS conveyor_name,
      step.id::text AS activity_node_id,
      step.name AS activity_title,
      opt.name AS task_title,
      area.name AS sector_title,
      col.id::text AS collaborator_id,
      col.full_name AS collaborator_name,
      cte.minutes,
      cte.entry_origin,
      cte.exception_justification,
      (
        $3::uuid IS NULL
        OR NOT EXISTS (
          SELECT 1
          FROM operational_work_plan_items i
          WHERE i.work_plan_id = $3::uuid
            AND i.activity_node_id = cte.conveyor_node_id
            AND i.deleted_at IS NULL
            AND i.status <> 'CANCELLED'
        )
      ) AS outside_plan
    FROM conveyor_time_entries cte
    INNER JOIN conveyor_nodes step
      ON step.id = cte.conveyor_node_id
      AND step.deleted_at IS NULL
      AND step.node_type = 'STEP'
    INNER JOIN conveyors cv
      ON cv.id = cte.conveyor_id
      AND cv.deleted_at IS NULL
    INNER JOIN conveyor_nodes area
      ON area.id = step.parent_id
      AND area.node_type = 'AREA'
      AND area.deleted_at IS NULL
    INNER JOIN conveyor_nodes opt
      ON opt.id = area.parent_id
      AND opt.node_type = 'OPTION'
      AND opt.deleted_at IS NULL
    INNER JOIN collaborators col
      ON col.id = cte.collaborator_id
      AND col.deleted_at IS NULL
    WHERE cte.deleted_at IS NULL
      AND cte.minutes > 0
      AND (cte.entry_at AT TIME ZONE '${EXECUTION_OUTSIDE_PLAN_TIMEZONE}')::date >= $1::date
      AND (cte.entry_at AT TIME ZONE '${EXECUTION_OUTSIDE_PLAN_TIMEZONE}')::date <= $2::date
    ORDER BY cte.entry_at DESC, cte.id ASC
    LIMIT $4::int
    `,
    [args.weekStartDate, args.weekEndDate, args.workPlanId, args.fetchLimit],
  )

  return r.rows.map((row) => ({
    id: row.id,
    occurred_at: row.occurred_at,
    conveyor_id: row.conveyor_id,
    conveyor_name: row.conveyor_name,
    activity_node_id: row.activity_node_id,
    activity_title: row.activity_title,
    task_title: row.task_title,
    sector_title: row.sector_title,
    collaborator_id: row.collaborator_id,
    collaborator_name: row.collaborator_name,
    minutes: row.minutes,
    entry_origin: row.entry_origin,
    exception_justification: row.exception_justification,
    outside_plan: row.outside_plan,
  }))
}

/** Conclusões e reaberturas de STEP na semana (seg–sex). */
export async function listWeekActivityStepEventsForWeek(
  pool: pg.Pool | pg.PoolClient,
  args: {
    weekStartDate: string
    weekEndDate: string
    fetchLimit: number
  },
): Promise<WeekActivityStepEventRow[]> {
  const r = await pool.query<{
    id: string
    occurred_at: Date
    event_type: 'CONVEYOR_STEP_COMPLETED' | 'CONVEYOR_STEP_REOPENED'
    conveyor_id: string
    conveyor_name: string
    activity_node_id: string
    activity_title: string
    task_title: string
    sector_title: string
    actor_name: string | null
  }>(
    `
    SELECT
      ev.id::text,
      ev.occurred_at,
      ev.event_type,
      cv.id::text AS conveyor_id,
      cv.name AS conveyor_name,
      step.id::text AS activity_node_id,
      step.name AS activity_title,
      opt.name AS task_title,
      area.name AS sector_title,
      COALESCE(col.full_name, au.email) AS actor_name
    FROM conveyor_operational_events ev
    INNER JOIN conveyors cv
      ON cv.id = ev.conveyor_id
      AND cv.deleted_at IS NULL
    INNER JOIN conveyor_nodes step
      ON step.id = ev.node_id
      AND step.deleted_at IS NULL
      AND step.node_type = 'STEP'
    INNER JOIN conveyor_nodes area
      ON area.id = step.parent_id
      AND area.node_type = 'AREA'
      AND area.deleted_at IS NULL
    INNER JOIN conveyor_nodes opt
      ON opt.id = area.parent_id
      AND opt.node_type = 'OPTION'
      AND opt.deleted_at IS NULL
    LEFT JOIN app_users au
      ON au.id = ev.created_by
      AND au.deleted_at IS NULL
    LEFT JOIN collaborators col
      ON col.id = au.collaborator_id
      AND col.deleted_at IS NULL
    WHERE ev.event_type IN ('CONVEYOR_STEP_COMPLETED', 'CONVEYOR_STEP_REOPENED')
      AND ev.node_id IS NOT NULL
      AND (ev.occurred_at AT TIME ZONE '${EXECUTION_OUTSIDE_PLAN_TIMEZONE}')::date >= $1::date
      AND (ev.occurred_at AT TIME ZONE '${EXECUTION_OUTSIDE_PLAN_TIMEZONE}')::date <= $2::date
    ORDER BY ev.occurred_at DESC, ev.id ASC
    LIMIT $3::int
    `,
    [args.weekStartDate, args.weekEndDate, args.fetchLimit],
  )

  return r.rows.map((row) => ({
    id: row.id,
    occurred_at: row.occurred_at,
    event_type: row.event_type,
    conveyor_id: row.conveyor_id,
    conveyor_name: row.conveyor_name,
    activity_node_id: row.activity_node_id,
    activity_title: row.activity_title,
    task_title: row.task_title,
    sector_title: row.sector_title,
    actor_name: row.actor_name,
  }))
}
