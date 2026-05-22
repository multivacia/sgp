import { describe, expect, it } from 'vitest'
import {
  buildPlanningDeviationItems,
  buildPlanningDeviationSummary,
  classifyPlanningDeviationItem,
  emptyPlanningDeviationSummary,
  formatPlanningDeviationBalance,
  type PlanningDeviationPlanItem,
} from './planningDeviationIndicators'
import type { OperationalPlanningExecutionOutsidePlanEntry } from '../../domain/operational-planning/operational-planning.types'
import {
  DEFAULT_PLANNING_BOARD_FILTERS,
  PLANNING_COLLABORATOR_ALL,
  PLANNING_CONVEYOR_ALL,
} from './planningBoardFilters'

const EMPTY_OUTSIDE_SUMMARY = {
  totalMinutes: 0,
  entriesCount: 0,
  activitiesCount: 0,
  conveyorsCount: 0,
}

function plan(
  partial: Partial<PlanningDeviationPlanItem> &
    Pick<PlanningDeviationPlanItem, 'conveyorId' | 'plannedDate'>,
): PlanningDeviationPlanItem {
  return {
    conveyorTitle: 'Esteira A',
    activityTitle: 'Atividade',
    plannedMinutes: 60,
    realizedMinutes: 0,
    activityOperationalStatus: 'PENDING',
    ...partial,
  }
}

function outsideEntry(
  partial: Partial<OperationalPlanningExecutionOutsidePlanEntry> &
    Pick<OperationalPlanningExecutionOutsidePlanEntry, 'id'>,
): OperationalPlanningExecutionOutsidePlanEntry {
  return {
    conveyorId: 'c-out',
    conveyorTitle: 'Esteira B',
    activityNodeId: 'node-1',
    activityTitle: 'Fora',
    taskTitle: 'Tarefa',
    sectorTitle: 'Setor',
    collaboratorId: 'col-1',
    collaboratorName: 'João',
    entryAt: '2026-05-19T10:00:00.000Z',
    minutes: 30,
    entryOrigin: 'ASSIGNED',
    exceptionJustification: null,
    notes: null,
    ...partial,
  }
}

describe('buildPlanningDeviationSummary', () => {
  it('sem itens e sem fora do plano retorna zeros', () => {
    expect(buildPlanningDeviationSummary([], EMPTY_OUTSIDE_SUMMARY, [])).toEqual(
      emptyPlanningDeviationSummary(),
    )
  })

  it('soma plannedMinutes', () => {
    const summary = buildPlanningDeviationSummary(
      [
        plan({ conveyorId: 'c1', plannedDate: '2026-05-18', plannedMinutes: 90 }),
        plan({ conveyorId: 'c2', plannedDate: '2026-05-19', plannedMinutes: 30 }),
      ],
      EMPTY_OUTSIDE_SUMMARY,
      [],
    )
    expect(summary.plannedMinutesTotal).toBe(120)
  })

  it('soma realizedMinutes dos itens planejados', () => {
    const summary = buildPlanningDeviationSummary(
      [
        plan({ conveyorId: 'c1', plannedDate: '2026-05-18', realizedMinutes: 45 }),
        plan({ conveyorId: 'c2', plannedDate: '2026-05-19', realizedMinutes: 15 }),
      ],
      EMPTY_OUTSIDE_SUMMARY,
      [],
    )
    expect(summary.realizedPlannedMinutes).toBe(60)
  })

  it('soma outsidePlanMinutes', () => {
    const summary = buildPlanningDeviationSummary(
      [],
      { totalMinutes: 75, entriesCount: 2, activitiesCount: 1, conveyorsCount: 1 },
      [],
    )
    expect(summary.outsidePlanMinutes).toBe(75)
  })

  it('calcula saldo positivo', () => {
    const summary = buildPlanningDeviationSummary(
      [plan({ conveyorId: 'c1', plannedDate: '2026-05-18', plannedMinutes: 60, realizedMinutes: 80 })],
      { totalMinutes: 30, entriesCount: 1, activitiesCount: 1, conveyorsCount: 1 },
      [],
    )
    expect(summary.totalExecutedMinutes).toBe(110)
    expect(summary.balanceMinutes).toBe(50)
    expect(formatPlanningDeviationBalance(summary.balanceMinutes)).toBe('+50min')
  })

  it('calcula saldo negativo', () => {
    const summary = buildPlanningDeviationSummary(
      [plan({ conveyorId: 'c1', plannedDate: '2026-05-18', plannedMinutes: 120, realizedMinutes: 30 })],
      EMPTY_OUTSIDE_SUMMARY,
      [],
    )
    expect(summary.balanceMinutes).toBe(-90)
    expect(formatPlanningDeviationBalance(summary.balanceMinutes)).toBe('−1h30')
  })

  it('conta planejado sem execução', () => {
    const summary = buildPlanningDeviationSummary(
      [
        plan({ conveyorId: 'c1', plannedDate: '2026-05-18', realizedMinutes: 0 }),
        plan({ conveyorId: 'c2', plannedDate: '2026-05-19', realizedMinutes: null }),
      ],
      EMPTY_OUTSIDE_SUMMARY,
      [],
    )
    expect(summary.plannedWithoutExecutionCount).toBe(2)
  })

  it('conta completed', () => {
    const summary = buildPlanningDeviationSummary(
      [
        plan({
          conveyorId: 'c1',
          plannedDate: '2026-05-18',
          activityOperationalStatus: 'COMPLETED',
          realizedMinutes: 60,
        }),
      ],
      EMPTY_OUTSIDE_SUMMARY,
      [],
    )
    expect(summary.completedItemsCount).toBe(1)
    expect(summary.plannedWithoutExecutionCount).toBe(0)
  })

  it('conta over planned', () => {
    const summary = buildPlanningDeviationSummary(
      [
        plan({
          conveyorId: 'c1',
          plannedDate: '2026-05-18',
          plannedMinutes: 60,
          realizedMinutes: 90,
        }),
      ],
      EMPTY_OUTSIDE_SUMMARY,
      [],
    )
    expect(summary.overPlannedCount).toBe(1)
  })

  it('conta reached planned not completed', () => {
    const summary = buildPlanningDeviationSummary(
      [
        plan({
          conveyorId: 'c1',
          plannedDate: '2026-05-18',
          plannedMinutes: 60,
          realizedMinutes: 60,
          activityOperationalStatus: 'IN_PROGRESS',
        }),
      ],
      EMPTY_OUTSIDE_SUMMARY,
      [],
    )
    expect(summary.reachedPlannedNotCompletedCount).toBe(1)
    expect(summary.overPlannedCount).toBe(0)
  })

  it('ignora itens CANCELLED', () => {
    const summary = buildPlanningDeviationSummary(
      [plan({ conveyorId: 'c1', plannedDate: '2026-05-18', status: 'CANCELLED', plannedMinutes: 60 })],
      EMPTY_OUTSIDE_SUMMARY,
      [],
    )
    expect(summary.plannedItemsCount).toBe(0)
    expect(summary.plannedMinutesTotal).toBe(0)
  })
})

describe('buildPlanningDeviationItems', () => {
  it('cria desvio OUTSIDE_PLAN', () => {
    const items = buildPlanningDeviationItems(
      [],
      [outsideEntry({ id: 'e1', minutes: 45 })],
    )
    expect(items).toHaveLength(1)
    expect(items[0]?.kind).toBe('OUTSIDE_PLAN')
  })

  it('cria desvio PLANNED_WITHOUT_EXECUTION', () => {
    const items = buildPlanningDeviationItems(
      [plan({ conveyorId: 'c1', plannedDate: '2026-05-18', realizedMinutes: 0 })],
      [],
    )
    expect(items.some((i) => i.kind === 'PLANNED_WITHOUT_EXECUTION')).toBe(true)
  })

  it('ordena desvios por severidade', () => {
    const items = buildPlanningDeviationItems(
      [
        plan({ conveyorId: 'c1', plannedDate: '2026-05-18', realizedMinutes: 0 }),
        plan({
          conveyorId: 'c2',
          plannedDate: '2026-05-19',
          plannedMinutes: 60,
          realizedMinutes: 90,
        }),
      ],
      [outsideEntry({ id: 'e1' })],
    )
    expect(items[0]?.kind).toBe('OUTSIDE_PLAN')
    expect(items.some((i) => i.kind === 'OVER_PLANNED')).toBe(true)
    const outsideIdx = items.findIndex((i) => i.kind === 'OUTSIDE_PLAN')
    const overIdx = items.findIndex((i) => i.kind === 'OVER_PLANNED')
    const withoutIdx = items.findIndex((i) => i.kind === 'PLANNED_WITHOUT_EXECUTION')
    expect(outsideIdx).toBeLessThan(overIdx)
    expect(overIdx).toBeLessThan(withoutIdx)
  })

  it('limita a 10 desvios', () => {
    const plans = Array.from({ length: 12 }, (_, i) =>
      plan({ conveyorId: `c${i}`, plannedDate: '2026-05-18', realizedMinutes: 0 }),
    )
    expect(buildPlanningDeviationItems(plans, []).length).toBe(10)
  })

  it('respeita filtros de esteira em fora do plano', () => {
    const items = buildPlanningDeviationItems(
      [],
      [
        outsideEntry({ id: 'e1', conveyorId: 'keep', conveyorTitle: 'Keep' }),
        outsideEntry({ id: 'e2', conveyorId: 'drop', conveyorTitle: 'Drop' }),
      ],
      {
        filters: {
          ...DEFAULT_PLANNING_BOARD_FILTERS,
          conveyorId: 'keep',
        },
      },
    )
    expect(items).toHaveLength(1)
    expect(items[0]?.conveyorId).toBe('keep')
  })

  it('não muta arrays de entrada', () => {
    const plans = [
      plan({ conveyorId: 'c1', plannedDate: '2026-05-18', realizedMinutes: 0 }),
    ]
    const outside = [outsideEntry({ id: 'e1' })]
    const plansCopy = JSON.parse(JSON.stringify(plans))
    const outsideCopy = JSON.parse(JSON.stringify(outside))
    buildPlanningDeviationItems(plans, outside, {
      filters: {
        ...DEFAULT_PLANNING_BOARD_FILTERS,
        collaboratorId: PLANNING_COLLABORATOR_ALL,
        conveyorId: PLANNING_CONVEYOR_ALL,
        q: 'x',
      },
    })
    expect(plans).toEqual(plansCopy)
    expect(outside).toEqual(outsideCopy)
  })
})

describe('classifyPlanningDeviationItem', () => {
  it('classifica over antes de reached', () => {
    expect(
      classifyPlanningDeviationItem(
        plan({
          conveyorId: 'c1',
          plannedDate: '2026-05-18',
          plannedMinutes: 60,
          realizedMinutes: 90,
        }),
      ),
    ).toBe('OVER_PLANNED')
  })
})
