import { describe, expect, it } from 'vitest'
import {
  buildPlanningSyncDifferenceComparison,
  countPlanningSyncDivergences,
  formatPlanningSyncTooltip,
  hasApplyableConveyorPlanSyncDifferences,
  isPlanningItemSyncDiverged,
  listPlanningSyncIssues,
} from '../../domain/operational-planning/planningSyncIssues'
import type { OperationalPlanningPlanItem } from '../../domain/operational-planning/operational-planning.types'

function planItem(
  partial: Partial<OperationalPlanningPlanItem> & Pick<OperationalPlanningPlanItem, 'id'>,
): OperationalPlanningPlanItem {
  return {
    conveyorId: 'cv-1',
    conveyorTitle: 'Esteira A',
    activityNodeId: 'act-1',
    taskTitle: 'Tarefa',
    sectorTitle: 'Setor',
    activityTitle: 'Atividade',
    assignedCollaboratorId: null,
    assignedCollaboratorName: null,
    plannedDate: '2026-06-02',
    plannedOrder: 0,
    plannedMinutes: 60,
    status: 'PLANNED',
    notes: null,
    realizedMinutes: 0,
    activityOperationalStatus: null,
    ...partial,
  }
}

describe('planningSyncIssues', () => {
  it('detects diverged items', () => {
    const diverged = planItem({
      id: '1',
      syncStatus: 'DIVERGED',
      syncDifferences: [
        {
          code: 'PLANNED_DATE_CHANGED',
          message: 'Data difere',
          planValue: '2026-06-01',
          factoryValue: '2026-06-02',
        },
      ],
    })
    expect(isPlanningItemSyncDiverged(diverged)).toBe(true)
    expect(countPlanningSyncDivergences([diverged, planItem({ id: '2', syncStatus: 'SYNCED' })])).toBe(
      1,
    )
  })

  it('lists only diverged items with differences', () => {
    const diverged = planItem({
      id: '1',
      syncStatus: 'DIVERGED',
      syncDifferences: [
        {
          code: 'ASSIGNEE_CHANGED',
          message: 'Responsável difere',
          planValue: 'a',
          factoryValue: 'b',
        },
      ],
    })
    expect(listPlanningSyncIssues([diverged, planItem({ id: '2' })])).toHaveLength(1)
  })

  it('detects applyable field divergences', () => {
    expect(
      hasApplyableConveyorPlanSyncDifferences([
        {
          code: 'PLANNED_DATE_CHANGED',
          message: 'Data difere',
          planValue: '2026-06-01',
          factoryValue: '2026-06-02',
        },
      ]),
    ).toBe(true)
    expect(
      hasApplyableConveyorPlanSyncDifferences([
        {
          code: 'PLAN_ITEM_CANCELLED',
          message: 'Cancelado',
          planValue: 'CANCELLED',
          factoryValue: 'PLANNED',
        },
      ]),
    ).toBe(false)
  })

  it('builds before/after comparison labels', () => {
    const cmp = buildPlanningSyncDifferenceComparison({
      code: 'PLANNED_MINUTES_CHANGED',
      message: 'Minutos diferem',
      planValue: '60',
      factoryValue: '90',
    })
    expect(cmp.fieldLabel).toBe('Minutos')
    expect(cmp.planDisplay).toBe('60 min')
    expect(cmp.factoryDisplay).toBe('90 min')
  })

  it('formats tooltip from difference messages', () => {
    const text = formatPlanningSyncTooltip([
      {
        code: 'PLANNED_MINUTES_CHANGED',
        message: 'Minutos planejados diferem',
        planValue: '60',
        factoryValue: '90',
      },
    ])
    expect(text).toContain('Minutos planejados diferem')
  })
})
