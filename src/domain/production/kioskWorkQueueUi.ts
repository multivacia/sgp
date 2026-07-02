import type { ProductionWorkQueueItem } from './production.types'

export function findInitialKioskCarouselIndex(items: ProductionWorkQueueItem[]): number {
  const recommendedIndex = items.findIndex((item) => item.isNextRecommended)
  if (recommendedIndex >= 0) return recommendedIndex
  const inSequenceIndex = items.findIndex((item) => !item.isOutOfSequence && !item.isActivityCompleted)
  return inSequenceIndex >= 0 ? inSequenceIndex : 0
}

export type KioskWorkQueueSection = {
  id: 'recommended' | 'outOfSequence' | 'other'
  title: string
  items: ProductionWorkQueueItem[]
}

export function partitionKioskWorkQueue(items: ProductionWorkQueueItem[]): KioskWorkQueueSection[] {
  const recommended = items.filter(
    (item) => item.isNextRecommended && !item.isActivityCompleted,
  )
  const outOfSequence = items.filter(
    (item) =>
      !item.isActivityCompleted &&
      item.isOutOfSequence &&
      !item.isNextRecommended,
  )
  const other = items.filter(
    (item) =>
      !recommended.some((r) => r.workPlanItemId === item.workPlanItemId) &&
      !outOfSequence.some((o) => o.workPlanItemId === item.workPlanItemId),
  )

  const sections: KioskWorkQueueSection[] = []
  if (recommended.length > 0) {
    sections.push({
      id: 'recommended',
      title: 'Próxima atividade recomendada',
      items: recommended,
    })
  }
  if (outOfSequence.length > 0) {
    sections.push({
      id: 'outOfSequence',
      title: 'Atividades fora de sequência',
      items: outOfSequence,
    })
  }
  if (other.length > 0) {
    sections.push({
      id: 'other',
      title: recommended.length > 0 || outOfSequence.length > 0 ? 'Demais atividades' : 'Atividades',
      items: other,
    })
  }
  return sections
}
