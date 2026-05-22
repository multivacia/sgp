import type { MatrixNodeTreeApi } from '../../../domain/operation-matrix/operation-matrix.types'
import { matrixActivityPrimaryTeamId } from '../../operation-matrix/matrixTreeAggregates'
import type {
  ManualAreaDraft,
  ManualOptionDraft,
  ManualStepDraft,
  NovaEsteiraAlocacaoLinha,
} from './matrixToConveyorCreateInput'

function sortByOrder(children: MatrixNodeTreeApi[]): MatrixNodeTreeApi[] {
  return [...children].sort((a, b) => a.order_index - b.order_index)
}

function newKey() {
  return crypto.randomUUID()
}

/** Alocações iniciais na esteira a partir da equipe padrão da Atividade na Matriz. */
export function matrixActivityToInitialAllocRows(
  act: MatrixNodeTreeApi,
): NovaEsteiraAlocacaoLinha[] {
  if (act.node_type !== 'ACTIVITY') return []
  const tid = matrixActivityPrimaryTeamId(act)
  if (!tid) return []
  return [
    {
      type: 'TEAM',
      teamId: tid,
      /** Equipe operacional — nunca responsável principal nominal (regra do POST /conveyors). */
      isPrimary: false,
    },
  ]
}

function emptyStepFromActivity(act: MatrixNodeTreeApi): ManualStepDraft {
  return {
    key: newKey(),
    titulo: act.name.trim(),
    plannedMinutes: Math.max(0, Math.floor(Number(act.planned_minutes ?? 0))),
  }
}

export type MatrixTaskManualDraftBundle = {
  option: ManualOptionDraft
  /** Chaves = `step.key` das etapas criadas a partir das atividades da matriz. */
  initialAllocations: Record<string, NovaEsteiraAlocacaoLinha[]>
}

/**
 * Converte um nó TASK (com filhos SECTOR → ACTIVITY) em opção editável da esteira,
 * com alocações herdadas da equipe padrão (`team_ids`) de cada atividade.
 */
export function matrixTaskSubtreeToManualDraft(
  task: MatrixNodeTreeApi,
  catalogSourceKey: string,
): MatrixTaskManualDraftBundle | null {
  if (task.node_type !== 'TASK') return null
  const sectors = sortByOrder(task.children.filter((c) => c.node_type === 'SECTOR'))
  const areas: ManualAreaDraft[] = []
  const initialAllocations: Record<string, NovaEsteiraAlocacaoLinha[]> = {}
  for (const sector of sectors) {
    const activities = sortByOrder(
      sector.children.filter((c) => c.node_type === 'ACTIVITY'),
    )
    if (activities.length === 0) continue
    const steps = activities.map((act) => {
      const step = emptyStepFromActivity(act)
      const rows = matrixActivityToInitialAllocRows(act)
      if (rows.length > 0) {
        initialAllocations[step.key] = rows
      }
      return step
    })
    areas.push({
      key: newKey(),
      titulo: sector.name.trim(),
      steps,
    })
  }
  if (areas.length === 0) return null
  return {
    option: {
      key: newKey(),
      titulo: task.name.trim(),
      catalogSourceKey,
      areas,
    },
    initialAllocations,
  }
}

export type MatrixItemManualDraftBundle = {
  options: ManualOptionDraft[]
  initialAllocations: Record<string, NovaEsteiraAlocacaoLinha[]>
}

/**
 * Materializa uma matriz (raiz ITEM) como lista de opções (uma por TASK com etapas)
 * e mapa de alocações iniciais por etapa (herdadas da matriz).
 */
export function matrixItemTreeToManualOptions(
  tree: MatrixNodeTreeApi,
  matrixItemId: string,
): MatrixItemManualDraftBundle {
  if (tree.node_type !== 'ITEM') {
    return { options: [], initialAllocations: {} }
  }
  const tasks = sortByOrder(tree.children.filter((c) => c.node_type === 'TASK'))
  const options: ManualOptionDraft[] = []
  const initialAllocations: Record<string, NovaEsteiraAlocacaoLinha[]> = {}
  for (const task of tasks) {
    const bundle = matrixTaskSubtreeToManualDraft(
      task,
      `mroot:${matrixItemId}:task:${task.id}`,
    )
    if (bundle) {
      options.push(bundle.option)
      Object.assign(initialAllocations, bundle.initialAllocations)
    }
  }
  return { options, initialAllocations }
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
