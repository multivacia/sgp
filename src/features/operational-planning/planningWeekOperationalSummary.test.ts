import { describe, expect, it } from 'vitest'
import {
  buildPlanningWeekOperationalSummary,
  emptyPlanningWeekOperationalSummary,
  type PlanningWeekOperationalSummaryItem,
} from './planningWeekOperationalSummary'

function item(
  partial: Partial<PlanningWeekOperationalSummaryItem> &
    Pick<PlanningWeekOperationalSummaryItem, 'plannedDate'>,
): PlanningWeekOperationalSummaryItem {
  return {
    plannedMinutes: 60,
    realizedMinutes: 0,
    activityOperationalStatus: 'PENDING',
    assignedCollaboratorId: 'c1',
    ...partial,
  }
}

describe('buildPlanningWeekOperationalSummary', () => {
  it('lista vazia retorna zeros', () => {
    expect(buildPlanningWeekOperationalSummary([])).toEqual(
      emptyPlanningWeekOperationalSummary(),
    )
  })

  it('soma plannedMinutes dos itens ativos', () => {
    const summary = buildPlanningWeekOperationalSummary([
      item({ plannedDate: '2026-05-18', plannedMinutes: 90 }),
      item({ plannedDate: '2026-05-19', plannedMinutes: 30 }),
    ])
    expect(summary.totalPlannedMinutes).toBe(120)
    expect(summary.totalItems).toBe(2)
  })

  it('soma realizedMinutes tratando null/undefined como 0', () => {
    const summary = buildPlanningWeekOperationalSummary([
      item({ plannedDate: '2026-05-18', realizedMinutes: 45 }),
      item({ plannedDate: '2026-05-19', realizedMinutes: null }),
      item({ plannedDate: '2026-05-20', realizedMinutes: undefined }),
    ])
    expect(summary.totalRealizedMinutes).toBe(45)
  })

  it('COMPLETED conta como concluída', () => {
    const summary = buildPlanningWeekOperationalSummary([
      item({
        plannedDate: '2026-05-18',
        activityOperationalStatus: 'COMPLETED',
        realizedMinutes: 10,
      }),
    ])
    expect(summary.completedItems).toBe(1)
    expect(summary.inProgressItems).toBe(0)
    expect(summary.withoutTimeEntryItems).toBe(0)
  })

  it('realizado > 0 e não completed conta como em andamento', () => {
    const summary = buildPlanningWeekOperationalSummary([
      item({
        plannedDate: '2026-05-18',
        plannedMinutes: 120,
        realizedMinutes: 45,
        activityOperationalStatus: 'IN_PROGRESS',
      }),
    ])
    expect(summary.inProgressItems).toBe(1)
    expect(summary.completedItems).toBe(0)
  })

  it('sem apontamento (realizado 0 e não completed)', () => {
    const summary = buildPlanningWeekOperationalSummary([
      item({
        plannedDate: '2026-05-18',
        realizedMinutes: 0,
        activityOperationalStatus: 'PENDING',
      }),
    ])
    expect(summary.withoutTimeEntryItems).toBe(1)
    expect(summary.notStartedItems).toBe(1)
  })

  it('reached_planned sem completed', () => {
    const summary = buildPlanningWeekOperationalSummary([
      item({
        plannedDate: '2026-05-18',
        plannedMinutes: 60,
        realizedMinutes: 60,
        activityOperationalStatus: 'IN_PROGRESS',
      }),
    ])
    expect(summary.reachedPlannedItems).toBe(1)
    expect(summary.completedItems).toBe(0)
    expect(summary.attentionItems).toBe(1)
  })

  it('over_planned', () => {
    const summary = buildPlanningWeekOperationalSummary([
      item({
        plannedDate: '2026-05-18',
        plannedMinutes: 60,
        realizedMinutes: 90,
        activityOperationalStatus: 'IN_PROGRESS',
      }),
    ])
    expect(summary.overPlannedItems).toBe(1)
    expect(summary.attentionItems).toBe(1)
  })

  it('BLOCKED conta como atenção', () => {
    const summary = buildPlanningWeekOperationalSummary([
      item({
        plannedDate: '2026-05-18',
        activityOperationalStatus: 'BLOCKED',
        realizedMinutes: 0,
      }),
    ])
    expect(summary.attentionItems).toBe(1)
  })

  it('sem responsável conta como atenção', () => {
    const summary = buildPlanningWeekOperationalSummary([
      item({
        plannedDate: '2026-05-18',
        assignedCollaboratorId: '',
        realizedMinutes: 0,
      }),
    ])
    expect(summary.attentionItems).toBe(1)
  })

  it('plannedMinutes <= 0 conta como atenção', () => {
    const summary = buildPlanningWeekOperationalSummary([
      item({
        plannedDate: '2026-05-18',
        plannedMinutes: 0,
        realizedMinutes: 0,
      }),
    ])
    expect(summary.attentionItems).toBe(1)
  })

  it('conta células com capacidade excedida', () => {
    const summary = buildPlanningWeekOperationalSummary(
      [
        item({
          plannedDate: '2026-05-18',
          assignedCollaboratorId: 'c1',
          plannedMinutes: 120,
        }),
        item({
          plannedDate: '2026-05-18',
          assignedCollaboratorId: 'c1',
          plannedMinutes: 60,
        }),
      ],
      {
        capacityByCollaboratorDay: [
          { collaboratorId: 'c1', date: '2026-05-18', capacityMinutes: 90 },
        ],
      },
    )
    expect(summary.overCapacityCells).toBe(1)
    expect(summary.attentionItems).toBe(2)
  })

  it('ignora itens removidos ou cancelados', () => {
    const summary = buildPlanningWeekOperationalSummary([
      item({ plannedDate: '2026-05-18', removed: true }),
      item({ plannedDate: '2026-05-19', cancelled: true }),
      item({ plannedDate: '2026-05-20' }),
    ])
    expect(summary.totalItems).toBe(1)
  })

  it('não muta o array original', () => {
    const items = [item({ plannedDate: '2026-05-18' })]
    const copy = [...items]
    buildPlanningWeekOperationalSummary(items)
    expect(items).toEqual(copy)
  })
})
