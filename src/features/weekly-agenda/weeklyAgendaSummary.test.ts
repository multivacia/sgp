import { describe, expect, it } from 'vitest'
import { buildWeeklyAgendaSummaryStrip } from './weeklyAgendaSummary'

describe('buildWeeklyAgendaSummaryStrip', () => {
  it('returns zeros when week payload is null', () => {
    expect(buildWeeklyAgendaSummaryStrip(null)).toEqual({
      plannedMinutes: 0,
      realizedMinutes: 0,
      collaboratorsCount: 0,
      attentionCount: 0,
      syncDivergenceCount: 0,
      outsidePlanEntriesCount: 0,
    })
  })

  it('aggregates planned, realized, team and attention counts', () => {
    const model = buildWeeklyAgendaSummaryStrip({
      hasPlan: true,
      revision: {
        hasActivePublished: false,
        activePublishedPlanId: null,
        activePublishedAt: null,
        hasUnpublishedRevision: false,
      },
      week: {
        weekStartDate: '2026-02-17',
        weekEndDate: '2026-02-21',
        weekdayDates: ['2026-02-17', '2026-02-18', '2026-02-19', '2026-02-20', '2026-02-21'],
      },
      plan: {
        id: 'p1',
        weekStartDate: '2026-02-17',
        weekEndDate: '2026-02-21',
        status: 'DRAFT',
        publishedAt: null,
        createdAt: '2026-02-17T12:00:00.000Z',
        updatedAt: '2026-02-17T12:00:00.000Z',
        items: [
          {
            id: 'i1',
            conveyorId: 'c1',
            conveyorTitle: 'Esteira A',
            activityNodeId: 'a1',
            taskTitle: 'Tarefa',
            sectorTitle: 'Setor',
            activityTitle: 'Atividade 1',
            assignedCollaboratorId: 'col1',
            assignedCollaboratorName: 'Ana',
            plannedDate: '2026-02-17',
            plannedOrder: 0,
            plannedMinutes: 60,
            status: 'ACTIVE',
            notes: null,
            realizedMinutes: 30,
            activityOperationalStatus: 'IN_PROGRESS',
            syncStatus: 'DIVERGED',
            syncDifferences: [{ code: 'PLANNED_DATE_CHANGED', message: 'x', planValue: 'a', factoryValue: 'b' }],
          },
          {
            id: 'i2',
            conveyorId: 'c2',
            conveyorTitle: 'Esteira B',
            activityNodeId: 'a2',
            taskTitle: 'Tarefa',
            sectorTitle: 'Setor',
            activityTitle: 'Atividade 2',
            assignedCollaboratorId: 'col2',
            assignedCollaboratorName: 'João',
            plannedDate: '2026-02-18',
            plannedOrder: 0,
            plannedMinutes: 45,
            status: 'ACTIVE',
            notes: null,
            realizedMinutes: 0,
            activityOperationalStatus: 'PENDING',
            syncStatus: 'SYNCED',
          },
        ],
      },
      summary: { plannedMinutes: 105, plannedItems: 2, collaboratorsCount: 2 },
      capacityByCollaboratorDay: [],
      capacity: {
        summary: {
          collaboratorsCount: 2,
          totalPlannedMinutes: 105,
          totalOverloadMinutes: 0,
          byStatus: {
            SEM_CAPACIDADE_CADASTRADA: 0,
            DISPONIVEL: 2,
            PROXIMO_DO_LIMITE: 0,
            ACIMA_DA_CAPACIDADE: 0,
            SOBRECARGA_CRITICA: 0,
          },
        },
        collaborators: [],
      },
      executionOutsidePlanSummary: {
        totalMinutes: 20,
        entriesCount: 3,
        activitiesCount: 2,
        conveyorsCount: 1,
      },
      executionOutsidePlanEntries: [],
    })

    expect(model.plannedMinutes).toBe(105)
    expect(model.realizedMinutes).toBe(30)
    expect(model.collaboratorsCount).toBe(2)
    expect(model.syncDivergenceCount).toBe(1)
    expect(model.outsidePlanEntriesCount).toBe(3)
    expect(model.attentionCount).toBe(4)
  })
})
