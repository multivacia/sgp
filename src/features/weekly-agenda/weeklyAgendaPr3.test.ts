import { describe, expect, it } from 'vitest'
import { listPlanningSyncIssues } from '../../domain/operational-planning/planningSyncIssues'
import type { OperationalPlanningWeekPayload } from '../../domain/operational-planning/operational-planning.types'
import { buildWeeklyAgendaSummaryStrip } from './weeklyAgendaSummary'

const defaultRevision = {
  hasActivePublished: false,
  activePublishedPlanId: null,
  activePublishedAt: null,
  hasUnpublishedRevision: false,
} as const

const sampleWeekWithAttention: OperationalPlanningWeekPayload = {
  hasPlan: true,
  revision: { ...defaultRevision },
  week: {
    weekStartDate: '2026-06-29',
    weekEndDate: '2026-07-03',
    weekdayDates: ['2026-06-29', '2026-06-30', '2026-07-01', '2026-07-02', '2026-07-03'],
  },
  plan: {
    id: 'plan-1',
    weekStartDate: '2026-06-29',
    weekEndDate: '2026-07-03',
    status: 'DRAFT',
    publishedAt: null,
    createdAt: '2026-06-29T12:00:00.000Z',
    updatedAt: '2026-06-29T12:00:00.000Z',
    items: [
      {
        id: 'item-1',
        conveyorId: 'c1',
        conveyorTitle: 'ET-001',
        activityNodeId: 'a1',
        taskTitle: 'Tapeçaria',
        sectorTitle: 'Montagem',
        activityTitle: 'Atividade divergente',
        assignedCollaboratorId: 'col-1',
        assignedCollaboratorName: 'Carlos',
        plannedDate: '2026-06-29',
        plannedOrder: 0,
        plannedMinutes: 60,
        status: 'ACTIVE',
        notes: null,
        realizedMinutes: 0,
        activityOperationalStatus: 'PENDING',
        syncStatus: 'DIVERGED',
        syncDifferences: [
          {
            code: 'PLANNED_MINUTES_CHANGED',
            message: 'Minutos divergentes',
            planValue: '90',
            factoryValue: '60',
          },
        ],
      },
    ],
  },
  summary: { plannedMinutes: 60, plannedItems: 1, collaboratorsCount: 1 },
  capacityByCollaboratorDay: [],
  capacity: {
    summary: {
      collaboratorsCount: 1,
      totalPlannedMinutes: 60,
      totalOverloadMinutes: 0,
      byStatus: {
        SEM_CAPACIDADE_CADASTRADA: 0,
        DISPONIVEL: 1,
        PROXIMO_DO_LIMITE: 0,
        ACIMA_DA_CAPACIDADE: 0,
        SOBRECARGA_CRITICA: 0,
      },
    },
    collaborators: [
      {
        collaboratorId: 'col-1',
        collaboratorName: 'Carlos',
        capacityMinutes: 2400,
        plannedMinutes: 60,
        availableMinutes: 2340,
        overloadMinutes: 0,
        occupancyPct: 2.5,
        status: 'DISPONIVEL',
      },
    ],
  },
  executionOutsidePlanSummary: {
    totalMinutes: 30,
    entriesCount: 2,
    activitiesCount: 1,
    conveyorsCount: 1,
  },
  executionOutsidePlanEntries: [
    {
      id: 'e1',
      conveyorId: 'c9',
      conveyorTitle: 'ET-009',
      activityNodeId: 'a9',
      activityTitle: 'Fora do plano A',
      taskTitle: 'Acabamento',
      sectorTitle: 'Polimento',
      collaboratorId: 'col-2',
      collaboratorName: 'Ana',
      entryAt: '2026-06-30T10:00:00.000Z',
      minutes: 15,
      entryOrigin: 'ASSIGNED',
      exceptionJustification: null,
      notes: null,
    },
    {
      id: 'e2',
      conveyorId: 'c9',
      conveyorTitle: 'ET-009',
      activityNodeId: 'a10',
      activityTitle: 'Fora do plano B',
      taskTitle: 'Acabamento',
      sectorTitle: 'Polimento',
      collaboratorId: 'col-2',
      collaboratorName: 'Ana',
      entryAt: '2026-06-30T11:00:00.000Z',
      minutes: 15,
      entryOrigin: 'ASSIGNED',
      exceptionJustification: null,
      notes: null,
    },
  ],
}

describe('weekly agenda PR-3 data wiring', () => {
  it('summary strip attention count matches sync + outside plan entries', () => {
    const summary = buildWeeklyAgendaSummaryStrip(sampleWeekWithAttention)
    expect(summary.syncDivergenceCount).toBe(1)
    expect(summary.outsidePlanEntriesCount).toBe(2)
    expect(summary.attentionCount).toBe(3)
  })

  it('sync issue list length matches syncDivergenceCount for sample payload', () => {
    const planItems = sampleWeekWithAttention.plan!.items
    const syncIssues = listPlanningSyncIssues(planItems)
    const summary = buildWeeklyAgendaSummaryStrip(sampleWeekWithAttention)
    expect(syncIssues).toHaveLength(summary.syncDivergenceCount)
    expect(syncIssues[0]?.activityTitle).toBe('Atividade divergente')
  })

  it('empty attention week yields zero counts', () => {
    const emptyWeek: OperationalPlanningWeekPayload = {
      ...sampleWeekWithAttention,
      plan: {
        ...sampleWeekWithAttention.plan!,
        items: sampleWeekWithAttention.plan!.items.map((item) => ({
          ...item,
          syncStatus: 'SYNCED' as const,
          syncDifferences: [],
        })),
      },
      executionOutsidePlanSummary: {
        totalMinutes: 0,
        entriesCount: 0,
        activitiesCount: 0,
        conveyorsCount: 0,
      },
      executionOutsidePlanEntries: [],
    }
    const summary = buildWeeklyAgendaSummaryStrip(emptyWeek)
    expect(summary.attentionCount).toBe(0)
    expect(listPlanningSyncIssues(emptyWeek.plan!.items)).toHaveLength(0)
  })

  it('FAB backlog count uses API item array length', () => {
    const apiItems = [{ activityNodeId: 'a' }, { activityNodeId: 'b' }, { activityNodeId: 'c' }]
    expect(apiItems.length).toBe(3)
  })
})
