import type pg from 'pg'
import { serviceCreateConveyor } from '../modules/conveyors/conveyors.service.js'
import type { PostConveyorBody } from '../modules/conveyors/conveyors.schemas.js'
import {
  setConveyorProductionStatusForIntegration,
  type ConveyorProductionStatus,
} from './integrationConveyorFixtures.js'

/**
 * Cenário sintético do hotfix `hotfix-listagem-atividades-tati`: esteira com 21 TAREFAS
 * (nós OPTION), cada uma com setores (AREA) e várias atividades (STEP).
 * Ombreira é a tarefa 11 e Revestir Painel a tarefa 21. As contagens das tarefas 11–21
 * seguem as visíveis no print da Tati; as tarefas 1–10 somam 43 atividades, de modo que a
 * atividade 50 (na ordem tarefa → setor → atividade) é a última da Ombreira.
 * Total: 126 atividades. **Dados sintéticos** — não representam a OS real.
 */
export const TATI_SCENARIO_TASKS: ReadonlyArray<{ name: string; areas: readonly number[] }> = [
  { name: 'Tarefa 01 Desmontagem', areas: [2, 2] },
  { name: 'Tarefa 02 Bancos', areas: [2, 2] },
  { name: 'Tarefa 03 Moldes', areas: [2, 2] },
  { name: 'Tarefa 04 Corte', areas: [2, 2] },
  { name: 'Tarefa 05 Costura', areas: [2, 2] },
  { name: 'Tarefa 06 Espumas', areas: [3, 2] },
  { name: 'Tarefa 07 Teto', areas: [2, 2] },
  { name: 'Tarefa 08 Colunas', areas: [3, 2] },
  { name: 'Tarefa 09 Carpete', areas: [3, 2] },
  { name: 'Tarefa 10 Console', areas: [2, 2] },
  { name: 'Ombreira', areas: [4, 3] },
  { name: 'Forros de portas', areas: [5, 4] },
  { name: 'Acabamentos', areas: [2] },
  { name: 'Montar bancos traseiros', areas: [6, 6] },
  { name: 'Montar bancos dianteiros', areas: [8, 7] },
  { name: 'Tampão', areas: [4, 3] },
  { name: 'Montagem veículo', areas: [5, 5] },
  { name: 'Limpeza final', areas: [5, 5] },
  { name: 'Inspeção de qualidade', areas: [1] },
  { name: 'Tarefa 20 Revisão', areas: [3] },
  { name: 'Revestir Painel', areas: [4, 3] },
]

export type ScenarioStep = {
  id: string
  /** 1..21 */
  taskNumber: number
  taskName: string
  areaName: string
  stepName: string
}

function scenarioBody(
  conveyorName: string,
  tasks: ReadonlyArray<{ name: string; areas: readonly number[] }>,
): PostConveyorBody {
  return {
    dados: {
      nome: conveyorName,
      cliente: 'Cliente sintético',
      veiculo: 'Veículo sintético',
      modeloVersao: '',
      placa: 'SIN0T00',
      observacoes: '',
      responsavel: '',
      prazoEstimado: '',
      prioridade: 'media',
      colaboradorId: null,
    },
    originType: 'MANUAL',
    baseId: null,
    baseCode: null,
    baseName: null,
    baseVersion: null,
    options: tasks.map((task, ti) => ({
      titulo: task.name,
      orderIndex: ti + 1,
      sourceOrigin: 'manual',
      areas: task.areas.map((count, ai) => ({
        titulo: `Setor ${ai + 1} · ${task.name}`,
        orderIndex: ai + 1,
        sourceOrigin: 'manual',
        steps: Array.from({ length: count }, (_, si) => ({
          titulo: `${task.name} · S${ai + 1} · A${si + 1}`,
          orderIndex: si + 1,
          plannedMinutes: 30,
          sourceOrigin: 'manual',
          required: true,
        })),
      })),
    })),
  }
}

/** STEPs da esteira na ordem estrutural (tarefa → setor → atividade → id). */
export async function listScenarioSteps(
  pool: pg.Pool,
  conveyorId: string,
): Promise<ScenarioStep[]> {
  const r = await pool.query<{
    id: string
    opt_order: number
    task_name: string
    area_name: string
    step_name: string
  }>(
    `SELECT step.id::text AS id, opt.order_index AS opt_order, opt.name AS task_name,
            area.name AS area_name, step.name AS step_name
       FROM conveyor_nodes step
       JOIN conveyor_nodes area ON area.id = step.parent_id
       JOIN conveyor_nodes opt ON opt.id = area.parent_id
      WHERE step.conveyor_id = $1::uuid AND step.node_type = 'STEP' AND step.deleted_at IS NULL
      ORDER BY opt.order_index, area.order_index, step.order_index, step.id`,
    [conveyorId],
  )
  const optOrders = [...new Set(r.rows.map((x) => x.opt_order))]
  return r.rows.map((x) => ({
    id: x.id,
    taskNumber: optOrders.indexOf(x.opt_order) + 1,
    taskName: x.task_name,
    areaName: x.area_name,
    stepName: x.step_name,
  }))
}

/** Cria a esteira do cenário (21 tarefas por padrão) e devolve seus STEPs em ordem. */
export async function createScenarioConveyor(
  pool: pg.Pool,
  input: {
    name: string
    status?: ConveyorProductionStatus
    tasks?: ReadonlyArray<{ name: string; areas: readonly number[] }>
  },
): Promise<{ conveyorId: string; steps: ScenarioStep[] }> {
  const created = await serviceCreateConveyor(
    pool,
    scenarioBody(input.name, input.tasks ?? TATI_SCENARIO_TASKS),
  )
  await setConveyorProductionStatusForIntegration(pool, created.id, input.status ?? 'EM_ANDAMENTO')
  return { conveyorId: created.id, steps: await listScenarioSteps(pool, created.id) }
}

/** Alocação estrutural direta (COLLABORATOR) em lote — mesmo formato do repositório. */
export async function assignStepsToCollaborator(
  pool: pg.Pool,
  conveyorId: string,
  stepIds: readonly string[],
  collaboratorId: string,
): Promise<void> {
  await pool.query(
    `INSERT INTO conveyor_node_assignees (
       conveyor_id, conveyor_node_id, assignment_type, collaborator_id, is_primary,
       assignment_origin, order_index
     )
     SELECT $1::uuid, s.id, 'COLLABORATOR', $3::uuid, TRUE, 'manual', 0
       FROM unnest($2::uuid[]) AS s(id)`,
    [conveyorId, stepIds, collaboratorId],
  )
}

/** Itens PLANNED em plano semanal (status informado) para as atividades, na data dada. */
export async function seedWeekPlanItems(
  pool: pg.Pool,
  input: {
    createdByUserId: string
    weekStart: string
    status: 'DRAFT' | 'PUBLISHED'
    plannedDate: string
    items: ReadonlyArray<{ conveyorId: string; activityNodeId: string; collaboratorId: string }>
  },
): Promise<string> {
  await pool.query(
    `DELETE FROM operational_work_plan_items
      WHERE work_plan_id IN (SELECT id FROM operational_work_plans WHERE week_start_date = $1::date)`,
    [input.weekStart],
  )
  await pool.query(`DELETE FROM operational_work_plans WHERE week_start_date = $1::date`, [
    input.weekStart,
  ])
  const plan = await pool.query<{ id: string }>(
    `INSERT INTO operational_work_plans (
       week_start_date, week_end_date, status, created_by, published_at
     ) VALUES ($2::date, ($2::date + 6), $3::text, $1::uuid,
               CASE WHEN $3::text = 'PUBLISHED' THEN now() ELSE NULL END)
     RETURNING id::text`,
    [input.createdByUserId, input.weekStart, input.status],
  )
  const planId = plan.rows[0]!.id
  for (const [idx, it] of input.items.entries()) {
    await pool.query(
      `INSERT INTO operational_work_plan_items (
         work_plan_id, conveyor_id, activity_node_id, assigned_collaborator_id,
         planned_date, planned_order, status
       ) VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::date, $6, 'PLANNED')`,
      [planId, it.conveyorId, it.activityNodeId, it.collaboratorId, input.plannedDate, idx + 1],
    )
  }
  return planId
}
