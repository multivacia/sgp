import { describe, expect, it } from 'vitest'
import {
  applyWorkQueuePrioritization,
  assignWorkQueueRecommendations,
  compareWorkQueueItems,
  sortWorkQueueItems,
} from '../modules/my-work-queue/work-queue-prioritization.js'

type Item = {
  group: 'overdue' | 'today' | 'completed'
  isOutOfSequence: boolean
  plannedDate: string
  workPlanItemId: string
  isActivityCompleted: boolean
  conveyorId: string
  structuralSequenceIndex: number
}

function item(overrides: Partial<Item> & Pick<Item, 'workPlanItemId'>): Item {
  return {
    group: 'today',
    isOutOfSequence: false,
    plannedDate: '2026-05-04',
    isActivityCompleted: false,
    conveyorId: 'cv-1',
    structuralSequenceIndex: 0,
    ...overrides,
  }
}

describe('work-queue-prioritization', () => {
  describe('compareWorkQueueItems / sortWorkQueueItems', () => {
    it('prioriza em sequência antes de fora de sequência no mesmo grupo', () => {
      const a = item({ workPlanItemId: 'a', structuralSequenceIndex: 0, isOutOfSequence: false })
      const c = item({ workPlanItemId: 'c', structuralSequenceIndex: 2, isOutOfSequence: true })
      const sorted = sortWorkQueueItems([c, a])
      expect(sorted.map((i) => i.workPlanItemId)).toEqual(['a', 'c'])
    })

    it('ordena pela sequência estrutural da esteira, não pelo planned_order implícito', () => {
      const a = item({ workPlanItemId: 'a', structuralSequenceIndex: 0 })
      const b = item({ workPlanItemId: 'b', structuralSequenceIndex: 1 })
      const c = item({ workPlanItemId: 'c', structuralSequenceIndex: 2, isOutOfSequence: true })
      const sorted = sortWorkQueueItems([c, b, a])
      expect(sorted.map((i) => i.workPlanItemId)).toEqual(['a', 'b', 'c'])
    })

    it('mantém overdue antes de today e completed por último', () => {
      const overdue = item({
        workPlanItemId: 'overdue',
        group: 'overdue',
        plannedDate: '2026-05-01',
      })
      const today = item({ workPlanItemId: 'today', group: 'today' })
      const done = item({
        workPlanItemId: 'done',
        group: 'completed',
        isActivityCompleted: true,
      })
      const sorted = sortWorkQueueItems([done, today, overdue])
      expect(sorted.map((i) => i.workPlanItemId)).toEqual(['overdue', 'today', 'done'])
    })
  })

  describe('assignWorkQueueRecommendations — cenário A, B, C mesmo colaborador', () => {
    const a = item({
      workPlanItemId: 'item-a',
      structuralSequenceIndex: 0,
      isOutOfSequence: false,
    })
    const b = item({
      workPlanItemId: 'item-b',
      structuralSequenceIndex: 1,
      isOutOfSequence: true,
    })
    const c = item({
      workPlanItemId: 'item-c',
      structuralSequenceIndex: 2,
      isOutOfSequence: true,
    })

    it('com A, B, C pendentes, A é a única recomendada', () => {
      const result = assignWorkQueueRecommendations([c, b, a])
      expect(result.find((i) => i.workPlanItemId === 'item-a')?.isNextRecommended).toBe(true)
      expect(result.find((i) => i.workPlanItemId === 'item-b')?.isNextRecommended).toBe(false)
      expect(result.find((i) => i.workPlanItemId === 'item-c')?.isNextRecommended).toBe(false)
    })

    it('após concluir A, B é recomendada e C continua bloqueada', () => {
      const result = assignWorkQueueRecommendations([
        { ...a, isActivityCompleted: true },
        { ...b, isOutOfSequence: false },
        c,
      ])
      expect(result.find((i) => i.workPlanItemId === 'item-b')?.isNextRecommended).toBe(true)
      expect(result.find((i) => i.workPlanItemId === 'item-c')?.isNextRecommended).toBe(false)
    })
  })

  describe('assignWorkQueueRecommendations — Maria com B alerta e C bloqueada', () => {
    it('recomenda apenas B quando C depende de B da própria Maria', () => {
      const b = item({
        workPlanItemId: 'item-b',
        structuralSequenceIndex: 1,
        isOutOfSequence: false,
      })
      const c = item({
        workPlanItemId: 'item-c',
        structuralSequenceIndex: 2,
        isOutOfSequence: true,
      })
      const result = assignWorkQueueRecommendations([c, b])
      expect(result.find((i) => i.workPlanItemId === 'item-b')?.isNextRecommended).toBe(true)
      expect(result.find((i) => i.workPlanItemId === 'item-c')?.isNextRecommended).toBe(false)
    })
  })

  it('applyWorkQueuePrioritization combina ordenação e recomendação', () => {
    const result = applyWorkQueuePrioritization([
      item({ workPlanItemId: 'c', structuralSequenceIndex: 2, isOutOfSequence: true }),
      item({ workPlanItemId: 'a', structuralSequenceIndex: 0 }),
    ])
    expect(result.map((i) => i.workPlanItemId)).toEqual(['a', 'c'])
    expect(result[0]?.isNextRecommended).toBe(true)
  })

  it('compareWorkQueueItems é estável para empate', () => {
    const left = item({ workPlanItemId: 'aaa', structuralSequenceIndex: 0 })
    const right = item({ workPlanItemId: 'bbb', structuralSequenceIndex: 0 })
    expect(compareWorkQueueItems(left, right)).toBeLessThan(0)
    expect(compareWorkQueueItems(right, left)).toBeGreaterThan(0)
  })
})
