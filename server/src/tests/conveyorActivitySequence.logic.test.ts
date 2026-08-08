import { describe, expect, it } from 'vitest'
import {
  analyzeConveyorActivitySequence,
  type SequenceAnalysisNode,
  type SequenceOwnershipContext,
} from '../modules/conveyors/conveyorActivitySequence.logic.js'

const JOAO = '00000000-0000-0000-0000-000000000101'
const MARIA = '00000000-0000-0000-0000-000000000102'

function step(
  id: string,
  parentId: string,
  name: string,
  orderIndex: number,
  operational_status: SequenceAnalysisNode['operational_status'],
): SequenceAnalysisNode {
  return {
    id,
    parent_id: parentId,
    node_type: 'STEP',
    order_index: orderIndex,
    name,
    operational_status,
    is_active: true,
  }
}

function opt(id: string, name: string, orderIndex: number): SequenceAnalysisNode {
  return {
    id,
    parent_id: null,
    node_type: 'OPTION',
    order_index: orderIndex,
    name,
    operational_status: null,
    is_active: true,
  }
}

function area(id: string, parentId: string, name: string, orderIndex: number): SequenceAnalysisNode {
  return {
    id,
    parent_id: parentId,
    node_type: 'AREA',
    order_index: orderIndex,
    name,
    operational_status: null,
    is_active: true,
  }
}

/** Esteira: 1 Desmontagem, 2 Funilaria, 3 Pintura, 4 Montagem */
function fourStepTree(
  statuses: Record<string, SequenceAnalysisNode['operational_status']> = {},
): SequenceAnalysisNode[] {
  const o1 = opt('opt1', 'T1', 0)
  const a1 = area('area1', 'opt1', 'S1', 0)
  return [
    o1,
    a1,
    step('act1', 'area1', 'Desmontagem', 0, statuses.act1 ?? 'PENDING'),
    step('act2', 'area1', 'Funilaria', 1, statuses.act2 ?? 'PENDING'),
    step('act3', 'area1', 'Pintura', 2, statuses.act3 ?? 'PENDING'),
    step('act4', 'area1', 'Montagem', 3, statuses.act4 ?? 'PENDING'),
  ]
}

function ownership(
  currentCollaboratorId: string,
  assignments: Record<string, string[]>,
): SequenceOwnershipContext {
  const plannedCollaboratorsByActivityNodeId = new Map<string, Set<string>>()
  for (const [nodeId, collaboratorIds] of Object.entries(assignments)) {
    plannedCollaboratorsByActivityNodeId.set(nodeId, new Set(collaboratorIds))
  }
  return { currentCollaboratorId, plannedCollaboratorsByActivityNodeId }
}

describe('analyzeConveyorActivitySequence', () => {
  const tree = (): SequenceAnalysisNode[] => {
    const o1 = opt('opt1', 'T1', 0)
    const a1 = area('area1', 'opt1', 'S1', 0)
    const s1 = step('act1', 'area1', 'A', 0, 'PENDING')
    const s2 = step('act2', 'area1', 'B', 1, 'PENDING')
    const s3 = step('act3', 'area1', 'C', 2, 'PENDING')
    return [o1, a1, s1, s2, s3]
  }

  it('lineariza Tarefa > Setor > Atividade por order_index', () => {
    const r = analyzeConveyorActivitySequence(tree(), 'act3')
    expect(r.targetFound).toBe(true)
    expect(r.previousOpenCount).toBe(2)
    expect(r.previousOpenActivities.map((x) => x.activityTitle)).toEqual(['A', 'B'])
    expect(r.previousOpenActivities[0]?.orderPath).toMatch(/^1\.1\.\d+$/)
    expect(r.awaitingOthersCount).toBe(0)
  })

  it('primeira Atividade não está fora de sequência', () => {
    const r = analyzeConveyorActivitySequence(tree(), 'act1')
    expect(r.isOutOfSequence).toBe(false)
    expect(r.previousOpenCount).toBe(0)
  })

  it('posterior com anteriores pendentes está fora de sequência (sem ownership)', () => {
    const r = analyzeConveyorActivitySequence(tree(), 'act3')
    expect(r.isOutOfSequence).toBe(true)
  })

  it('ignora Atividades anteriores já concluídas', () => {
    const o1 = opt('opt1', 'T1', 0)
    const a1 = area('area1', 'opt1', 'S1', 0)
    const s1 = step('act1', 'area1', 'A', 0, 'COMPLETED')
    const s2 = step('act2', 'area1', 'B', 1, 'COMPLETED')
    const s3 = step('act3', 'area1', 'C', 2, 'PENDING')
    const r = analyzeConveyorActivitySequence([o1, a1, s1, s2, s3], 'act3')
    expect(r.isOutOfSequence).toBe(false)
    expect(r.previousOpenCount).toBe(0)
  })

  it('ignora nós STEP inativos na linearização', () => {
    const o1 = opt('opt1', 'T1', 0)
    const a1 = area('area1', 'opt1', 'S1', 0)
    const sInactive = {
      ...step('actX', 'area1', 'X', 0, 'PENDING'),
      is_active: false,
    }
    const s1 = step('act1', 'area1', 'A', 1, 'PENDING')
    const r = analyzeConveyorActivitySequence([o1, a1, sInactive, s1], 'act1')
    expect(r.isOutOfSequence).toBe(false)
  })

  it('alvo inexistente ou não-STEP: targetFound false', () => {
    const r = analyzeConveyorActivitySequence(tree(), 'missing')
    expect(r.targetFound).toBe(false)
    expect(r.awaitingOthersCount).toBe(0)
    expect(r.awaitingOthersActivities).toEqual([])
  })

  describe('com ownership (regra por planejamento)', () => {
    it('1) predecessora aberta do próprio C → bloqueante', () => {
      const nodes = fourStepTree()
      const r = analyzeConveyorActivitySequence(
        nodes,
        'act3',
        ownership(JOAO, {
          act1: [JOAO],
          act2: [JOAO],
          act3: [JOAO],
        }),
      )
      expect(r.isOutOfSequence).toBe(true)
      expect(r.previousOpenActivities.map((a) => a.activityTitle)).toEqual([
        'Desmontagem',
        'Funilaria',
      ])
      expect(r.awaitingOthersCount).toBe(0)
    })

    it('2) predecessora aberta de outro colaborador → estruturalmente pendente, awaiting informativo', () => {
      const nodes = fourStepTree()
      const r = analyzeConveyorActivitySequence(
        nodes,
        'act3',
        ownership(JOAO, {
          act2: [MARIA],
          act3: [JOAO],
        }),
      )
      expect(r.hasPreviousPendingStep).toBe(true)
      expect(r.isOutOfSequence).toBe(true)
      expect(r.awaitingOthersActivities.map((a) => a.activityTitle)).toEqual(['Funilaria'])
      expect(r.previousOpenActivities).toEqual([])
    })

    it('3) predecessora aberta não planejada → estruturalmente pendente', () => {
      const nodes = fourStepTree()
      const r = analyzeConveyorActivitySequence(
        nodes,
        'act3',
        ownership(JOAO, { act3: [JOAO] }),
      )
      expect(r.hasPreviousPendingStep).toBe(true)
      expect(r.isOutOfSequence).toBe(true)
      expect(r.allPreviousOpenActivities.map((a) => a.activityTitle)).toEqual([
        'Desmontagem',
        'Funilaria',
      ])
    })

    it('4) predecessora sem colaborador (só time / vazio) → estruturalmente pendente', () => {
      const nodes = fourStepTree()
      const r = analyzeConveyorActivitySequence(
        nodes,
        'act3',
        ownership(JOAO, { act2: [], act3: [JOAO] }),
      )
      expect(r.hasPreviousPendingStep).toBe(true)
      expect(r.isOutOfSequence).toBe(true)
    })

    it('5) mistura: própria aberta + de terceiro → bloqueia e awaiting', () => {
      const nodes = fourStepTree()
      const r = analyzeConveyorActivitySequence(
        nodes,
        'act4',
        ownership(JOAO, {
          act1: [MARIA],
          act2: [JOAO],
          act3: [MARIA],
          act4: [JOAO],
        }),
      )
      expect(r.isOutOfSequence).toBe(true)
      expect(r.previousOpenActivities.map((a) => a.activityTitle)).toEqual(['Funilaria'])
      expect(r.awaitingOthersActivities.map((a) => a.activityTitle)).toEqual([
        'Desmontagem',
        'Pintura',
      ])
    })

    it('6) predecessora COMPLETED não conta; outra aberta ainda pendente', () => {
      const nodes = fourStepTree({ act2: 'COMPLETED' })
      const r = analyzeConveyorActivitySequence(
        nodes,
        'act3',
        ownership(JOAO, {
          act2: [MARIA],
          act3: [JOAO],
        }),
      )
      expect(r.hasPreviousPendingStep).toBe(true)
      expect(r.isOutOfSequence).toBe(true)
      expect(r.awaitingOthersActivities).toEqual([])
      expect(r.allPreviousOpenActivities.map((a) => a.activityTitle)).toEqual([
        'Desmontagem',
      ])
    })

    it('7) sem ownership preserva comportamento gestor (toda aberta bloqueia)', () => {
      const nodes = fourStepTree()
      const r = analyzeConveyorActivitySequence(nodes, 'act3')
      expect(r.isOutOfSequence).toBe(true)
      expect(r.previousOpenCount).toBe(2)
      expect(r.awaitingOthersCount).toBe(0)
    })

    it('8) João aponta Pintura com Funilaria da Maria pendente → estruturalmente pendente, awaiting Funilaria', () => {
      const nodes = fourStepTree()
      const r = analyzeConveyorActivitySequence(
        nodes,
        'act3',
        ownership(JOAO, {
          act2: [MARIA],
          act3: [JOAO],
        }),
      )
      expect(r.hasPreviousPendingStep).toBe(true)
      expect(r.isOutOfSequence).toBe(true)
      expect(r.awaitingOthersActivities[0]?.activityTitle).toBe('Funilaria')
    })

    it('9) predecessora ABORTED não bloqueia sequência', () => {
      const nodes = fourStepTree({ act1: 'ABORTED', act2: 'PENDING' })
      const r = analyzeConveyorActivitySequence(nodes, 'act2')
      expect(r.targetFound).toBe(true)
      expect(r.hasPreviousPendingStep).toBe(false)
      expect(r.previousOpenCount).toBe(0)
    })
  })
})
