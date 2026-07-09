import type pg from 'pg'

export type StepHierarchyRow = {
  step_id: string
  step_name: string
  step_order: number
  planned_minutes: number | null
  planned_quantity: number
  operational_status: string | null
  area_id: string
  area_name: string
  area_order: number
  option_id: string
  option_name: string
  option_order: number
}

/**
 * STEPs da esteira com OPTION e AREA (estrutura completa; todas as opções).
 */
export async function listStepHierarchyForConveyor(
  pool: pg.Pool,
  conveyorId: string,
): Promise<StepHierarchyRow[]> {
  const r = await pool.query<{
    step_id: string
    step_name: string
    step_order: number
    planned_minutes: string | number | null
    planned_quantity: string | number
    operational_status: string | null
    area_id: string
    area_name: string
    area_order: number
    option_id: string
    option_name: string
    option_order: number
  }>(
    `
    SELECT
      step.id::text AS step_id,
      step.name AS step_name,
      step.order_index AS step_order,
      step.planned_minutes,
      step.planned_quantity,
      step.operational_status,
      area.id::text AS area_id,
      area.name AS area_name,
      area.order_index AS area_order,
      opt.id::text AS option_id,
      opt.name AS option_name,
      opt.order_index AS option_order
    FROM conveyor_nodes step
    INNER JOIN conveyor_nodes area
      ON area.id = step.parent_id
      AND area.node_type = 'AREA'
      AND area.deleted_at IS NULL
    INNER JOIN conveyor_nodes opt
      ON opt.id = area.parent_id
      AND opt.node_type = 'OPTION'
      AND opt.deleted_at IS NULL
    WHERE step.conveyor_id = $1::uuid
      AND step.node_type = 'STEP'
      AND step.deleted_at IS NULL
    ORDER BY opt.order_index, area.order_index, step.order_index
    `,
    [conveyorId],
  )
  return r.rows.map((row) => ({
    step_id: row.step_id,
    step_name: row.step_name,
    step_order: row.step_order,
    operational_status: row.operational_status,
    planned_minutes:
      row.planned_minutes == null || row.planned_minutes === ''
        ? null
        : Number(row.planned_minutes),
    planned_quantity: Number(row.planned_quantity) || 1,
    area_id: row.area_id,
    area_name: row.area_name,
    area_order: row.area_order,
    option_id: row.option_id,
    option_name: row.option_name,
    option_order: row.option_order,
  }))
}

/** Soma acumulada de minutos apontados por STEP (`conveyor_node_id`). */
export async function sumRealizedMinutesByStepForConveyor(
  pool: pg.Pool,
  conveyorId: string,
): Promise<Map<string, number>> {
  const r = await pool.query<{ step_id: string; realized: string }>(
    `
    SELECT cte.conveyor_node_id::text AS step_id,
           COALESCE(SUM(cte.minutes), 0)::text AS realized
    FROM conveyor_time_entries cte
    WHERE cte.conveyor_id = $1::uuid
      AND cte.deleted_at IS NULL
    GROUP BY cte.conveyor_node_id
    `,
    [conveyorId],
  )
  const m = new Map<string, number>()
  for (const row of r.rows) {
    m.set(row.step_id, Number.parseInt(row.realized, 10) || 0)
  }
  return m
}

/** Último session_completion_pct não nulo do colaborador por STEP (kiosk evolução). */
export async function getLatestSessionCompletionPctByStepForCollaborator(
  pool: pg.Pool,
  collaboratorId: string,
  conveyorIds: string[],
): Promise<Map<string, number>> {
  if (conveyorIds.length === 0) return new Map()

  const r = await pool.query<{ step_id: string; session_completion_pct: number }>(
    `
    SELECT step_id, session_completion_pct
    FROM (
      SELECT
        cte.conveyor_node_id::text AS step_id,
        cte.session_completion_pct,
        ROW_NUMBER() OVER (
          PARTITION BY cte.conveyor_node_id
          ORDER BY cte.entry_at DESC, cte.created_at DESC, cte.id DESC
        ) AS rn
      FROM conveyor_time_entries cte
      WHERE cte.collaborator_id = $1::uuid
        AND cte.conveyor_id = ANY($2::uuid[])
        AND cte.deleted_at IS NULL
        AND cte.session_completion_pct IS NOT NULL
    ) ranked
    WHERE rn = 1
    `,
    [collaboratorId, conveyorIds],
  )

  const m = new Map<string, number>()
  for (const row of r.rows) {
    m.set(row.step_id, row.session_completion_pct)
  }
  return m
}
