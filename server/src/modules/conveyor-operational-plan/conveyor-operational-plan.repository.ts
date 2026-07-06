import type pg from 'pg'
import { randomUUID } from 'node:crypto'
import type {
  ConveyorOperationalPlanFactoryStatusDb,
  ConveyorOperationalPlanItemSourceKindDb,
  ConveyorOperationalPlanItemStatusDb,
  ConveyorOperationalPlanItemSyncStatusDb,
  ConveyorOperationalPlanStatusDb,
} from './conveyor-operational-plan.dto.js'

export type ConveyorOperationalPlanRow = {
  id: string
  conveyor_id: string
  status: ConveyorOperationalPlanStatusDb
  planned_start_date: string | null
  planned_end_date: string | null
  version: number
  generated_at: string | null
  generated_by: string | null
  approved_at: string | null
  approved_by: string | null
  factory_planning_status: ConveyorOperationalPlanFactoryStatusDb | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type PlanItemEnrichedRow = {
  id: string
  plan_id: string
  conveyor_id: string
  activity_node_id: string
  task_title: string
  sector_title: string
  activity_title: string
  planned_date: string | null
  planned_order: number
  planned_minutes: number | null
  planned_collaborator_id: string | null
  planned_collaborator_name: string | null
  planned_team_id: string | null
  planned_team_name: string | null
  status: ConveyorOperationalPlanItemStatusDb
  source_kind: ConveyorOperationalPlanItemSourceKindDb
  origin_work_plan_item_id: string | null
  sync_status: ConveyorOperationalPlanItemSyncStatusDb | null
  review_required: boolean
  cancellation_reason: string | null
  notes: string | null
  realized_minutes: number
  activity_operational_status: string | null
  created_at: string
  updated_at: string
}

export type StepForPlanItemRow = {
  conveyor_id: string
  node_type: string
  is_active: boolean
  /** Tempo unitário (min/un.) no STEP. */
  planned_minutes: number | null
  planned_quantity: number | null
  default_responsible_id: string | null
}

function mapPlanRow(row: {
  id: string
  conveyor_id: string
  status: ConveyorOperationalPlanStatusDb
  planned_start_date: string | null
  planned_end_date: string | null
  version: number
  generated_at: Date | null
  generated_by: string | null
  approved_at: Date | null
  approved_by: string | null
  factory_planning_status: ConveyorOperationalPlanFactoryStatusDb | null
  notes: string | null
  created_at: Date
  updated_at: Date
}): ConveyorOperationalPlanRow {
  return {
    id: row.id,
    conveyor_id: row.conveyor_id,
    status: row.status,
    planned_start_date: row.planned_start_date?.trim() ?? null,
    planned_end_date: row.planned_end_date?.trim() ?? null,
    version: row.version,
    generated_at: row.generated_at ? row.generated_at.toISOString() : null,
    generated_by: row.generated_by,
    approved_at: row.approved_at ? row.approved_at.toISOString() : null,
    approved_by: row.approved_by,
    factory_planning_status: row.factory_planning_status,
    notes: row.notes,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  }
}

export function parseItemRealizedMinutes(raw: string | number | null | undefined): number {
  if (raw == null || raw === '') return 0
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return Math.max(0, Math.floor(raw))
  }
  const n = Number.parseInt(String(raw), 10)
  return Number.isFinite(n) ? Math.max(0, n) : 0
}

export async function findActivePlanByConveyorId(
  pool: pg.Pool | pg.PoolClient,
  conveyorId: string,
): Promise<ConveyorOperationalPlanRow | null> {
  const r = await pool.query<{
    id: string
    conveyor_id: string
    status: ConveyorOperationalPlanStatusDb
    planned_start_date: string | null
    planned_end_date: string | null
    version: number
    generated_at: Date | null
    generated_by: string | null
    approved_at: Date | null
    approved_by: string | null
    factory_planning_status: ConveyorOperationalPlanFactoryStatusDb | null
    notes: string | null
    created_at: Date
    updated_at: Date
  }>(
    `
    SELECT
      id::text,
      conveyor_id::text,
      status,
      planned_start_date::text,
      planned_end_date::text,
      version,
      generated_at,
      generated_by::text,
      approved_at,
      approved_by::text,
      factory_planning_status,
      notes,
      created_at,
      updated_at
    FROM conveyor_operational_plans
    WHERE conveyor_id = $1::uuid
      AND deleted_at IS NULL
      AND status NOT IN ('CANCELLED', 'COMPLETED')
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [conveyorId],
  )
  const row = r.rows[0]
  return row ? mapPlanRow(row) : null
}

export async function findPlanById(
  pool: pg.Pool | pg.PoolClient,
  planId: string,
): Promise<ConveyorOperationalPlanRow | null> {
  const r = await pool.query<{
    id: string
    conveyor_id: string
    status: ConveyorOperationalPlanStatusDb
    planned_start_date: string | null
    planned_end_date: string | null
    version: number
    generated_at: Date | null
    generated_by: string | null
    approved_at: Date | null
    approved_by: string | null
    factory_planning_status: ConveyorOperationalPlanFactoryStatusDb | null
    notes: string | null
    created_at: Date
    updated_at: Date
  }>(
    `
    SELECT
      id::text,
      conveyor_id::text,
      status,
      planned_start_date::text,
      planned_end_date::text,
      version,
      generated_at,
      generated_by::text,
      approved_at,
      approved_by::text,
      factory_planning_status,
      notes,
      created_at,
      updated_at
    FROM conveyor_operational_plans
    WHERE id = $1::uuid
      AND deleted_at IS NULL
    LIMIT 1
    `,
    [planId],
  )
  const row = r.rows[0]
  return row ? mapPlanRow(row) : null
}

export async function insertPlan(
  client: pg.PoolClient,
  input: {
    conveyorId: string
    plannedStartDate: string | null
    plannedEndDate: string | null
    notes: string | null
  },
): Promise<string> {
  const id = randomUUID()
  await client.query(
    `
    INSERT INTO conveyor_operational_plans (
      id,
      conveyor_id,
      status,
      planned_start_date,
      planned_end_date,
      factory_planning_status,
      notes,
      created_at,
      updated_at
    ) VALUES (
      $1::uuid,
      $2::uuid,
      'DRAFT',
      $3::date,
      $4::date,
      'NOT_SCHEDULED',
      $5::text,
      now(),
      now()
    )
    `,
    [id, input.conveyorId, input.plannedStartDate, input.plannedEndDate, input.notes],
  )
  return id
}

export async function countActivePlanItems(
  pool: pg.Pool | pg.PoolClient,
  planId: string,
): Promise<number> {
  const r = await pool.query<{ c: string }>(
    `
    SELECT COUNT(*)::text AS c
    FROM conveyor_operational_plan_items
    WHERE plan_id = $1::uuid
      AND deleted_at IS NULL
      AND status <> 'CANCELLED'
    `,
    [planId],
  )
  return Number.parseInt(r.rows[0]?.c ?? '0', 10) || 0
}

/** Itens ativos com vínculo ao Planejamento da Fábrica (bloqueio defensivo de regeneração). */
export async function countFactoryLinkedActivePlanItems(
  pool: pg.Pool | pg.PoolClient,
  planId: string,
): Promise<number> {
  const r = await pool.query<{ c: string }>(
    `
    SELECT COUNT(*)::text AS c
    FROM conveyor_operational_plan_items i
    WHERE i.plan_id = $1::uuid
      AND i.deleted_at IS NULL
      AND i.status <> 'CANCELLED'
      AND (
        i.origin_work_plan_item_id IS NOT NULL
        OR i.sync_status = 'SYNCED'
        OR EXISTS (
          SELECT 1
          FROM operational_work_plan_items owpi
          INNER JOIN operational_work_plans owp
            ON owp.id = owpi.work_plan_id
            AND owp.deleted_at IS NULL
            AND owp.status = 'PUBLISHED'
          WHERE owpi.conveyor_operational_plan_item_id = i.id
            AND owpi.deleted_at IS NULL
        )
      )
    `,
    [planId],
  )
  return Number.parseInt(r.rows[0]?.c ?? '0', 10) || 0
}

export async function countPlanItemsRequiringReview(
  pool: pg.Pool | pg.PoolClient,
  planId: string,
): Promise<number> {
  const r = await pool.query<{ c: string }>(
    `
    SELECT COUNT(*)::text AS c
    FROM conveyor_operational_plan_items
    WHERE plan_id = $1::uuid
      AND deleted_at IS NULL
      AND status <> 'CANCELLED'
      AND (review_required = TRUE OR status = 'NEEDS_REVIEW')
    `,
    [planId],
  )
  return Number.parseInt(r.rows[0]?.c ?? '0', 10) || 0
}

export async function loadStepTeamIdsByActivityIds(
  pool: pg.Pool | pg.PoolClient,
  conveyorId: string,
  activityNodeIds: string[],
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>()
  if (activityNodeIds.length === 0) return map

  const r = await pool.query<{ conveyor_node_id: string; team_ids: string[] | null }>(
    `
    SELECT
      cna.conveyor_node_id::text,
      array_agg(DISTINCT cna.team_id::text ORDER BY cna.team_id::text) AS team_ids
    FROM conveyor_node_assignees cna
    INNER JOIN teams t ON t.id = cna.team_id AND t.deleted_at IS NULL
    WHERE cna.conveyor_id = $1::uuid
      AND cna.deleted_at IS NULL
      AND cna.assignment_type = 'TEAM'
      AND cna.team_id IS NOT NULL
      AND cna.conveyor_node_id = ANY($2::uuid[])
    GROUP BY cna.conveyor_node_id
    `,
    [conveyorId, activityNodeIds],
  )

  for (const row of r.rows) {
    map.set(row.conveyor_node_id, row.team_ids ?? [])
  }
  for (const id of activityNodeIds) {
    if (!map.has(id)) map.set(id, [])
  }
  return map
}

export type PlanItemPatchRow = {
  id: string
  plan_id: string
  conveyor_id: string
  activity_node_id: string
  planned_date: string | null
  planned_order: number
  planned_minutes: number | null
  planned_collaborator_id: string | null
  planned_team_id: string | null
  status: ConveyorOperationalPlanItemStatusDb
  notes: string | null
}

export async function findPlanItemForPatch(
  pool: pg.Pool | pg.PoolClient,
  itemId: string,
): Promise<PlanItemPatchRow | null> {
  const r = await pool.query<{
    id: string
    plan_id: string
    conveyor_id: string
    activity_node_id: string
    planned_date: Date | null
    planned_order: number
    planned_minutes: number | null
    planned_collaborator_id: string | null
    planned_team_id: string | null
    status: ConveyorOperationalPlanItemStatusDb
    notes: string | null
  }>(
    `
    SELECT
      id::text,
      plan_id::text,
      conveyor_id::text,
      activity_node_id::text,
      planned_date,
      planned_order,
      planned_minutes,
      planned_collaborator_id::text,
      planned_team_id::text,
      status,
      notes
    FROM conveyor_operational_plan_items
    WHERE id = $1::uuid
      AND deleted_at IS NULL
    `,
    [itemId],
  )
  const row = r.rows[0]
  if (!row) return null
  return {
    id: row.id,
    plan_id: row.plan_id,
    conveyor_id: row.conveyor_id,
    activity_node_id: row.activity_node_id,
    planned_date: row.planned_date ? row.planned_date.toISOString().slice(0, 10) : null,
    planned_order: row.planned_order,
    planned_minutes: row.planned_minutes,
    planned_collaborator_id: row.planned_collaborator_id,
    planned_team_id: row.planned_team_id,
    status: row.status,
    notes: row.notes,
  }
}

export async function listEnrichedItemsForPlan(
  pool: pg.Pool | pg.PoolClient,
  planId: string,
): Promise<PlanItemEnrichedRow[]> {
  const r = await pool.query<{
    id: string
    plan_id: string
    conveyor_id: string
    activity_node_id: string
    task_title: string
    sector_title: string
    activity_title: string
    planned_date: Date | null
    planned_order: number
    planned_minutes: number | null
    planned_collaborator_id: string | null
    planned_collaborator_name: string | null
    planned_team_id: string | null
    planned_team_name: string | null
    status: ConveyorOperationalPlanItemStatusDb
    source_kind: ConveyorOperationalPlanItemSourceKindDb
    origin_work_plan_item_id: string | null
    sync_status: ConveyorOperationalPlanItemSyncStatusDb | null
    review_required: boolean
    cancellation_reason: string | null
    notes: string | null
    realized_minutes: string
    activity_operational_status: string | null
    created_at: Date
    updated_at: Date
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
      i.plan_id::text,
      i.conveyor_id::text,
      step.id::text AS activity_node_id,
      opt.name AS task_title,
      area.name AS sector_title,
      step.name AS activity_title,
      i.planned_date,
      i.planned_order,
      i.planned_minutes,
      i.planned_collaborator_id::text,
      col.full_name AS planned_collaborator_name,
      i.planned_team_id::text,
      tm.name AS planned_team_name,
      i.status,
      i.source_kind,
      i.origin_work_plan_item_id::text,
      i.sync_status,
      i.review_required,
      i.cancellation_reason,
      i.notes,
      COALESCE(realized.realized, 0)::text AS realized_minutes,
      step.operational_status::text AS activity_operational_status,
      i.created_at,
      i.updated_at
    FROM conveyor_operational_plan_items i
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
      ON col.id = i.planned_collaborator_id
      AND col.deleted_at IS NULL
    LEFT JOIN teams tm
      ON tm.id = i.planned_team_id
      AND tm.deleted_at IS NULL
    LEFT JOIN realized ON realized.step_id = step.id
    WHERE i.plan_id = $1::uuid
      AND i.deleted_at IS NULL
    ORDER BY
      i.planned_date ASC NULLS LAST,
      i.planned_order ASC,
      i.id ASC
    `,
    [planId],
  )

  return r.rows.map((row) => ({
    id: row.id,
    plan_id: row.plan_id,
    conveyor_id: row.conveyor_id,
    activity_node_id: row.activity_node_id,
    task_title: row.task_title,
    sector_title: row.sector_title,
    activity_title: row.activity_title,
    planned_date: row.planned_date ? row.planned_date.toISOString().slice(0, 10) : null,
    planned_order: row.planned_order,
    planned_minutes: row.planned_minutes,
    planned_collaborator_id: row.planned_collaborator_id,
    planned_collaborator_name: row.planned_collaborator_name,
    planned_team_id: row.planned_team_id,
    planned_team_name: row.planned_team_name,
    status: row.status,
    source_kind: row.source_kind,
    origin_work_plan_item_id: row.origin_work_plan_item_id,
    sync_status: row.sync_status,
    review_required: row.review_required,
    cancellation_reason: row.cancellation_reason,
    notes: row.notes,
    realized_minutes: parseItemRealizedMinutes(row.realized_minutes),
    activity_operational_status: row.activity_operational_status,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  }))
}

export async function loadStepForPlanItem(
  pool: pg.Pool | pg.PoolClient,
  conveyorId: string,
  activityNodeId: string,
): Promise<StepForPlanItemRow | null> {
  const r = await pool.query<{
    conveyor_id: string
    node_type: string
    is_active: boolean
    planned_minutes: number | null
    planned_quantity: number | null
    default_responsible_id: string | null
  }>(
    `
    SELECT
      cn.conveyor_id::text,
      cn.node_type::text,
      cn.is_active,
      cn.planned_minutes,
      cn.planned_quantity,
      cn.default_responsible_id::text
    FROM conveyor_nodes cn
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
    node_type: row.node_type,
    is_active: row.is_active,
    planned_minutes: row.planned_minutes,
    planned_quantity: row.planned_quantity,
    default_responsible_id: row.default_responsible_id,
  }
}

export async function existsPlanItemForActivity(
  pool: pg.Pool | pg.PoolClient,
  planId: string,
  activityNodeId: string,
  excludeItemId?: string,
): Promise<boolean> {
  const r = await pool.query<{ id: string }>(
    `
    SELECT id::text
    FROM conveyor_operational_plan_items
    WHERE plan_id = $1::uuid
      AND activity_node_id = $2::uuid
      AND deleted_at IS NULL
      AND ($3::uuid IS NULL OR id <> $3::uuid)
    LIMIT 1
    `,
    [planId, activityNodeId, excludeItemId ?? null],
  )
  return Boolean(r.rows[0])
}

export type ConveyorPlanGenerationStepRow = {
  activity_node_id: string
  task_name: string
  area_name: string
  activity_name: string
  option_order_index: number
  area_order_index: number
  step_order_index: number
  /** Tempo unitário (min/un.) no STEP. */
  planned_minutes: number | null
  planned_quantity: number | null
  default_responsible_id: string | null
  collaborator_assignee_ids: string[]
  team_assignee_ids: string[]
}

export async function listConveyorStepsForPlanGeneration(
  pool: pg.Pool | pg.PoolClient,
  conveyorId: string,
): Promise<ConveyorPlanGenerationStepRow[]> {
  const r = await pool.query<{
    activity_node_id: string
    task_name: string
    area_name: string
    activity_name: string
    option_order_index: number
    area_order_index: number
    step_order_index: number
    planned_minutes: number | null
    planned_quantity: number | null
    default_responsible_id: string | null
    collaborator_assignee_ids: string[] | null
    team_assignee_ids: string[] | null
  }>(
    `
    WITH step_collaborators AS (
      SELECT
        cna.conveyor_node_id,
        array_agg(DISTINCT cna.collaborator_id::text ORDER BY cna.collaborator_id::text) AS collaborator_ids
      FROM conveyor_node_assignees cna
      INNER JOIN collaborators c ON c.id = cna.collaborator_id AND c.deleted_at IS NULL
      WHERE cna.conveyor_id = $1::uuid
        AND cna.deleted_at IS NULL
        AND cna.assignment_type = 'COLLABORATOR'
        AND cna.collaborator_id IS NOT NULL
      GROUP BY cna.conveyor_node_id
    ),
    step_teams AS (
      SELECT
        cna.conveyor_node_id,
        array_agg(DISTINCT cna.team_id::text ORDER BY cna.team_id::text) AS team_ids
      FROM conveyor_node_assignees cna
      INNER JOIN teams t ON t.id = cna.team_id AND t.deleted_at IS NULL
      WHERE cna.conveyor_id = $1::uuid
        AND cna.deleted_at IS NULL
        AND cna.assignment_type = 'TEAM'
        AND cna.team_id IS NOT NULL
      GROUP BY cna.conveyor_node_id
    )
    SELECT
      step.id::text AS activity_node_id,
      opt.name AS task_name,
      area.name AS area_name,
      step.name AS activity_name,
      opt.order_index AS option_order_index,
      area.order_index AS area_order_index,
      step.order_index AS step_order_index,
      step.planned_minutes,
      step.planned_quantity,
      step.default_responsible_id::text,
      COALESCE(sc.collaborator_ids, ARRAY[]::text[]) AS collaborator_assignee_ids,
      COALESCE(st.team_ids, ARRAY[]::text[]) AS team_assignee_ids
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
    LEFT JOIN step_collaborators sc ON sc.conveyor_node_id = step.id
    LEFT JOIN step_teams st ON st.conveyor_node_id = step.id
    WHERE step.conveyor_id = $1::uuid
      AND step.node_type = 'STEP'
      AND step.deleted_at IS NULL
      AND step.is_active = TRUE
    ORDER BY
      opt.order_index ASC,
      opt.id ASC,
      area.order_index ASC,
      area.id ASC,
      step.order_index ASC,
      step.id ASC
    `,
    [conveyorId],
  )

  return r.rows.map((row) => ({
    activity_node_id: row.activity_node_id,
    task_name: row.task_name,
    area_name: row.area_name,
    activity_name: row.activity_name,
    option_order_index: row.option_order_index,
    area_order_index: row.area_order_index,
    step_order_index: row.step_order_index,
    planned_minutes: row.planned_minutes,
    planned_quantity: row.planned_quantity,
    default_responsible_id: row.default_responsible_id,
    collaborator_assignee_ids: row.collaborator_assignee_ids ?? [],
    team_assignee_ids: row.team_assignee_ids ?? [],
  }))
}

export async function softDeleteActivePlanItemsForPlan(
  client: pg.PoolClient,
  planId: string,
): Promise<number> {
  const r = await client.query<{ id: string }>(
    `
    UPDATE conveyor_operational_plan_items
    SET deleted_at = now(), updated_at = now()
    WHERE plan_id = $1::uuid
      AND deleted_at IS NULL
      AND status <> 'CANCELLED'
    RETURNING id::text
    `,
    [planId],
  )
  return r.rowCount ?? r.rows.length
}

export async function insertGeneratedPlanItem(
  client: pg.PoolClient,
  input: {
    planId: string
    conveyorId: string
    activityNodeId: string
    plannedDate: string
    plannedOrder: number
    plannedMinutes: number
    plannedCollaboratorId: string | null
    plannedTeamId: string | null
    status: ConveyorOperationalPlanItemStatusDb
    reviewRequired: boolean
  },
): Promise<string> {
  const id = randomUUID()
  await client.query(
    `
    INSERT INTO conveyor_operational_plan_items (
      id,
      plan_id,
      conveyor_id,
      activity_node_id,
      planned_date,
      planned_order,
      planned_minutes,
      planned_collaborator_id,
      planned_team_id,
      status,
      source_kind,
      review_required,
      created_at,
      updated_at
    ) VALUES (
      $1::uuid,
      $2::uuid,
      $3::uuid,
      $4::uuid,
      $5::date,
      $6::int,
      $7::int,
      $8::uuid,
      $9::uuid,
      $10::varchar,
      'GENERATED',
      $11::boolean,
      now(),
      now()
    )
    `,
    [
      id,
      input.planId,
      input.conveyorId,
      input.activityNodeId,
      input.plannedDate,
      input.plannedOrder,
      input.plannedMinutes,
      input.plannedCollaboratorId,
      input.plannedTeamId,
      input.status,
      input.reviewRequired,
    ],
  )
  return id
}

export async function updatePlanAfterGeneration(
  client: pg.PoolClient,
  planId: string,
  input: {
    plannedStartDate: string
    plannedEndDate: string | null
    generatedByUserId: string
  },
): Promise<void> {
  await client.query(
    `
    UPDATE conveyor_operational_plans
    SET
      planned_start_date = $2::date,
      planned_end_date = $3::date,
      generated_at = now(),
      generated_by = $4::uuid,
      updated_at = now()
    WHERE id = $1::uuid
      AND deleted_at IS NULL
    `,
    [planId, input.plannedStartDate, input.plannedEndDate, input.generatedByUserId],
  )
}

export async function insertPlanItem(
  client: pg.PoolClient,
  input: {
    planId: string
    conveyorId: string
    activityNodeId: string
    plannedDate: string | null
    plannedOrder: number
    plannedMinutes: number | null
    plannedCollaboratorId: string | null
    plannedTeamId: string | null
    notes: string | null
  },
): Promise<string> {
  const id = randomUUID()
  await client.query(
    `
    INSERT INTO conveyor_operational_plan_items (
      id,
      plan_id,
      conveyor_id,
      activity_node_id,
      planned_date,
      planned_order,
      planned_minutes,
      planned_collaborator_id,
      planned_team_id,
      status,
      source_kind,
      notes,
      created_at,
      updated_at
    ) VALUES (
      $1::uuid,
      $2::uuid,
      $3::uuid,
      $4::uuid,
      $5::date,
      $6::int,
      $7::int,
      $8::uuid,
      $9::uuid,
      'PLANNED',
      'MANUAL',
      $10::text,
      now(),
      now()
    )
    `,
    [
      id,
      input.planId,
      input.conveyorId,
      input.activityNodeId,
      input.plannedDate,
      input.plannedOrder,
      input.plannedMinutes,
      input.plannedCollaboratorId,
      input.plannedTeamId,
      input.notes,
    ],
  )
  return id
}

export async function findPlanItemById(
  pool: pg.Pool | pg.PoolClient,
  itemId: string,
): Promise<{ id: string; plan_id: string; conveyor_id: string } | null> {
  const r = await pool.query<{ id: string; plan_id: string; conveyor_id: string }>(
    `
    SELECT id::text, plan_id::text, conveyor_id::text
    FROM conveyor_operational_plan_items
    WHERE id = $1::uuid
      AND deleted_at IS NULL
    `,
    [itemId],
  )
  return r.rows[0] ?? null
}

export async function updatePlanItem(
  client: pg.PoolClient,
  itemId: string,
  patch: {
    plannedDate?: string | null
    plannedOrder?: number
    plannedMinutes?: number | null
    plannedCollaboratorId?: string | null
    plannedTeamId?: string | null
    status?: ConveyorOperationalPlanItemStatusDb
    reviewRequired?: boolean
    notes?: string | null
  },
): Promise<void> {
  const sets: string[] = ['updated_at = now()']
  const vals: unknown[] = []
  let i = 1

  if (patch.plannedDate !== undefined) {
    sets.push(`planned_date = $${i}::date`)
    vals.push(patch.plannedDate)
    i += 1
  }
  if (patch.plannedOrder !== undefined) {
    sets.push(`planned_order = $${i}::int`)
    vals.push(patch.plannedOrder)
    i += 1
  }
  if (patch.plannedMinutes !== undefined) {
    sets.push(`planned_minutes = $${i}::int`)
    vals.push(patch.plannedMinutes)
    i += 1
  }
  if (patch.plannedCollaboratorId !== undefined) {
    sets.push(`planned_collaborator_id = $${i}::uuid`)
    vals.push(patch.plannedCollaboratorId)
    i += 1
  }
  if (patch.plannedTeamId !== undefined) {
    sets.push(`planned_team_id = $${i}::uuid`)
    vals.push(patch.plannedTeamId)
    i += 1
  }
  if (patch.status !== undefined) {
    sets.push(`status = $${i}::varchar`)
    vals.push(patch.status)
    i += 1
  }
  if (patch.reviewRequired !== undefined) {
    sets.push(`review_required = $${i}::boolean`)
    vals.push(patch.reviewRequired)
    i += 1
  }
  if (patch.notes !== undefined) {
    sets.push(`notes = $${i}::text`)
    vals.push(patch.notes)
    i += 1
  }

  vals.push(itemId)
  await client.query(
    `UPDATE conveyor_operational_plan_items SET ${sets.join(', ')} WHERE id = $${i}::uuid AND deleted_at IS NULL`,
    vals,
  )
}

export async function approvePlan(
  client: pg.PoolClient,
  planId: string,
  approvedByUserId: string,
): Promise<boolean> {
  const r = await client.query<{ id: string }>(
    `
    UPDATE conveyor_operational_plans
    SET
      status = 'APPROVED',
      approved_at = now(),
      approved_by = $2::uuid,
      factory_planning_status = 'NOT_SCHEDULED',
      updated_at = now()
    WHERE id = $1::uuid
      AND deleted_at IS NULL
      AND status = 'DRAFT'
    RETURNING id::text
    `,
    [planId, approvedByUserId],
  )
  return Boolean(r.rows[0])
}

export async function sendPlanToFactory(
  client: pg.PoolClient,
  planId: string,
): Promise<boolean> {
  const r = await client.query<{ id: string }>(
    `
    UPDATE conveyor_operational_plans
    SET
      status = 'WAITING_FACTORY_PLANNING',
      factory_planning_status = 'NOT_SCHEDULED',
      updated_at = now()
    WHERE id = $1::uuid
      AND deleted_at IS NULL
      AND status = 'APPROVED'
    RETURNING id::text
    `,
    [planId],
  )
  return Boolean(r.rows[0])
}

export async function touchPlanUpdatedAt(
  client: pg.PoolClient,
  planId: string,
): Promise<void> {
  await client.query(
    `UPDATE conveyor_operational_plans SET updated_at = now() WHERE id = $1::uuid AND deleted_at IS NULL`,
    [planId],
  )
}

export async function clearConveyorPlanItemFactoryLink(
  client: pg.PoolClient,
  conveyorPlanItemId: string,
): Promise<string | null> {
  const r = await client.query<{ plan_id: string }>(
    `
    UPDATE conveyor_operational_plan_items
    SET
      origin_work_plan_item_id = NULL,
      sync_status = 'PENDING',
      review_required = false,
      updated_at = now()
    WHERE id = $1::uuid
      AND deleted_at IS NULL
    RETURNING plan_id::text
    `,
    [conveyorPlanItemId],
  )
  return r.rows[0]?.plan_id ?? null
}

export async function linkConveyorPlanItemToWorkPlanItem(
  client: pg.PoolClient,
  conveyorPlanItemId: string,
  workPlanItemId: string,
): Promise<string | null> {
  const r = await client.query<{ plan_id: string }>(
    `
    UPDATE conveyor_operational_plan_items
    SET
      origin_work_plan_item_id = $2::uuid,
      sync_status = 'SYNCED',
      review_required = false,
      updated_at = now()
    WHERE id = $1::uuid
      AND deleted_at IS NULL
    RETURNING plan_id::text
    `,
    [conveyorPlanItemId, workPlanItemId],
  )
  return r.rows[0]?.plan_id ?? null
}

export async function clearConveyorPlanItemsByOriginWorkPlanItemIds(
  client: pg.PoolClient,
  workPlanItemIds: string[],
): Promise<string[]> {
  if (workPlanItemIds.length === 0) return []
  const r = await client.query<{ plan_id: string }>(
    `
    UPDATE conveyor_operational_plan_items
    SET
      origin_work_plan_item_id = NULL,
      sync_status = 'PENDING',
      review_required = false,
      updated_at = now()
    WHERE origin_work_plan_item_id = ANY($1::uuid[])
      AND deleted_at IS NULL
    RETURNING plan_id::text
    `,
    [workPlanItemIds],
  )
  return [...new Set(r.rows.map((row) => row.plan_id))]
}

export async function recalculateConveyorPlanFactoryStatuses(
  client: pg.PoolClient,
  planIds: string[],
): Promise<void> {
  const unique = [...new Set(planIds.filter(Boolean))]
  for (const planId of unique) {
    const r = await client.query<{
      active_count: string
      linked_count: string
    }>(
      `
      SELECT
        COUNT(*) FILTER (
          WHERE status NOT IN ('CANCELLED', 'COMPLETED')
        )::text AS active_count,
        COUNT(*) FILTER (
          WHERE status NOT IN ('CANCELLED', 'COMPLETED')
            AND (
              origin_work_plan_item_id IS NOT NULL
              OR EXISTS (
                SELECT 1
                FROM operational_work_plan_items owpi
                INNER JOIN operational_work_plans owp
                  ON owp.id = owpi.work_plan_id
                  AND owp.deleted_at IS NULL
                  AND owp.status = 'PUBLISHED'
                WHERE owpi.conveyor_operational_plan_item_id = conveyor_operational_plan_items.id
                  AND owpi.deleted_at IS NULL
              )
            )
        )::text AS linked_count
      FROM conveyor_operational_plan_items
      WHERE plan_id = $1::uuid
        AND deleted_at IS NULL
      `,
      [planId],
    )
    const active = Number.parseInt(r.rows[0]?.active_count ?? '0', 10) || 0
    const linked = Number.parseInt(r.rows[0]?.linked_count ?? '0', 10) || 0

    let planStatus: ConveyorOperationalPlanStatusDb | null = null
    let factoryStatus: ConveyorOperationalPlanFactoryStatusDb | null = null

    if (active === 0) {
      factoryStatus = 'NOT_SCHEDULED'
    } else if (linked === 0) {
      planStatus = 'WAITING_FACTORY_PLANNING'
      factoryStatus = 'NOT_SCHEDULED'
    } else if (linked >= active) {
      planStatus = 'FULLY_PLANNED_IN_FACTORY'
      factoryStatus = 'FULLY_SCHEDULED'
    } else {
      planStatus = 'PARTIALLY_PLANNED_IN_FACTORY'
      factoryStatus = 'PARTIALLY_SCHEDULED'
    }

    const sets: string[] = ['updated_at = now()']
    const vals: unknown[] = []
    let i = 1
    if (planStatus) {
      sets.push(`status = $${i}::varchar`)
      vals.push(planStatus)
      i += 1
    }
    if (factoryStatus) {
      sets.push(`factory_planning_status = $${i}::varchar`)
      vals.push(factoryStatus)
      i += 1
    }
    vals.push(planId)
    await client.query(
      `
      UPDATE conveyor_operational_plans
      SET ${sets.join(', ')}
      WHERE id = $${i}::uuid
        AND deleted_at IS NULL
        AND status IN (
          'WAITING_FACTORY_PLANNING',
          'PARTIALLY_PLANNED_IN_FACTORY',
          'FULLY_PLANNED_IN_FACTORY'
        )
      `,
      vals,
    )
  }
}

export type ConveyorPlanItemSyncRefreshRow = {
  id: string
  planned_date: string | null
  planned_minutes: number | null
  planned_collaborator_id: string | null
  planned_team_id: string | null
  status: ConveyorOperationalPlanItemStatusDb
  origin_work_plan_item_id: string | null
  sync_status: ConveyorOperationalPlanItemSyncStatusDb | null
  review_required: boolean
}

export type LinkedFactoryItemSyncRow = {
  id: string
  conveyor_operational_plan_item_id: string | null
  planned_date: string
  planned_minutes: number | null
  assigned_collaborator_id: string | null
  assigned_team_id: string | null
  status: string
}

export async function listConveyorPlanItemsForSyncRefresh(
  client: pg.PoolClient,
  planId: string,
): Promise<ConveyorPlanItemSyncRefreshRow[]> {
  const r = await client.query<{
    id: string
    planned_date: string | null
    planned_minutes: number | null
    planned_collaborator_id: string | null
    planned_team_id: string | null
    status: ConveyorOperationalPlanItemStatusDb
    origin_work_plan_item_id: string | null
    sync_status: ConveyorOperationalPlanItemSyncStatusDb | null
    review_required: boolean
  }>(
    `
    SELECT
      id::text,
      planned_date::text,
      planned_minutes,
      planned_collaborator_id::text,
      planned_team_id::text,
      status,
      origin_work_plan_item_id::text,
      sync_status,
      review_required
    FROM conveyor_operational_plan_items
    WHERE plan_id = $1::uuid
      AND deleted_at IS NULL
    `,
    [planId],
  )
  return r.rows.map((row) => ({
    id: row.id,
    planned_date: row.planned_date?.trim() ?? null,
    planned_minutes: row.planned_minutes,
    planned_collaborator_id: row.planned_collaborator_id,
    planned_team_id: row.planned_team_id,
    status: row.status,
    origin_work_plan_item_id: row.origin_work_plan_item_id,
    sync_status: row.sync_status,
    review_required: row.review_required,
  }))
}

export async function listLinkedFactoryItemsForConveyorPlan(
  client: pg.PoolClient,
  planId: string,
): Promise<LinkedFactoryItemSyncRow[]> {
  const r = await client.query<{
    id: string
    conveyor_operational_plan_item_id: string | null
    planned_date: string
    planned_minutes: number | null
    assigned_collaborator_id: string | null
    assigned_team_id: string | null
    status: string
  }>(
    `
    SELECT
      owpi.id::text,
      owpi.conveyor_operational_plan_item_id::text,
      owpi.planned_date::text,
      owpi.planned_minutes,
      owpi.assigned_collaborator_id::text,
      owpi.assigned_team_id::text,
      owpi.status
    FROM operational_work_plan_items owpi
    WHERE owpi.deleted_at IS NULL
      AND (
        owpi.conveyor_operational_plan_item_id IN (
          SELECT i.id
          FROM conveyor_operational_plan_items i
          WHERE i.plan_id = $1::uuid
            AND i.deleted_at IS NULL
        )
        OR owpi.id IN (
          SELECT i.origin_work_plan_item_id
          FROM conveyor_operational_plan_items i
          WHERE i.plan_id = $1::uuid
            AND i.deleted_at IS NULL
            AND i.origin_work_plan_item_id IS NOT NULL
        )
      )
    `,
    [planId],
  )
  return r.rows.map((row) => ({
    id: row.id,
    conveyor_operational_plan_item_id: row.conveyor_operational_plan_item_id,
    planned_date: row.planned_date.trim(),
    planned_minutes: row.planned_minutes,
    assigned_collaborator_id: row.assigned_collaborator_id,
    assigned_team_id: row.assigned_team_id,
    status: row.status,
  }))
}

export async function updateConveyorPlanItemSyncFields(
  client: pg.PoolClient,
  itemId: string,
  syncStatus: ConveyorOperationalPlanItemSyncStatusDb,
  reviewRequired: boolean,
): Promise<void> {
  await client.query(
    `
    UPDATE conveyor_operational_plan_items
    SET
      sync_status = $2::varchar,
      review_required = $3::boolean,
      updated_at = now()
    WHERE id = $1::uuid
      AND deleted_at IS NULL
    `,
    [itemId, syncStatus, reviewRequired],
  )
}

export type ConveyorPlanItemForWeekSyncRow = {
  id: string
  planned_date: string | null
  planned_minutes: number | null
  planned_collaborator_id: string | null
  planned_team_id: string | null
  status: string
  review_required: boolean
  origin_work_plan_item_id: string | null
}

export async function loadConveyorPlanItemsForWeekSync(
  pool: pg.Pool | pg.PoolClient,
  conveyorPlanItemIds: string[],
): Promise<Map<string, ConveyorPlanItemForWeekSyncRow>> {
  if (conveyorPlanItemIds.length === 0) return new Map()
  const r = await pool.query<{
    id: string
    planned_date: string | null
    planned_minutes: number | null
    planned_collaborator_id: string | null
    planned_team_id: string | null
    status: string
    review_required: boolean
    origin_work_plan_item_id: string | null
  }>(
    `
    SELECT
      id::text,
      planned_date::text,
      planned_minutes,
      planned_collaborator_id::text,
      planned_team_id::text,
      status,
      review_required,
      origin_work_plan_item_id::text
    FROM conveyor_operational_plan_items
    WHERE id = ANY($1::uuid[])
      AND deleted_at IS NULL
    `,
    [conveyorPlanItemIds],
  )
  const map = new Map<string, ConveyorPlanItemForWeekSyncRow>()
  for (const row of r.rows) {
    map.set(row.id, {
      id: row.id,
      planned_date: row.planned_date?.trim() ?? null,
      planned_minutes: row.planned_minutes,
      planned_collaborator_id: row.planned_collaborator_id,
      planned_team_id: row.planned_team_id,
      status: row.status,
      review_required: row.review_required,
      origin_work_plan_item_id: row.origin_work_plan_item_id,
    })
  }
  return map
}
