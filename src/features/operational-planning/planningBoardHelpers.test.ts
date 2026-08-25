import { describe, expect, it } from 'vitest'
import {
  buildPlanningAssigneeSummaries,
  buildPlanningDaySummaries,
  formatPlanningCapacityExceededMessage,
  formatPlanningMinutes,
  resolvePlanningCapacityState,
  sumPlanningItemMinutes,
} from './planningBoardHelpers'

type Item = {
  plannedDate: string
  plannedMinutes: number | null
  assignedCollaboratorId?: string
  assignedCollaboratorName?: string | null
  removed?: boolean
  cancelled?: boolean
}

function item(
  partial: Partial<Item> & Pick<Item, 'plannedDate' | 'plannedMinutes'>,
): Item {
  return {
    assignedCollaboratorId: 'c1',
    assignedCollaboratorName: 'João',
    ...partial,
  }
}

describe('formatPlanningMinutes', () => {
  it.each([
    [0, '0h'],
    [30, '30min'],
    [45, '45min'],
    [60, '1h'],
    [90, '1h30'],
    [135, '2h15'],
  ])('%i -> %s', (minutes, expected) => {
    expect(formatPlanningMinutes(minutes)).toBe(expected)
  })

  it('trata valores negativos como 0h', () => {
    expect(formatPlanningMinutes(-15)).toBe('0h')
  })

  it('trata NaN como 0h', () => {
    expect(formatPlanningMinutes(Number.NaN)).toBe('0h')
  })
})

describe('buildPlanningDaySummaries', () => {
  it('soma itens no mesmo dia', () => {
    const summaries = buildPlanningDaySummaries([
      item({ plannedDate: '2026-05-18', plannedMinutes: 60 }),
      item({ plannedDate: '2026-05-18', plannedMinutes: 30 }),
    ])
    expect(summaries['2026-05-18']).toEqual({ totalMinutes: 90, itemsCount: 2 })
  })

  it('separa itens por dias diferentes', () => {
    const summaries = buildPlanningDaySummaries([
      item({ plannedDate: '2026-05-18', plannedMinutes: 60 }),
      item({ plannedDate: '2026-05-19', plannedMinutes: 45 }),
    ])
    expect(summaries['2026-05-18']?.totalMinutes).toBe(60)
    expect(summaries['2026-05-19']?.totalMinutes).toBe(45)
  })

  it('ignora removed/cancelled', () => {
    const summaries = buildPlanningDaySummaries([
      item({ plannedDate: '2026-05-18', plannedMinutes: 60 }),
      item({ plannedDate: '2026-05-18', plannedMinutes: 30, removed: true }),
      item({ plannedDate: '2026-05-18', plannedMinutes: 20, cancelled: true }),
    ])
    expect(summaries['2026-05-18']).toEqual({ totalMinutes: 60, itemsCount: 1 })
  })

  it('dia sem item não aparece no mapa', () => {
    expect(buildPlanningDaySummaries([])).toEqual({})
  })

  it('não muta o array original', () => {
    const items = [item({ plannedDate: '2026-05-18', plannedMinutes: 60 })]
    const copy = [...items]
    buildPlanningDaySummaries(items)
    expect(items).toEqual(copy)
  })
})

describe('buildPlanningAssigneeSummaries', () => {
  it('soma por colaborador', () => {
    const rows = buildPlanningAssigneeSummaries([
      item({ plannedDate: '2026-05-18', plannedMinutes: 60, assignedCollaboratorId: 'c1' }),
      item({ plannedDate: '2026-05-19', plannedMinutes: 90, assignedCollaboratorId: 'c1' }),
      item({
        plannedDate: '2026-05-18',
        plannedMinutes: 45,
        assignedCollaboratorId: 'c2',
        assignedCollaboratorName: 'Maria',
      }),
    ])
    expect(rows.find((r) => r.assigneeId === 'c1')).toMatchObject({
      displayName: 'João',
      totalMinutes: 150,
      itemsCount: 2,
    })
    expect(rows.find((r) => r.assigneeId === 'c2')?.totalMinutes).toBe(45)
  })

  it('agrupa sem responsável', () => {
    const rows = buildPlanningAssigneeSummaries([
      item({
        plannedDate: '2026-05-18',
        plannedMinutes: 30,
        assignedCollaboratorId: '',
        assignedCollaboratorName: null,
      }),
    ])
    expect(rows).toHaveLength(1)
    expect(rows[0]?.displayName).toBe('Sem responsável')
    expect(rows[0]?.totalMinutes).toBe(30)
  })

  it('não muta o array original', () => {
    const items = [item({ plannedDate: '2026-05-18', plannedMinutes: 60 })]
    const copy = [...items]
    buildPlanningAssigneeSummaries(items)
    expect(items).toEqual(copy)
  })
})

describe('resolvePlanningCapacityState', () => {
  it('planned <= capacity -> normal', () => {
    expect(resolvePlanningCapacityState(400, 480)).toBe('normal')
    expect(resolvePlanningCapacityState(480, 480)).toBe('normal')
  })

  it('planned > capacity -> over_capacity', () => {
    expect(resolvePlanningCapacityState(481, 480)).toBe('over_capacity')
  })

  it('capacity ausente -> unknown', () => {
    expect(resolvePlanningCapacityState(60, null)).toBe('unknown')
    expect(resolvePlanningCapacityState(60, undefined)).toBe('unknown')
  })

  it('capacity 0 com planned > 0 -> over_capacity', () => {
    expect(resolvePlanningCapacityState(30, 0)).toBe('over_capacity')
  })

  it('capacity 0 com planned 0 -> normal', () => {
    expect(resolvePlanningCapacityState(0, 0)).toBe('normal')
  })
})

describe('formatPlanningCapacityExceededMessage', () => {
  it('inclui excesso formatado', () => {
    expect(formatPlanningCapacityExceededMessage(510, 480)).toBe('Capacidade excedida em 30min')
  })

  it('formata excesso de 60 minutos como 1h', () => {
    expect(formatPlanningCapacityExceededMessage(540, 480)).toBe('Capacidade excedida em 1h')
  })
})

describe('alerta imediato no rascunho com capacityMinutes da API', () => {
  it('com capacityRow disponível, draft acima do limite fica over_capacity', () => {
    const draftPlanned = sumPlanningItemMinutes([
      { plannedMinutes: 300, status: 'PLANNED' },
      { plannedMinutes: 240, status: 'PLANNED' },
    ])
    expect(draftPlanned).toBe(540)
    expect(resolvePlanningCapacityState(draftPlanned, 480)).toBe('over_capacity')
  })

  it('ao reduzir draft para o limite, alerta some', () => {
    expect(resolvePlanningCapacityState(540, 360)).toBe('over_capacity')
    expect(resolvePlanningCapacityState(360, 360)).toBe('normal')
  })
})
