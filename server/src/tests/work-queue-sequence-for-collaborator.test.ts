import { describe, expect, it } from 'vitest'
import {
  analyzeConveyorActivitySequence,
  type SequenceAnalysisNode,
} from '../modules/conveyors/conveyorActivitySequence.logic.js'
import { mapWorkQueueSequenceForCollaborator } from '../modules/my-work-queue/work-queue-sequence-for-collaborator.js'

const JOAO = '00000000-0000-0000-0000-000000000101'
const MARIA = '00000000-0000-0000-0000-000000000102'
const STEP_A = 'step-a'
const STEP_B = 'step-b'
const STEP_C = 'step-c'

function step(
  id: string,
  name: string,
  orderIndex: number,
  status: SequenceAnalysisNode['operational_status'] = 'PENDING',
): SequenceAnalysisNode {
  return {
    id,
    parent_id: 'area-1',
    node_type: 'STEP',
    order_index: orderIndex,
    name,
    operational_status: status,
    is_active: true,
  }
}

function abcNodes(
  statuses: Record<string, SequenceAnalysisNode['operational_status']> = {},
): SequenceAnalysisNode[] {
  return [
    {
      id: 'opt-1',
      parent_id: null,
      node_type: 'OPTION',
      order_index: 0,
      name: 'Tarefa',
      operational_status: null,
      is_active: true,
    },
    {
      id: 'area-1',
      parent_id: 'opt-1',
      node_type: 'AREA',
      order_index: 0,
      name: 'Setor',
      operational_status: null,
      is_active: true,
    },
    step(STEP_A, 'Atividade A', 0, statuses[STEP_A] ?? 'PENDING'),
    step(STEP_B, 'Atividade B', 1, statuses[STEP_B] ?? 'PENDING'),
    step(STEP_C, 'Atividade C', 2, statuses[STEP_C] ?? 'PENDING'),
  ]
}

function plannedMap(assignments: Record<string, string[]>): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>()
  for (const [stepId, ids] of Object.entries(assignments)) {
    map.set(stepId, new Set(ids))
  }
  return map
}

function analyzeForCollaborator(
  nodes: SequenceAnalysisNode[],
  activityNodeId: string,
  collaboratorId: string,
  assignments: Record<string, string[]>,
) {
  const seq = analyzeConveyorActivitySequence(nodes, activityNodeId, {
    currentCollaboratorId: collaboratorId,
    plannedCollaboratorsByActivityNodeId: plannedMap(assignments),
  })
  return mapWorkQueueSequenceForCollaborator({
    seq,
    isActivityCompleted: false,
    conveyorOperationalStatus: 'EM_ANDAMENTO',
  })
}

describe('mapWorkQueueSequenceForCollaborator', () => {
  it('CA-02 — Atividade 1 concluída e Atividade 2 pendente: próxima sem warning bloqueante', () => {
    const nodes = abcNodes({ [STEP_A]: 'COMPLETED' })
    const assignments = {
      [STEP_A]: [MARIA],
      [STEP_B]: [MARIA],
    }
    const b = analyzeForCollaborator(nodes, STEP_B, MARIA, assignments)
    expect(b.hasPreviousPendingStep).toBe(false)
    expect(b.isOutOfSequence).toBe(false)
    expect(b.requiresOutOfSequenceJustification).toBe(false)
    expect(b.sequenceWarningLabel).toBeUndefined()
  })

  it('CA-02 — Atividade 1 pendente e Atividade 2 pendente: alerta neutro, apontável com justificativa', () => {
    const nodes = abcNodes()
    const assignments = {
      [STEP_A]: [MARIA],
      [STEP_B]: [MARIA],
    }
    const b = analyzeForCollaborator(nodes, STEP_B, MARIA, assignments)
    expect(b.hasPreviousPendingStep).toBe(true)
    expect(b.isOutOfSequence).toBe(true)
    expect(b.requiresOutOfSequenceJustification).toBe(true)
    expect(b.canPointTime).toBe(true)
    expect(b.sequenceWarningLabel).toContain('Atividade A')
  })

  it('CA-03 — Maria em B com A de João pendente: alerta e justificativa, sem bloqueio', () => {
    const nodes = abcNodes()
    const assignments = {
      [STEP_A]: [JOAO],
      [STEP_B]: [MARIA],
    }
    const b = analyzeForCollaborator(nodes, STEP_B, MARIA, assignments)
    expect(b.hasPreviousPendingStep).toBe(true)
    expect(b.requiresOutOfSequenceJustification).toBe(true)
    expect(b.canPointTime).toBe(true)
    expect(b.sequenceWarningLabel).toContain('Atividade A')
    expect(b.awaitingPreviousActivities[0]?.activityTitle).toBe('Atividade A')
  })

  it('após João concluir A, alerta em B desaparece para Maria', () => {
    const nodes = abcNodes({ [STEP_A]: 'COMPLETED' })
    const assignments = {
      [STEP_A]: [JOAO],
      [STEP_B]: [MARIA],
    }
    const b = analyzeForCollaborator(nodes, STEP_B, MARIA, assignments)
    expect(b.hasPreviousPendingStep).toBe(false)
    expect(b.awaitingPreviousActivities).toEqual([])
  })

  it('pendência anterior sem responsável ainda gera alerta estrutural', () => {
    const nodes = abcNodes()
    const assignments = {
      [STEP_B]: [MARIA],
    }
    const b = analyzeForCollaborator(nodes, STEP_B, MARIA, assignments)
    expect(b.hasPreviousPendingStep).toBe(true)
    expect(b.requiresOutOfSequenceJustification).toBe(true)
    expect(b.sequenceWarningLabel).toBeTruthy()
  })

  it('propaga targetFound da análise estrutural', () => {
    const nodes = abcNodes()
    const assignments = { [STEP_B]: [MARIA] }
    const found = analyzeForCollaborator(nodes, STEP_B, MARIA, assignments)
    const missingSeq = analyzeConveyorActivitySequence(nodes, 'step-inexistente', {
      currentCollaboratorId: MARIA,
      plannedCollaboratorsByActivityNodeId: plannedMap(assignments),
    })
    const missing = mapWorkQueueSequenceForCollaborator({
      seq: missingSeq,
      isActivityCompleted: false,
      conveyorOperationalStatus: 'EM_ANDAMENTO',
    })
    expect(found.targetFound).toBe(true)
    expect(missing.targetFound).toBe(false)
    expect(missing.structuralSequenceIndex).toBe(-1)
  })
})
