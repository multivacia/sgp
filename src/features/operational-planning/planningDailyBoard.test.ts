import { describe, expect, it } from 'vitest'
import {
  buildPlanningDailyBoardColumns,
  filterPlanningDailyItemsByDay,
  resolvePlanningDailyBoardEmptyMessage,
  resolvePlanningDailyColumn,
  resolveDefaultPlanningDailySelectedDay,
  type PlanningDailyBoardItem,
} from './planningDailyBoard'

function item(
  partial: Partial<PlanningDailyBoardItem> & Pick<PlanningDailyBoardItem, 'plannedDate'>,
): PlanningDailyBoardItem {
  return {
    plannedMinutes: 60,
    realizedMinutes: 0,
    activityOperationalStatus: 'PENDING',
    assignedCollaboratorId: 'c1',
    ...partial,
  }
}

describe('resolvePlanningDailyColumn', () => {
  it('COMPLETED → completed', () => {
    expect(
      resolvePlanningDailyColumn(
        item({ plannedDate: '2026-05-18', activityOperationalStatus: 'COMPLETED' }),
      ),
    ).toBe('completed')
  })

  it('BLOCKED → attention', () => {
    expect(
      resolvePlanningDailyColumn(
        item({ plannedDate: '2026-05-18', activityOperationalStatus: 'BLOCKED' }),
      ),
    ).toBe('attention')
  })

  it('reached planned sem completed → attention', () => {
    expect(
      resolvePlanningDailyColumn(
        item({
          plannedDate: '2026-05-18',
          plannedMinutes: 60,
          realizedMinutes: 60,
          activityOperationalStatus: 'IN_PROGRESS',
        }),
      ),
    ).toBe('attention')
  })

  it('over planned sem completed → attention', () => {
    expect(
      resolvePlanningDailyColumn(
        item({
          plannedDate: '2026-05-18',
          plannedMinutes: 60,
          realizedMinutes: 90,
          activityOperationalStatus: 'IN_PROGRESS',
        }),
      ),
    ).toBe('attention')
  })

  it('realized parcial → in_progress', () => {
    expect(
      resolvePlanningDailyColumn(
        item({
          plannedDate: '2026-05-18',
          plannedMinutes: 120,
          realizedMinutes: 45,
          activityOperationalStatus: 'IN_PROGRESS',
        }),
      ),
    ).toBe('in_progress')
  })

  it('realized 0 → planned', () => {
    expect(
      resolvePlanningDailyColumn(
        item({
          plannedDate: '2026-05-18',
          realizedMinutes: 0,
          activityOperationalStatus: 'PENDING',
        }),
      ),
    ).toBe('planned')
  })

  it('plannedMinutes <= 0 → attention', () => {
    expect(
      resolvePlanningDailyColumn(
        item({ plannedDate: '2026-05-18', plannedMinutes: 0, realizedMinutes: 0 }),
      ),
    ).toBe('attention')
  })

  it('sem responsável → attention', () => {
    expect(
      resolvePlanningDailyColumn(
        item({
          plannedDate: '2026-05-18',
          assignedCollaboratorId: '',
          realizedMinutes: 0,
        }),
      ),
    ).toBe('attention')
  })
})

describe('buildPlanningDailyBoardColumns', () => {
  it('lista vazia retorna colunas zeradas', () => {
    const { columns } = buildPlanningDailyBoardColumns([])
    expect(columns).toHaveLength(4)
    expect(columns.every((c) => c.count === 0)).toBe(true)
  })

  it('item aparece em coluna única', () => {
    const items = [
      item({ plannedDate: '2026-05-18', realizedMinutes: 30 }),
      item({
        plannedDate: '2026-05-19',
        activityOperationalStatus: 'COMPLETED',
        realizedMinutes: 60,
      }),
    ]
    const { columns } = buildPlanningDailyBoardColumns(items, { selectedDay: 'week' })
    const allAssigned = columns.flatMap((c) => c.items)
    expect(allAssigned).toHaveLength(2)
    const ids = columns.filter((c) => c.count > 0).map((c) => c.id)
    expect(ids).toEqual(['in_progress', 'completed'])
  })

  it('soma planned/realized por coluna', () => {
    const { columns } = buildPlanningDailyBoardColumns(
      [
        item({
          plannedDate: '2026-05-18',
          plannedMinutes: 60,
          realizedMinutes: 30,
        }),
        item({
          plannedDate: '2026-05-18',
          plannedMinutes: 90,
          realizedMinutes: 0,
        }),
      ],
      { selectedDay: 'week' },
    )
    const plannedCol = columns.find((c) => c.id === 'planned')!
    const inProgressCol = columns.find((c) => c.id === 'in_progress')!
    expect(plannedCol.plannedMinutes).toBe(90)
    expect(plannedCol.realizedMinutes).toBe(0)
    expect(inProgressCol.plannedMinutes).toBe(60)
    expect(inProgressCol.realizedMinutes).toBe(30)
  })

  it('não muta arrays originais', () => {
    const items = [item({ plannedDate: '2026-05-18' })]
    const copy = [...items]
    buildPlanningDailyBoardColumns(items)
    expect(items).toEqual(copy)
  })
})

describe('filterPlanningDailyItemsByDay', () => {
  const items = [
    item({ plannedDate: '2026-05-18' }),
    item({ plannedDate: '2026-05-19' }),
  ]

  it('filtra por dia', () => {
    expect(filterPlanningDailyItemsByDay(items, '2026-05-18')).toHaveLength(1)
  })

  it('semana inteira retorna todos ativos', () => {
    expect(filterPlanningDailyItemsByDay(items, 'week')).toHaveLength(2)
  })
})

describe('resolveDefaultPlanningDailySelectedDay', () => {
  it('retorna hoje quando está na semana', () => {
    expect(
      resolveDefaultPlanningDailySelectedDay(
        ['2026-05-18', '2026-05-19'],
        '2026-05-19',
      ),
    ).toBe('2026-05-19')
  })

  it('retorna week quando hoje não está na semana', () => {
    expect(
      resolveDefaultPlanningDailySelectedDay(['2026-05-18'], '2026-05-25'),
    ).toBe('week')
  })
})

describe('resolvePlanningDailyBoardEmptyMessage', () => {
  it('mensagem para filtros ativos sem itens', () => {
    expect(resolvePlanningDailyBoardEmptyMessage(0, 0, true)).toMatch(/filtros/)
  })

  it('mensagem para recorte vazio', () => {
    expect(resolvePlanningDailyBoardEmptyMessage(2, 0, false)).toMatch(/recorte/)
  })
})
