import { describe, expect, it, vi } from 'vitest'
import type { TimeEntryCandidateItem } from '../../domain/my-activities/my-activities.types'
import {
  canCompletePlanningStep,
  canPointTimeOnPlanningStep,
  canReopenPlanningStep,
  findTimeEntryCandidateForPlanningCard,
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
    expect(canPointTimeOnPlanningStep('ABORTED')).toBe(false)
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

describe('findTimeEntryCandidateForPlanningCard', () => {
  const item = { conveyorId: 'cv-1', activityNodeId: 'step-77', activityTitle: 'Revestir Painel' }
  const cand = (id: string, conveyorId = 'cv-1') =>
    ({ conveyorId, stepNodeId: id }) as unknown as TimeEntryCandidateItem

  it('percorre páginas pelo cursor até encontrar a atividade do cartão (página posterior)', async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ items: [cand('step-1')], nextCursor: 'c1' })
      .mockResolvedValueOnce({ items: [cand('step-77')], nextCursor: 'c2' })
    const found = await findTimeEntryCandidateForPlanningCard(item, fetchPage)
    expect(found?.stepNodeId).toBe('step-77')
    expect(fetchPage.mock.calls.map((c) => c[0])).toEqual([
      { q: 'Revestir Painel', cursor: null },
      { q: 'Revestir Painel', cursor: 'c1' },
    ])
  })

  it('devolve null ao fim da lista ou no limite de páginas (chamador usa o fallback)', async () => {
    const end = vi.fn().mockResolvedValue({ items: [cand('step-77', 'outra')], nextCursor: null })
    expect(await findTimeEntryCandidateForPlanningCard(item, end)).toBeNull()
    expect(end).toHaveBeenCalledTimes(1)

    const endless = vi.fn().mockResolvedValue({ items: [], nextCursor: 'x' })
    expect(await findTimeEntryCandidateForPlanningCard(item, endless, 3)).toBeNull()
    expect(endless).toHaveBeenCalledTimes(3)
  })

  it('não usa como pesquisa título com "&" (seria interpretado como OS & atividade)', async () => {
    const fetchPage = vi.fn().mockResolvedValue({ items: [], nextCursor: null })
    await findTimeEntryCandidateForPlanningCard({ ...item, activityTitle: 'Corte & costura' }, fetchPage)
    expect(fetchPage.mock.calls[0][0]).toEqual({ q: undefined, cursor: null })
  })
})
