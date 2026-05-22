import { describe, expect, it } from 'vitest'
import {
  canCompletePlanningStep,
  canPointTimeOnPlanningStep,
  canReopenPlanningStep,
  mergePlanningExecutionFromServerItems,
  planningApontamentoCandidate,
} from './planningCardActions'

describe('planningCardActions', () => {
  it('canPointTimeOnPlanningStep', () => {
    expect(canPointTimeOnPlanningStep('PENDING')).toBe(true)
    expect(canPointTimeOnPlanningStep('IN_PROGRESS')).toBe(true)
    expect(canPointTimeOnPlanningStep('REOPENED')).toBe(true)
    expect(canPointTimeOnPlanningStep('BLOCKED')).toBe(true)
    expect(canPointTimeOnPlanningStep('COMPLETED')).toBe(false)
    expect(canPointTimeOnPlanningStep(null)).toBe(true)
  })

  it('canCompletePlanningStep', () => {
    expect(canCompletePlanningStep('PENDING', true)).toBe(true)
    expect(canCompletePlanningStep('IN_PROGRESS', true)).toBe(true)
    expect(canCompletePlanningStep('REOPENED', true)).toBe(true)
    expect(canCompletePlanningStep('BLOCKED', true)).toBe(true)
    expect(canCompletePlanningStep('COMPLETED', true)).toBe(false)
    expect(canCompletePlanningStep('PENDING', false)).toBe(false)
  })

  it('canReopenPlanningStep', () => {
    expect(canReopenPlanningStep('COMPLETED', true)).toBe(true)
    expect(canReopenPlanningStep('PENDING', true)).toBe(false)
    expect(canReopenPlanningStep('REOPENED', true)).toBe(false)
    expect(canReopenPlanningStep('COMPLETED', false)).toBe(false)
  })

  it('planningApontamentoCandidate maps step ids', () => {
    const c = planningApontamentoCandidate({
      conveyorId: 'c1',
      activityNodeId: 's1',
      conveyorTitle: 'Esteira A',
      activityTitle: 'Atividade 1',
      taskTitle: 'Tarefa',
      sectorTitle: 'Setor',
      plannedMinutes: 60,
      realizedMinutes: 15,
    })
    expect(c.conveyorId).toBe('c1')
    expect(c.stepNodeId).toBe('s1')
    expect(c.pendingMinutes).toBe(45)
  })

  it('mergePlanningExecutionFromServerItems updates execution fields only', () => {
    const merged = mergePlanningExecutionFromServerItems(
      [
        {
          activityNodeId: 'a1',
          plannedMinutes: 30,
          realizedMinutes: 0,
          activityOperationalStatus: 'PENDING',
        },
      ],
      [
        {
          id: '1',
          conveyorId: 'c',
          conveyorTitle: 'E',
          activityNodeId: 'a1',
          taskTitle: 't',
          sectorTitle: 's',
          activityTitle: 'A',
          assignedCollaboratorId: null,
          assignedCollaboratorName: null,
          plannedDate: '2026-05-11',
          plannedOrder: 0,
          plannedMinutes: 30,
          status: 'PLANNED',
          notes: null,
          realizedMinutes: 20,
          activityOperationalStatus: 'IN_PROGRESS',
        },
      ],
    )
    expect(merged[0]?.realizedMinutes).toBe(20)
    expect(merged[0]?.activityOperationalStatus).toBe('IN_PROGRESS')
    expect(merged[0]?.plannedMinutes).toBe(30)
  })
})
