import type pg from 'pg'
import { AppError } from '../../shared/errors/AppError.js'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'

/** Somente planos publicados vigentes em cada semana autorizam apontamentos.
 * Não contam itens sem responsável, cancelados, movidos, excluídos ou em rascunho.
 */
export const VALID_PUBLISHED_PLANNED_ITEMS_CTE = `
  current_published_plans AS (
    SELECT DISTINCT ON (p.week_start_date) p.id
    FROM operational_work_plans p
    WHERE p.status = 'PUBLISHED' AND p.deleted_at IS NULL
    ORDER BY p.week_start_date, p.published_at DESC NULLS LAST,
             p.updated_at DESC, p.id DESC
  ),
  valid_planned_items AS (
    SELECT i.*
    FROM operational_work_plan_items i
    INNER JOIN current_published_plans p ON p.id = i.work_plan_id
    WHERE i.deleted_at IS NULL
      AND i.status = 'PLANNED'
      AND i.assigned_collaborator_id IS NOT NULL
  )`

export const TIME_ENTRY_NOT_PLANNED_MESSAGE =
  'Esta atividade não está em um planejamento publicado válido. Solicite ao gestor que a inclua no planejamento.'

export type TimeEntryPlanningScope = 'MINE' | 'OTHER' | 'NONE'
export type TimeEntryPlanningEligibility = {
  scope: TimeEntryPlanningScope
  plannedMinutesForCollaborator: number | null
}

/** Consultar antes da gravação, não confiar na lista previamente carregada. */
export async function getTimeEntryPlanningEligibility(
  pool: pg.Pool | pg.PoolClient,
  input: { conveyorId: string; stepNodeId: string; collaboratorId: string },
): Promise<TimeEntryPlanningEligibility> {
  const r = await pool.query<{
    mine_count: number
    any_count: number
    mine_minutes: string | null
  }>(
    `
    WITH ${VALID_PUBLISHED_PLANNED_ITEMS_CTE}
    SELECT
      COUNT(*) FILTER (WHERE vi.assigned_collaborator_id = $3::uuid)::int AS mine_count,
      COUNT(*)::int AS any_count,
      SUM(vi.planned_minutes) FILTER (
        WHERE vi.assigned_collaborator_id = $3::uuid
      )::text AS mine_minutes
    FROM valid_planned_items vi
    WHERE vi.conveyor_id = $1::uuid AND vi.activity_node_id = $2::uuid
    `,
    [input.conveyorId, input.stepNodeId, input.collaboratorId],
  )
  const row = r.rows[0]
  const mineMinutes = row?.mine_minutes == null ? null : Number(row.mine_minutes)
  return {
    scope: (row?.mine_count ?? 0) > 0 ? 'MINE' : (row?.any_count ?? 0) > 0 ? 'OTHER' : 'NONE',
    plannedMinutesForCollaborator:
      mineMinutes != null && Number.isFinite(mineMinutes) ? mineMinutes : null,
  }
}

export async function requireTimeEntryPlanningEligibility(
  pool: pg.Pool | pg.PoolClient,
  input: { conveyorId: string; stepNodeId: string; collaboratorId: string },
): Promise<TimeEntryPlanningEligibility> {
  const result = await getTimeEntryPlanningEligibility(pool, input)
  if (result.scope === 'NONE') {
    throw new AppError(TIME_ENTRY_NOT_PLANNED_MESSAGE, 422, ErrorCodes.TIME_ENTRY_NOT_PLANNED)
  }
  return result
}
