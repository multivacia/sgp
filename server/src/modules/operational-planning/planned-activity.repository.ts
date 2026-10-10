import type pg from 'pg'

/**
 * Regra canônica de "atividade planejada" (TASK `apontamento-somente-planejado`).
 *
 * Item planejado válido: `operational_work_plan_items` não excluído, `status = 'PLANNED'`,
 * pertencente ao plano PUBLICADO VIGENTE da sua semana (o mais recente publicado daquela
 * `week_start_date`). Sem recorte de semana: passado, presente e futuro.
 *
 * Use `PLANNED_ITEMS_CTE` no início de um `WITH`; ele expõe `vigente_plans` e `valid_items`.
 */
export const PLANNED_ITEMS_CTE = `
  vigente_plans AS (
    SELECT DISTINCT ON (wp.week_start_date) wp.id
    FROM operational_work_plans wp
    WHERE wp.status = 'PUBLISHED'
      AND wp.deleted_at IS NULL
    ORDER BY wp.week_start_date, wp.published_at DESC NULLS LAST, wp.updated_at DESC
  ),
  valid_items AS (
    SELECT vi.*
    FROM operational_work_plan_items vi
    INNER JOIN vigente_plans vp ON vp.id = vi.work_plan_id
    WHERE vi.deleted_at IS NULL
      AND vi.status = 'PLANNED'
  )`

export type StepPlanningForCollaborator = {
  /** Há item planejado válido para o colaborador nesta atividade. */
  plannedForCollaborator: boolean
  /** Há item planejado válido para qualquer colaborador nesta atividade. */
  plannedForAnyone: boolean
  /** Soma dos minutos de todos os itens válidos do colaborador (todos os dias); null sem minutos. */
  plannedMinutesForCollaborator: number | null
}

export async function findStepPlanningForCollaborator(
  pool: pg.Pool | pg.PoolClient,
  input: { conveyorId: string; stepNodeId: string; collaboratorId: string },
): Promise<StepPlanningForCollaborator> {
  const r = await pool.query<{
    mine_count: number
    any_count: number
    mine_minutes: string | null
  }>(
    `
    WITH ${PLANNED_ITEMS_CTE}
    SELECT
      COUNT(*) FILTER (WHERE valid_items.assigned_collaborator_id = $3::uuid)::int AS mine_count,
      COUNT(*)::int AS any_count,
      SUM(valid_items.planned_minutes)
        FILTER (WHERE valid_items.assigned_collaborator_id = $3::uuid)::text AS mine_minutes
    FROM valid_items
    WHERE valid_items.conveyor_id = $1::uuid
      AND valid_items.activity_node_id = $2::uuid
    `,
    [input.conveyorId, input.stepNodeId, input.collaboratorId],
  )
  const row = r.rows[0]
  const mineMinutes = row?.mine_minutes == null ? null : Number(row.mine_minutes)
  return {
    plannedForCollaborator: (row?.mine_count ?? 0) > 0,
    plannedForAnyone: (row?.any_count ?? 0) > 0,
    plannedMinutesForCollaborator:
      mineMinutes != null && Number.isFinite(mineMinutes) ? mineMinutes : null,
  }
}

/** Soma dos apontamentos (não excluídos) do colaborador por atividade. */
export async function sumCollaboratorRealizedMinutesByStep(
  pool: pg.Pool | pg.PoolClient,
  collaboratorId: string,
  stepNodeIds: readonly string[],
): Promise<Map<string, number>> {
  const out = new Map<string, number>()
  if (stepNodeIds.length === 0) return out
  const r = await pool.query<{ step_id: string; minutes: string }>(
    `
    SELECT cte.conveyor_node_id::text AS step_id, COALESCE(SUM(cte.minutes), 0)::text AS minutes
    FROM conveyor_time_entries cte
    WHERE cte.deleted_at IS NULL
      AND cte.collaborator_id = $1::uuid
      AND cte.conveyor_node_id = ANY($2::uuid[])
    GROUP BY cte.conveyor_node_id
    `,
    [collaboratorId, [...stepNodeIds]],
  )
  for (const row of r.rows) out.set(row.step_id, Number(row.minutes) || 0)
  return out
}

export type CollaboratorPlannedStepSummary = {
  /** Menor data entre todos os itens válidos do colaborador na atividade. */
  firstPlannedDate: string
  /** Soma dos minutos de todos os itens válidos do colaborador na atividade. */
  plannedMinutes: number | null
}

/** Resumo, por atividade, de todos os itens planejados válidos do colaborador (todos os dias). */
export async function summarizeCollaboratorPlannedSteps(
  pool: pg.Pool | pg.PoolClient,
  collaboratorId: string,
  stepNodeIds: readonly string[],
): Promise<Map<string, CollaboratorPlannedStepSummary>> {
  const out = new Map<string, CollaboratorPlannedStepSummary>()
  if (stepNodeIds.length === 0) return out
  const r = await pool.query<{ step_id: string; first_date: string; minutes: string | null }>(
    `
    WITH ${PLANNED_ITEMS_CTE}
    SELECT
      valid_items.activity_node_id::text AS step_id,
      MIN(valid_items.planned_date)::text AS first_date,
      SUM(valid_items.planned_minutes)::text AS minutes
    FROM valid_items
    WHERE valid_items.assigned_collaborator_id = $1::uuid
      AND valid_items.activity_node_id = ANY($2::uuid[])
    GROUP BY valid_items.activity_node_id
    `,
    [collaboratorId, [...stepNodeIds]],
  )
  for (const row of r.rows) {
    const minutes = row.minutes == null ? null : Number(row.minutes)
    out.set(row.step_id, {
      firstPlannedDate: row.first_date.trim(),
      plannedMinutes: minutes != null && Number.isFinite(minutes) ? minutes : null,
    })
  }
  return out
}
