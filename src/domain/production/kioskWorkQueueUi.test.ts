import { describe, expect, it } from 'vitest'
import type { ProductionWorkQueueItem } from './production.types'
import {
  findInitialKioskCarouselIndex,
  partitionKioskWorkQueue,
} from './kioskWorkQueueUi'

function item(
  overrides: Partial<ProductionWorkQueueItem> & Pick<ProductionWorkQueueItem, 'workPlanItemId'>,
): ProductionWorkQueueItem {
  return {
    conveyorId: 'cv-1',
    conveyorTitle: '7452',
    activityNodeId: overrides.workPlanItemId,
    activityTitle: overrides.workPlanItemId,
    taskTitle: 'Tarefa',
    sectorTitle: 'Setor',
    plannedDate: '2026-05-04',
    plannedMinutes: 60,
    realizedMinutes: 0,
    pendingMinutes: 60,
    activityOperationalStatus: 'PENDING',
    isActivityCompleted: false,
    isOverdue: false,
    isOutOfSequence: false,
    isNextRecommended: false,
    previousOpenCount: 0,
    previousOpenActivities: [],
    hasPreviousOpenActivitiesFromOtherCollaborators: false,
    previousOpenActivitiesFromOtherCollaborators: [],
    previousOpenActivitiesWarningMessage: null,
    group: 'today',
    canTrackTime: true,
    canCompleteStep: true,
    requiresOutOfSequenceJustification: false,
    ...overrides,
  }
}

describe('kioskWorkQueueUi', () => {
  describe('findInitialKioskCarouselIndex', () => {
    it('abre no primeiro item isNextRecommended', () => {
      const items = [
        item({ workPlanItemId: 'oos', isOutOfSequence: true, isNextRecommended: false }),
        item({ workPlanItemId: 'rec', isNextRecommended: true }),
      ]
      expect(findInitialKioskCarouselIndex(items)).toBe(1)
    })

    it('não abre em fora de sequência quando existe recomendada antes na lista', () => {
      const items = [
        item({ workPlanItemId: 'rec', isNextRecommended: true }),
        item({ workPlanItemId: 'oos', isOutOfSequence: true }),
      ]
      expect(findInitialKioskCarouselIndex(items)).toBe(0)
    })

    it('fallback seguro para 0 quando não há recomendada nem em sequência', () => {
      const items = [item({ workPlanItemId: 'oos', isOutOfSequence: true })]
      expect(findInitialKioskCarouselIndex(items)).toBe(0)
    })
  })

  describe('partitionKioskWorkQueue', () => {
    it('separa recomendadas e fora de sequência', () => {
      const items = [
        item({ workPlanItemId: 'rec', isNextRecommended: true }),
        item({
          workPlanItemId: 'oos',
          isOutOfSequence: true,
          requiresOutOfSequenceJustification: true,
        }),
        item({ workPlanItemId: 'done', isActivityCompleted: true, group: 'completed' }),
      ]
      const sections = partitionKioskWorkQueue(items)
      expect(sections.map((s) => s.id)).toEqual(['recommended', 'outOfSequence', 'other'])
      expect(sections[0]?.items.map((i) => i.workPlanItemId)).toEqual(['rec'])
      expect(sections[1]?.items.map((i) => i.workPlanItemId)).toEqual(['oos'])
      expect(sections[2]?.items.map((i) => i.workPlanItemId)).toEqual(['done'])
    })
  })
})
