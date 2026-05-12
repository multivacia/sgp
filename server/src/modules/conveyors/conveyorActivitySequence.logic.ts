import type { ConveyorNodeStepOperationalStatusDb } from './stepOperationalStatus.js'

/**
 * Nós da esteira para ordenação Tarefa (OPTION) > Setor (AREA) > Atividade (STEP).
 * Apenas campos necessários à linearização.
 */
export type SequenceAnalysisNode = {
  id: string
  parent_id: string | null
  node_type: 'OPTION' | 'AREA' | 'STEP'
  order_index: number
  name: string
  operational_status: ConveyorNodeStepOperationalStatusDb | null
  is_active: boolean
}

export type PreviousOpenActivitySummary = {
  activityNodeId: string
  activityTitle: string
  sectorTitle: string
  taskTitle: string
  orderPath: string
}

export type ConveyorActivitySequenceAnalysis = {
  targetFound: boolean
  isOutOfSequence: boolean
  previousOpenCount: number
  /** Atividades anteriores ainda não concluídas (operational_status ≠ COMPLETED), na ordem estrutural. */
  previousOpenActivities: PreviousOpenActivitySummary[]
}

function sortByOrderIndex<T extends { order_index: number; id: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.order_index - b.order_index || a.id.localeCompare(b.id))
}

function childrenOf(
  nodes: SequenceAnalysisNode[],
  parentId: string,
  type: 'OPTION' | 'AREA' | 'STEP',
): SequenceAnalysisNode[] {
  return sortByOrderIndex(nodes.filter((n) => n.parent_id === parentId && n.node_type === type))
}

/**
 * Lineariza atividades (STEP) ativas pela árvore ordenada por `order_index`.
 * Ignora OPTION/AREA inativos (subárvore não entra na sequência).
 */
export function analyzeConveyorActivitySequence(
  nodes: SequenceAnalysisNode[],
  activityNodeId: string,
): ConveyorActivitySequenceAnalysis {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const targetNode = byId.get(activityNodeId)
  if (!targetNode || targetNode.node_type !== 'STEP') {
    return {
      targetFound: false,
      isOutOfSequence: false,
      previousOpenCount: 0,
      previousOpenActivities: [],
    }
  }

  type LinearEntry = {
    step: SequenceAnalysisNode
    taskTitle: string
    sectorTitle: string
    orderPath: string
  }

  const linear: LinearEntry[] = []
  const rootOptions = sortByOrderIndex(
    nodes.filter((n) => n.node_type === 'OPTION' && n.parent_id === null && n.is_active),
  )

  let taskOrdinal = 0
  for (const opt of rootOptions) {
    taskOrdinal += 1
    const areas = childrenOf(nodes, opt.id, 'AREA').filter((a) => a.is_active)
    let sectorOrdinal = 0
    for (const area of areas) {
      sectorOrdinal += 1
      const steps = childrenOf(nodes, area.id, 'STEP').filter((s) => s.is_active)
      let actOrdinal = 0
      for (const step of steps) {
        actOrdinal += 1
        linear.push({
          step,
          taskTitle: opt.name,
          sectorTitle: area.name,
          orderPath: `${taskOrdinal}.${sectorOrdinal}.${actOrdinal}`,
        })
      }
    }
  }

  const idx = linear.findIndex((e) => e.step.id === activityNodeId)
  if (idx === -1) {
    return {
      targetFound: false,
      isOutOfSequence: false,
      previousOpenCount: 0,
      previousOpenActivities: [],
    }
  }

  const before = linear.slice(0, idx)
  const openBefore = before.filter(
    (e) => (e.step.operational_status ?? 'PENDING') !== 'COMPLETED',
  )

  const summaries: PreviousOpenActivitySummary[] = openBefore.map((e) => ({
    activityNodeId: e.step.id,
    activityTitle: e.step.name,
    sectorTitle: e.sectorTitle,
    taskTitle: e.taskTitle,
    orderPath: e.orderPath,
  }))

  return {
    targetFound: true,
    isOutOfSequence: openBefore.length > 0,
    previousOpenCount: openBefore.length,
    previousOpenActivities: summaries,
  }
}
