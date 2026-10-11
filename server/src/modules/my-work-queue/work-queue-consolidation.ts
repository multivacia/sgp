import type { CollaboratorPlannedStepSummary } from '../operational-planning/planned-activity.repository.js'
import type { MyWorkQueueRawRow } from './my-work-queue.repository.js'

/**
 * Um cartão por atividade (TASK apontamento-somente-planejado).
 *
 * - A atividade entra se tiver ao menos um item no recorte (`rows`).
 * - Data do cartão = menor data entre **todos** os itens planejados válidos do colaborador
 *   na atividade, mesmo fora do recorte (`summaries`).
 * - Minutos do cartão = soma de todos esses itens (todos os dias).
 * - Os itens vêm do planejamento do próprio colaborador: `is_assigned_to_me = true`.
 *
 * Totais e capacidade do recorte NÃO devem ser calculados a partir destes cartões.
 */
export function consolidateWorkQueueRowsByActivity(
  rows: readonly MyWorkQueueRawRow[],
  summaries: ReadonlyMap<string, CollaboratorPlannedStepSummary>,
): MyWorkQueueRawRow[] {
  const key = (row: MyWorkQueueRawRow) => `${row.conveyor_id}:${row.activity_node_id}`
  const byStep = new Map<string, MyWorkQueueRawRow>()
  for (const row of rows) {
    const current = byStep.get(key(row))
    if (!current || isEarlier(row, current)) byStep.set(key(row), row)
  }
  const out: MyWorkQueueRawRow[] = []
  for (const row of rows) {
    const representative = byStep.get(key(row))
    if (representative !== row) continue
    const summary = summaries.get(row.activity_node_id)
    const firstDate =
      summary && summary.firstPlannedDate < row.planned_date
        ? summary.firstPlannedDate
        : row.planned_date
    out.push({
      ...row,
      planned_date: firstDate,
      planned_minutes: summary ? summary.plannedMinutes : row.planned_minutes,
      is_assigned_to_me: true,
    })
  }
  return out
}

function isEarlier(a: MyWorkQueueRawRow, b: MyWorkQueueRawRow): boolean {
  if (a.planned_date !== b.planned_date) return a.planned_date < b.planned_date
  return a.planned_order < b.planned_order
}
