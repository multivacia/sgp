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

export type SequenceOwnershipContext = {
  currentCollaboratorId: string
  /** activity_node_id -> conjunto de collaborator_ids planejados (exclui NULL). Chave ausente = não planejada. */
  plannedCollaboratorsByActivityNodeId: Map<string, Set<string>>
}

export type ConveyorActivitySequenceAnalysis = {
  targetFound: boolean
  /** Existe predecessora estrutural ainda não concluída (fonte da verdade para sequência). */
  hasPreviousPendingStep: boolean
  /** Todas as predecessoras abertas na ordem estrutural. */
  allPreviousOpenActivities: PreviousOpenActivitySummary[]
  /**
   * Compatibilidade / persistência: igual a `hasPreviousPendingStep`.
   * Na UI de listagem, preferir `sequenceWarningLabel`; reservar "Fora de sequência" para a ação.
   */
  isOutOfSequence: boolean
  previousOpenCount: number
  /** Predecessoras abertas planejadas para o colaborador atual (informativo). */
  previousOpenActivities: PreviousOpenActivitySummary[]
  awaitingOthersCount: number
  /** Predecessoras abertas planejadas para outro colaborador (informativo). */
  awaitingOthersActivities: PreviousOpenActivitySummary[]
  /** Posição 0-based na linearização estrutural da esteira. */
  structuralSequenceIndex: number
}

type LinearEntry = {
  step: SequenceAnalysisNode
  taskTitle: string
  sectorTitle: string
  orderPath: string
}

function linearizeConveyorActivities(nodes: SequenceAnalysisNode[]): LinearEntry[] {
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

  return linear
}

export function getStructuralSequenceIndex(
  nodes: SequenceAnalysisNode[],
  activityNodeId: string,
): number | null {
  const linear = linearizeConveyorActivities(nodes)
  const idx = linear.findIndex((e) => e.step.id === activityNodeId)
  return idx === -1 ? null : idx
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
function toPreviousOpenSummary(e: LinearEntry): PreviousOpenActivitySummary {
  return {
    activityNodeId: e.step.id,
    activityTitle: e.step.name,
    sectorTitle: e.sectorTitle,
    taskTitle: e.taskTitle,
    orderPath: e.orderPath,
  }
}

function emptySequenceAnalysis(structuralSequenceIndex: number): ConveyorActivitySequenceAnalysis {
  return {
    targetFound: false,
    hasPreviousPendingStep: false,
    allPreviousOpenActivities: [],
    isOutOfSequence: false,
    previousOpenCount: 0,
    previousOpenActivities: [],
    awaitingOthersCount: 0,
    awaitingOthersActivities: [],
    structuralSequenceIndex,
  }
}

export function analyzeConveyorActivitySequence(
  nodes: SequenceAnalysisNode[],
  activityNodeId: string,
  ownership?: SequenceOwnershipContext,
): ConveyorActivitySequenceAnalysis {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const targetNode = byId.get(activityNodeId)
  if (!targetNode || targetNode.node_type !== 'STEP') {
    return emptySequenceAnalysis(-1)
  }

  const linear = linearizeConveyorActivities(nodes)

  const idx = linear.findIndex((e) => e.step.id === activityNodeId)
  if (idx === -1) {
    return emptySequenceAnalysis(-1)
  }

  const before = linear.slice(0, idx)
  const openBefore = before.filter(
    (e) => (e.step.operational_status ?? 'PENDING') !== 'COMPLETED',
  )

  const allPreviousOpenActivities = openBefore.map(toPreviousOpenSummary)
  const hasPreviousPendingStep = openBefore.length > 0

  if (!ownership) {
    return {
      targetFound: true,
      hasPreviousPendingStep,
      allPreviousOpenActivities,
      isOutOfSequence: hasPreviousPendingStep,
      previousOpenCount: openBefore.length,
      previousOpenActivities: allPreviousOpenActivities,
      awaitingOthersCount: 0,
      awaitingOthersActivities: [],
      structuralSequenceIndex: idx,
    }
  }

  const previousOpenActivities: PreviousOpenActivitySummary[] = []
  const awaitingOthersActivities: PreviousOpenActivitySummary[] = []

  for (const entry of openBefore) {
    const owners = ownership.plannedCollaboratorsByActivityNodeId.get(entry.step.id)
    if (!owners || owners.size === 0) {
      // TODO(definitivo): considerar assigned_team_id + team_members
      continue
    }
    if (owners.has(ownership.currentCollaboratorId)) {
      previousOpenActivities.push(toPreviousOpenSummary(entry))
    } else {
      awaitingOthersActivities.push(toPreviousOpenSummary(entry))
    }
  }

  return {
    targetFound: true,
    hasPreviousPendingStep,
    allPreviousOpenActivities,
    isOutOfSequence: hasPreviousPendingStep,
    previousOpenCount: openBefore.length,
    previousOpenActivities,
    awaitingOthersCount: awaitingOthersActivities.length,
    awaitingOthersActivities,
    structuralSequenceIndex: idx,
  }
}
