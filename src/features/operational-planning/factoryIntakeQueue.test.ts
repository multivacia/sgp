import { describe, expect, it } from 'vitest'
import type { OperationalPlanningFactoryIntakeItem } from '../../domain/operational-planning/operational-planning.types'
import { groupFactoryIntakeItemsByConveyor } from './factoryIntakeGrouping'
import {
  buildFactoryIntakePlanProgress,
  buildVisibleFactoryIntakeQueueGroups,
  countFactoryIntakeDraftItemsForGroup,
  enrichFactoryIntakeQueueGroups,
  filterFactoryIntakeQueueGroups,
  resolveFactoryIntakeGroupVisualState,
} from './factoryIntakeQueue'

const WEEK = {
  weekMonday: '2026-05-12',
  weekFriday: '2026-05-16',
  weekdayDates: ['2026-05-12', '2026-05-13', '2026-05-14', '2026-05-15', '2026-05-16'],
}

const ALL_FILTERS = {
  q: '',
  review: 'all' as const,
  period: 'all' as const,
  sync: 'all' as const,
  execution: 'all' as const,
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
    totalPlanItems: 2,
    linkedPlanItems: 0,
    pendingPlanItems: 2,
    ...partial,
  }
}

describe('resolveFactoryIntakeGroupVisualState', () => {
  it('retorna with_issues quando há revisão', () => {
    expect(
      resolveFactoryIntakeGroupVisualState({
        summary: {
          itemCount: 1,
          waitingMinutes: 60,
          reviewCount: 1,
          executedCount: 0,
          earliestPlannedDate: '2026-05-12',
          latestPlannedDate: '2026-05-12',
        },
        planProgress: null,
        weekSyncDivergenceCount: 0,
        factoryPlanningStatus: null,
        hasItemSyncIssues: false,
      }),
    ).toBe('with_issues')
  })

  it('retorna waiting quando itens aguardam sem pendências', () => {
    expect(
      resolveFactoryIntakeGroupVisualState({
        summary: {
          itemCount: 2,
          waitingMinutes: 120,
          reviewCount: 0,
          executedCount: 0,
          earliestPlannedDate: null,
          latestPlannedDate: null,
        },
        planProgress: null,
        weekSyncDivergenceCount: 0,
        factoryPlanningStatus: null,
        hasItemSyncIssues: false,
      }),
    ).toBe('waiting')
  })

  it('retorna partially_fitted quando parte do plano já está encaixada', () => {
    expect(
      resolveFactoryIntakeGroupVisualState({
        summary: {
          itemCount: 1,
          waitingMinutes: 60,
          reviewCount: 0,
          executedCount: 0,
          earliestPlannedDate: '2026-05-12',
          latestPlannedDate: '2026-05-12',
        },
        planProgress: {
          totalPlanItems: 4,
          linkedPlanItems: 2,
          pendingPlanItems: 2,
          fittedPercent: 50,
        },
        weekSyncDivergenceCount: 0,
        factoryPlanningStatus: 'PARTIALLY_SCHEDULED',
        hasItemSyncIssues: false,
      }),
    ).toBe('partially_fitted')
  })
})

describe('buildFactoryIntakePlanProgress', () => {
  it('calcula percentual encaixado', () => {
    expect(
      buildFactoryIntakePlanProgress(
        intake({
          conveyorOperationalPlanItemId: 'i1',
          conveyorId: 'c1',
          conveyorOperationalPlanId: 'p1',
          totalPlanItems: 4,
          linkedPlanItems: 1,
          pendingPlanItems: 3,
        }),
      ),
    ).toEqual({
      totalPlanItems: 4,
      linkedPlanItems: 1,
      pendingPlanItems: 3,
      fittedPercent: 25,
    })
  })
})

describe('filterFactoryIntakeQueueGroups', () => {
  const items = [
    intake({
      conveyorOperationalPlanItemId: 'i1',
      conveyorId: 'c1',
      conveyorOperationalPlanId: 'p1',
      reviewRequired: true,
      plannedDate: '2026-05-01',
    }),
    intake({
      conveyorOperationalPlanItemId: 'i2',
      conveyorId: 'c2',
      conveyorOperationalPlanId: 'p2',
      conveyorName: 'Beta',
      realizedMinutes: 20,
      plannedDate: null,
    }),
  ]
  const groups = enrichFactoryIntakeQueueGroups(groupFactoryIntakeItemsByConveyor(items), {
    intakeItems: items,
    draftItems: [],
    weekPlanItems: [],
  })

  it('filtra com revisão', () => {
    const out = filterFactoryIntakeQueueGroups(
      groups,
      { ...ALL_FILTERS, review: 'with_review' },
      WEEK,
    )
    expect(out).toHaveLength(1)
    expect(out[0]?.conveyorId).toBe('c1')
  })

  it('filtra atrasados e sem data', () => {
    expect(
      filterFactoryIntakeQueueGroups(groups, { ...ALL_FILTERS, period: 'overdue' }, WEEK),
    ).toHaveLength(1)
    expect(
      filterFactoryIntakeQueueGroups(groups, { ...ALL_FILTERS, period: 'no_date' }, WEEK),
    ).toHaveLength(1)
  })

  it('filtra execução parcial', () => {
    const out = filterFactoryIntakeQueueGroups(
      groups,
      { ...ALL_FILTERS, execution: 'partially_executed' },
      WEEK,
    )
    expect(out).toHaveLength(1)
    expect(out[0]?.conveyorId).toBe('c2')
  })
})

describe('countFactoryIntakeDraftItemsForGroup', () => {
  it('conta itens do plano já no rascunho da semana', () => {
    const items = [
      intake({
        conveyorOperationalPlanItemId: 'i1',
        conveyorId: 'c1',
        conveyorOperationalPlanId: 'p1',
      }),
      intake({
        conveyorOperationalPlanItemId: 'i2',
        conveyorId: 'c1',
        conveyorOperationalPlanId: 'p1',
      }),
    ]
    expect(
      countFactoryIntakeDraftItemsForGroup('p1', items, [
        { conveyorOperationalPlanItemId: 'i1' },
      ]),
    ).toBe(1)
  })
})

describe('buildVisibleFactoryIntakeQueueGroups', () => {
  it('estado vazio quando não há itens', () => {
    expect(
      buildVisibleFactoryIntakeQueueGroups([], [], ALL_FILTERS, WEEK, []),
    ).toEqual([])
  })

  it('estado vazio por filtros de busca', () => {
    const items = [
      intake({
        conveyorOperationalPlanItemId: 'i1',
        conveyorId: 'c1',
        conveyorOperationalPlanId: 'p1',
        conveyorName: 'Alfa',
      }),
    ]
    expect(
      buildVisibleFactoryIntakeQueueGroups(
        items,
        [],
        { ...ALL_FILTERS, q: 'inexistente' },
        WEEK,
        [],
      ),
    ).toEqual([])
  })

  it('ordena por data mais antiga', () => {
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
    ]
    const groups = buildVisibleFactoryIntakeQueueGroups(items, [], ALL_FILTERS, WEEK, [])
    expect(groups.map((g) => g.conveyorName)).toEqual(['Alfa', 'Zeta'])
  })
})
