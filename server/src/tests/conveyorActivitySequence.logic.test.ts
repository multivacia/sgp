import { describe, expect, it } from 'vitest'
import {
  analyzeConveyorActivitySequence,
  type SequenceAnalysisNode,
} from '../modules/conveyors/conveyorActivitySequence.logic.js'

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
  })

  it('primeira Atividade não está fora de sequência', () => {
    const r = analyzeConveyorActivitySequence(tree(), 'act1')
    expect(r.isOutOfSequence).toBe(false)
    expect(r.previousOpenCount).toBe(0)
  })

  it('posterior com anteriores pendentes está fora de sequência', () => {
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
  })
})
