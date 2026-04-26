import type { MatrixNodeTreeApi } from '../../../domain/operation-matrix/operation-matrix.types'
import type { ManualAreaDraft, ManualOptionDraft, ManualStepDraft } from './matrixToConveyorCreateInput'

function sortByOrder(children: MatrixNodeTreeApi[]): MatrixNodeTreeApi[] {
  return [...children].sort((a, b) => a.order_index - b.order_index)
}

function newKey() {
  return crypto.randomUUID()
}

function emptyStepFromActivity(act: MatrixNodeTreeApi): ManualStepDraft {
  return {
    key: newKey(),
    titulo: act.name.trim(),
    plannedMinutes: Math.max(0, Math.floor(Number(act.planned_minutes ?? 0))),
  }
}

/**
 * Converte um nó TASK (com filhos SECTOR → ACTIVITY) em uma opção editável da esteira.
 */
export function matrixTaskSubtreeToManualOption(
  task: MatrixNodeTreeApi,
  catalogSourceKey: string,
): ManualOptionDraft | null {
  if (task.node_type !== 'TASK') return null
  const sectors = sortByOrder(task.children.filter((c) => c.node_type === 'SECTOR'))
  const areas: ManualAreaDraft[] = []
  for (const sector of sectors) {
    const activities = sortByOrder(
      sector.children.filter((c) => c.node_type === 'ACTIVITY'),
    )
    if (activities.length === 0) continue
    areas.push({
      key: newKey(),
      titulo: sector.name.trim(),
      steps: activities.map((act) => emptyStepFromActivity(act)),
    })
  }
  if (areas.length === 0) return null
  return {
    key: newKey(),
    titulo: task.name.trim(),
    catalogSourceKey,
    areas,
  }
}

/**
 * Materializa uma matriz (raiz ITEM) como lista de opções (uma por TASK com etapas).
 */
export function matrixItemTreeToManualOptions(
  tree: MatrixNodeTreeApi,
  matrixItemId: string,
): ManualOptionDraft[] {
  if (tree.node_type !== 'ITEM') return []
  const tasks = sortByOrder(tree.children.filter((c) => c.node_type === 'TASK'))
  const out: ManualOptionDraft[] = []
  for (const task of tasks) {
    const opt = matrixTaskSubtreeToManualOption(
      task,
      `mroot:${matrixItemId}:task:${task.id}`,
    )
    if (opt) out.push(opt)
  }
  return out
}

export function collectTaskNodesFromItemTree(
  tree: MatrixNodeTreeApi,
  matrixItemId: string,
): { task: MatrixNodeTreeApi; matrixItemId: string }[] {
  if (tree.node_type !== 'ITEM') return []
  const tasks = sortByOrder(tree.children.filter((c) => c.node_type === 'TASK'))
  return tasks.map((task) => ({ task, matrixItemId }))
}

export function draftHasMatrixRoot(drafts: ManualOptionDraft[], matrixItemId: string) {
  const p = `mroot:${matrixItemId}:`
  return drafts.some((d) => d.catalogSourceKey?.startsWith(p) ?? false)
}

export function draftHasTask(drafts: ManualOptionDraft[], taskNodeId: string) {
  const k = `t:${taskNodeId}`
  return drafts.some((d) => d.catalogSourceKey === k)
}

/** Localiza um TASK na árvore (por id). */
export function findTaskNodeInItemTree(
  tree: MatrixNodeTreeApi,
  taskId: string,
): MatrixNodeTreeApi | null {
  if (tree.node_type === 'TASK' && tree.id === taskId) return tree
  for (const c of tree.children) {
    const r = findTaskNodeInItemTree(c, taskId)
    if (r) return r
  }
  return null
}
