import { describe, expect, it } from 'vitest'
import {
  applyWorkQueuePrioritization,
  assignWorkQueueRecommendations,
  compareWorkQueueItems,
  sortWorkQueueItems,
} from '../modules/my-work-queue/work-queue-prioritization.js'

type Item = {
  group: 'overdue' | 'today' | 'completed'
  hasPreviousPendingStep: boolean
  plannedDate: string
  workPlanItemId: string
  isActivityCompleted: boolean
  conveyorId: string
  structuralSequenceIndex: number
  conveyorOperationalStatus: string
  isNextRecommended?: boolean
}

function item(overrides: Partial<Item> & Pick<Item, 'workPlanItemId'>): Item {
  return {
    group: 'today',
    hasPreviousPendingStep: false,
    plannedDate: '2026-05-04',
    isActivityCompleted: false,
    conveyorId: 'cv-1',
    structuralSequenceIndex: 0,
    conveyorOperationalStatus: 'EM_ANDAMENTO',
    ...overrides,
  }
}

describe('work-queue-prioritization', () => {
  describe('compareWorkQueueItems / sortWorkQueueItems', () => {
    it('prioriza em sequência antes de pendência anterior no mesmo grupo', () => {
      const a = item({ workPlanItemId: 'a', structuralSequenceIndex: 0 })
      const c = item({
        workPlanItemId: 'c',
        structuralSequenceIndex: 2,
        hasPreviousPendingStep: true,
      })
      const sorted = sortWorkQueueItems([c, a])
      expect(sorted.map((i) => i.workPlanItemId)).toEqual(['a', 'c'])
    })

    it('ordena pela sequência estrutural da esteira, não pelo planned_order implícito', () => {
      const a = item({ workPlanItemId: 'a', structuralSequenceIndex: 0 })
      const b = item({ workPlanItemId: 'b', structuralSequenceIndex: 1 })
      const c = item({
        workPlanItemId: 'c',
        structuralSequenceIndex: 2,
        hasPreviousPendingStep: true,
      })
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

  it('applyWorkQueuePrioritization apenas ordena e preserva isNextRecommended', () => {
    const result = applyWorkQueuePrioritization([
      item({
        workPlanItemId: 'c',
        structuralSequenceIndex: 2,
        hasPreviousPendingStep: true,
        isNextRecommended: false,
      }),
      item({
        workPlanItemId: 'a',
        structuralSequenceIndex: 0,
        isNextRecommended: true,
      }),
    ])
    expect(result.map((i) => i.workPlanItemId)).toEqual(['a', 'c'])
    expect(result.find((i) => i.workPlanItemId === 'a')?.isNextRecommended).toBe(true)
    expect(result.find((i) => i.workPlanItemId === 'c')?.isNextRecommended).toBe(false)
  })

  it('assignWorkQueueRecommendations não altera flags de recomendação (deprecated)', () => {
    const input = [
      item({ workPlanItemId: 'b', structuralSequenceIndex: 1, isNextRecommended: true }),
      item({
        workPlanItemId: 'c',
        structuralSequenceIndex: 2,
        hasPreviousPendingStep: true,
        isNextRecommended: false,
      }),
    ]
    const result = assignWorkQueueRecommendations(input)
    expect(result.find((i) => i.workPlanItemId === 'b')?.isNextRecommended).toBe(true)
    expect(result.find((i) => i.workPlanItemId === 'c')?.isNextRecommended).toBe(false)
  })

  it('compareWorkQueueItems é estável para empate', () => {
    const left = item({ workPlanItemId: 'aaa', structuralSequenceIndex: 0 })
    const right = item({ workPlanItemId: 'bbb', structuralSequenceIndex: 0 })
    expect(compareWorkQueueItems(left, right)).toBeLessThan(0)
    expect(compareWorkQueueItems(right, left)).toBeGreaterThan(0)
  })
})
