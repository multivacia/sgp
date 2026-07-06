import type pg from 'pg'
import { mondayOfWeekContaining } from '../modules/operational-planning/operational-planning.week.js'

export type ConveyorProductionStatus = 'A_INICIAR' | 'EM_ANDAMENTO'

function todayIsoLocal(): string {
  const t = new Date()
  return [
    t.getFullYear(),
    String(t.getMonth() + 1).padStart(2, '0'),
    String(t.getDate()).padStart(2, '0'),
  ].join('-')
}

/** Esteiras novas nascem em EM_ELABORACAO; apontamentos exigem A_INICIAR ou EM_ANDAMENTO. */
export async function setConveyorProductionStatusForIntegration(
  pool: pg.Pool,
  conveyorId: string,
  status: ConveyorProductionStatus = 'EM_ANDAMENTO',
): Promise<void> {
  await pool.query(
    `UPDATE conveyors SET operational_status = $2 WHERE id = $1::uuid`,
    [conveyorId, status],
  )
}

/** Plano publicado da semana com itens planejados por colaborador (regra fora-de-sequência). */
export async function seedOperationalWorkPlanItemsForSteps(
  pool: pg.Pool,
  input: {
    createdByUserId: string
    conveyorId: string
    steps: Array<{ activityNodeId: string; collaboratorId: string; plannedOrder?: number }>
    plannedDate?: string
  },
): Promise<void> {
  const plannedDate = input.plannedDate ?? todayIsoLocal()
  const weekStart = mondayOfWeekContaining(plannedDate)

  await pool.query(
    `DELETE FROM operational_work_plan_items
     WHERE work_plan_id IN (
       SELECT id FROM operational_work_plans WHERE week_start_date = $1::date
     )`,
    [weekStart],
  )
  await pool.query(`DELETE FROM operational_work_plans WHERE week_start_date = $1::date`, [weekStart])

  const plan = await pool.query<{ id: string }>(
    `
    INSERT INTO operational_work_plans (
      week_start_date, week_end_date, status, created_by, published_at
    ) VALUES ($2::date, ($2::date + 6), 'PUBLISHED', $1::uuid, now())
    RETURNING id::text
    `,
    [input.createdByUserId, weekStart],
  )
  const planId = plan.rows[0]?.id
  if (!planId) throw new Error('plano não criado')

  for (const [idx, step] of input.steps.entries()) {
    await pool.query(
      `
      INSERT INTO operational_work_plan_items (
        work_plan_id, conveyor_id, activity_node_id, assigned_collaborator_id,
        planned_date, planned_order, status
      ) VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::date, $6, 'PLANNED')
      `,
      [
        planId,
        input.conveyorId,
        step.activityNodeId,
        step.collaboratorId,
        plannedDate,
        step.plannedOrder ?? idx + 1,
      ],
    )
  }
}
