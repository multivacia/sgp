import type pg from 'pg'
import { mondayOfWeekContaining } from '../modules/operational-planning/operational-planning.week.js'

let weekCounter = 0
const createdPlanIds = new Set<string>()
const createdItemIds = new Set<string>()

/**
 * Semana futura exclusiva por chamada (a partir de 2040), para não colidir com planos de
 * outros testes que apagam/republicam semanas. A regra canônica considera qualquer semana.
 */
function uniqueFutureWeekMonday(): string {
  weekCounter += 1
  const base = Date.UTC(2040, 0, 2) + (Math.floor(Math.random() * 4000) + weekCounter) * 7 * 86400000
  return mondayOfWeekContaining(new Date(base).toISOString().slice(0, 10))
}

/**
 * Publica um plano numa semana futura exclusiva com um item PLANNED para o colaborador.
 * Torna a atividade "planejada" pela regra de `apontamento-somente-planejado`.
 */
export async function seedPublishedPlanItem(
  pool: pg.Pool,
  input: {
    conveyorId: string
    stepNodeId: string
    collaboratorId: string
    createdByUserId: string
    plannedMinutes?: number | null
    /** Data explícita do item; sem ela usa a segunda-feira de uma semana futura exclusiva. */
    plannedDate?: string
  },
): Promise<{ planId: string; itemId: string; plannedDate: string }> {
  const plannedDate = input.plannedDate ?? uniqueFutureWeekMonday()
  const weekStart = mondayOfWeekContaining(plannedDate)
  const existing = await pool.query<{ id: string }>(
    `
    SELECT id::text FROM operational_work_plans
    WHERE week_start_date = $1::date AND status = 'PUBLISHED' AND deleted_at IS NULL
    ORDER BY published_at DESC NULLS LAST, updated_at DESC
    LIMIT 1
    `,
    [weekStart],
  )
  let planId = existing.rows[0]?.id
  if (!planId) {
    const plan = await pool.query<{ id: string }>(
      `
      INSERT INTO operational_work_plans (
        week_start_date, week_end_date, status, created_by, published_at
      ) VALUES ($1::date, ($1::date + 6), 'PUBLISHED', $2::uuid, now())
      RETURNING id::text
      `,
      [weekStart, input.createdByUserId],
    )
    planId = plan.rows[0]!.id
    createdPlanIds.add(planId)
  }
  const item = await pool.query<{ id: string }>(
    `
    INSERT INTO operational_work_plan_items (
      work_plan_id, conveyor_id, activity_node_id, assigned_collaborator_id,
      planned_date, planned_order, planned_minutes, status
    ) VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::date, 1, $6, 'PLANNED')
    RETURNING id::text
    `,
    [
      planId,
      input.conveyorId,
      input.stepNodeId,
      input.collaboratorId,
      plannedDate,
      input.plannedMinutes ?? null,
    ],
  )
  const itemId = item.rows[0]!.id
  createdItemIds.add(itemId)
  return { planId, itemId, plannedDate }
}

/** Remove itens e planos criados por `seedPublishedPlanItem` (chamar no `afterAll`). */
export async function cleanupSeededPlanItems(pool: pg.Pool): Promise<void> {
  if (createdItemIds.size > 0) {
    await pool.query(`DELETE FROM operational_work_plan_items WHERE id = ANY($1::uuid[])`, [
      [...createdItemIds],
    ])
  }
  if (createdPlanIds.size > 0) {
    await pool.query(`DELETE FROM operational_work_plan_items WHERE work_plan_id = ANY($1::uuid[])`, [
      [...createdPlanIds],
    ])
    await pool.query(`DELETE FROM operational_work_plans WHERE id = ANY($1::uuid[])`, [
      [...createdPlanIds],
    ])
  }
  createdItemIds.clear()
  createdPlanIds.clear()
}
