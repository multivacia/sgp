import { describe, expect, it } from 'vitest'
import type { OperationalPlanningFactoryIntakeItem } from '../../domain/operational-planning/operational-planning.types'
import {
  buildVisibleFactoryIntakeGroups,
  filterFactoryIntakeGroups,
  groupFactoryIntakeItemsByConveyor,
  summarizeFactoryIntakeGroup,
} from './factoryIntakeGrouping'

const WEEK: { weekMonday: string; weekFriday: string; weekdayDates: string[] } = {
  weekMonday: '2026-05-12',
  weekFriday: '2026-05-16',
  weekdayDates: ['2026-05-12', '2026-05-13', '2026-05-14', '2026-05-15', '2026-05-16'],
}

function intake(
  partial: Partial<OperationalPlanningFactoryIntakeItem> &
    Pick<
      OperationalPlanningFactoryIntakeItem,
      'conveyorOperationalPlanItemId' | 'conveyorId' | 'conveyorOperationalPlanId'
    >,
): OperationalPlanningFactoryIntakeItem {
  return {
    conveyorName: 'Esteira A',
    activityNodeId: 'act-1',
    plannedDate: null,
    plannedOrder: 0,
    plannedMinutes: 60,
    plannedCollaboratorId: null,
    plannedCollaboratorName: null,
    plannedTeamId: null,
    plannedTeamName: null,
    taskTitle: 'Tarefa',
    sectorTitle: 'Setor',
    activityTitle: 'Atividade',
    activityOperationalStatus: null,
    realizedMinutes: 0,
    reviewRequired: false,
    syncStatus: null,
    factoryPlanningStatus: null,
    operationalPlanStatus: 'WAITING_FACTORY_PLANNING',
    planItemStatus: 'PLANNED',
    totalPlanItems: 1,
    linkedPlanItems: 0,
    pendingPlanItems: 1,
    ...partial,
  }
}

const ALL_FILTERS = {
  q: '',
  review: 'all' as const,
  period: 'all' as const,
  sync: 'all' as const,
  execution: 'all' as const,
}

describe('groupFactoryIntakeItemsByConveyor', () => {
  it('agrupa por conveyorId e planId, soma minutos e conta revisão', () => {
    const items = [
      intake({
        conveyorOperationalPlanItemId: 'i1',
        conveyorId: 'c1',
        conveyorOperationalPlanId: 'p1',
        plannedMinutes: 30,
        reviewRequired: true,
        plannedDate: '2026-05-14',
      }),
      intake({
        conveyorOperationalPlanItemId: 'i2',
        conveyorId: 'c1',
        conveyorOperationalPlanId: 'p1',
        plannedMinutes: 45,
        plannedDate: '2026-05-13',
      }),
      intake({
        conveyorOperationalPlanItemId: 'i3',
        conveyorId: 'c2',
        conveyorOperationalPlanId: 'p2',
        conveyorName: 'Esteira B',
        plannedMinutes: 15,
      }),
    ]
    const groups = groupFactoryIntakeItemsByConveyor(items)
    expect(groups).toHaveLength(2)
    const g1 = groups.find((g) => g.conveyorId === 'c1')!
    expect(g1.summary.itemCount).toBe(2)
    expect(g1.summary.waitingMinutes).toBe(75)
    expect(g1.summary.reviewCount).toBe(1)
    expect(g1.summary.earliestPlannedDate).toBe('2026-05-13')
    expect(g1.summary.latestPlannedDate).toBe('2026-05-14')
  })

  it('ordena grupos por menor plannedDate e depois nome da esteira', () => {
    const items = [
      intake({
        conveyorOperationalPlanItemId: 'i1',
        conveyorId: 'c2',
        conveyorOperationalPlanId: 'p2',
        conveyorName: 'Zeta',
        plannedDate: '2026-05-20',
      }),
      intake({
        conveyorOperationalPlanItemId: 'i2',
        conveyorId: 'c1',
        conveyorOperationalPlanId: 'p1',
        conveyorName: 'Alfa',
        plannedDate: '2026-05-10',
      }),
      intake({
        conveyorOperationalPlanItemId: 'i3',
        conveyorId: 'c3',
        conveyorOperationalPlanId: 'p3',
        conveyorName: 'Beta',
      }),
    ]
    const groups = groupFactoryIntakeItemsByConveyor(items)
    expect(groups.map((g) => g.conveyorName)).toEqual(['Alfa', 'Zeta', 'Beta'])
  })

  it('não muta o array de entrada', () => {
    const items = [
      intake({
        conveyorOperationalPlanItemId: 'i1',
        conveyorId: 'c1',
        conveyorOperationalPlanId: 'p1',
      }),
    ]
    const copy = [...items]
    groupFactoryIntakeItemsByConveyor(items)
    expect(items).toEqual(copy)
  })
})

describe('summarizeFactoryIntakeGroup', () => {
  it('conta itens com realizedMinutes > 0', () => {
    const summary = summarizeFactoryIntakeGroup([
      intake({
        conveyorOperationalPlanItemId: 'i1',
        conveyorId: 'c1',
        conveyorOperationalPlanId: 'p1',
        realizedMinutes: 10,
      }),
      intake({
        conveyorOperationalPlanItemId: 'i2',
        conveyorId: 'c1',
        conveyorOperationalPlanId: 'p1',
        realizedMinutes: 0,
      }),
    ])
    expect(summary.executedCount).toBe(1)
  })
})

describe('filterFactoryIntakeGroups', () => {
  const groups = groupFactoryIntakeItemsByConveyor([
    intake({
      conveyorOperationalPlanItemId: 'i1',
      conveyorId: 'c1',
      conveyorOperationalPlanId: 'p1',
      conveyorName: 'Esteira Alfa',
      activityTitle: 'Pintura',
      reviewRequired: true,
      plannedDate: '2026-05-13',
    }),
    intake({
      conveyorOperationalPlanItemId: 'i2',
      conveyorId: 'c2',
      conveyorOperationalPlanId: 'p2',
      conveyorName: 'Esteira Beta',
      taskTitle: 'Funilaria',
      plannedDate: null,
    }),
    intake({
      conveyorOperationalPlanItemId: 'i3',
      conveyorId: 'c3',
      conveyorOperationalPlanId: 'p3',
      conveyorName: 'Esteira Gama',
      plannedDate: '2026-05-01',
    }),
  ])

  it('busca por esteira, atividade e tarefa', () => {
    expect(
      filterFactoryIntakeGroups(groups, { ...ALL_FILTERS, q: 'alfa' }, WEEK),
    ).toHaveLength(1)
    expect(
      filterFactoryIntakeGroups(groups, { ...ALL_FILTERS, q: 'pintura' }, WEEK),
    ).toHaveLength(1)
    expect(
      filterFactoryIntakeGroups(groups, { ...ALL_FILTERS, q: 'funilaria' }, WEEK),
    ).toHaveLength(1)
  })

  it('filtra com e sem revisão', () => {
    expect(
      filterFactoryIntakeGroups(groups, { ...ALL_FILTERS, review: 'with_review' }, WEEK),
    ).toHaveLength(1)
    expect(
      filterFactoryIntakeGroups(groups, { ...ALL_FILTERS, review: 'without_review' }, WEEK),
    ).toHaveLength(2)
  })

  it('filtra período nesta semana, sem data e atrasados', () => {
    expect(
      filterFactoryIntakeGroups(groups, { ...ALL_FILTERS, period: 'this_week' }, WEEK),
    ).toHaveLength(1)
    expect(
      filterFactoryIntakeGroups(groups, { ...ALL_FILTERS, period: 'no_date' }, WEEK),
    ).toHaveLength(1)
    expect(
      filterFactoryIntakeGroups(groups, { ...ALL_FILTERS, period: 'overdue' }, WEEK),
    ).toHaveLength(1)
  })
})

describe('buildVisibleFactoryIntakeGroups', () => {
  const items = [
    intake({
      conveyorOperationalPlanItemId: 'cop-1',
      conveyorId: 'c1',
      conveyorOperationalPlanId: 'p1',
    }),
    intake({
      conveyorOperationalPlanItemId: 'cop-2',
      conveyorId: 'c1',
      conveyorOperationalPlanId: 'p1',
    }),
    intake({
      conveyorOperationalPlanItemId: 'cop-3',
      conveyorId: 'c2',
      conveyorOperationalPlanId: 'p2',
      conveyorName: 'Outra',
    }),
  ]

  it('remove item no rascunho e some grupo quando todos estão no draft', () => {
    const groups = buildVisibleFactoryIntakeGroups(
      items,
      [
        { conveyorOperationalPlanItemId: 'cop-1' },
        { conveyorOperationalPlanItemId: 'cop-2' },
      ],
      ALL_FILTERS,
      WEEK,
    )
    expect(groups).toHaveLength(1)
    expect(groups[0]?.conveyorId).toBe('c2')
  })

  it('devolve item ao remover do rascunho', () => {
    const draft = [{ conveyorOperationalPlanItemId: 'cop-1' }]
    expect(
      buildVisibleFactoryIntakeGroups(items, draft, ALL_FILTERS, WEEK),
    ).toHaveLength(2)
    expect(
      buildVisibleFactoryIntakeGroups(items, [], ALL_FILTERS, WEEK),
    ).toHaveLength(2)
  })
})
