/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { KioskOutraAtividadeFlow } from './KioskOutraAtividadeFlow'
import type { TimeEntryCandidateItem } from '../../domain/my-activities/my-activities.types'
import type { ProductionTimeEntryCandidatesResult } from '../../services/production/productionApiService'

const mocks = vi.hoisted(() => ({ listProductionTimeEntryCandidates: vi.fn() }))

vi.mock('../../services/production/productionApiService', () => ({
  listProductionTimeEntryCandidates: mocks.listProductionTimeEntryCandidates,
  createProductionUnassignedTimeEntry: vi.fn(),
  PRODUCTION_TIME_ENTRY_CANDIDATES_ERROR_MESSAGE: 'Não foi possível buscar atividades.',
  PRODUCTION_TIME_ENTRY_ERROR_MESSAGE: 'Não foi possível registrar.',
}))

function candidate(n: number): TimeEntryCandidateItem {
  return {
    conveyorId: 'os-7467',
    conveyorCode: '7467',
    conveyorName: 'OS 7467',
    clientName: null,
    vehicleLabel: null,
    plate: null,
    stepNodeId: `step-${n}`,
    stepName: `Atividade ${n}`,
    activityTitle: `Atividade ${n}`,
    taskTitle: 'Tarefa',
    areaName: 'Setor',
    sectorTitle: 'Setor',
    roleInStep: 'support',
    assignmentType: 'COLLABORATOR',
    plannedMinutes: 30,
    realizedMinutes: 0,
    pendingMinutes: 30,
    isAssignedToMe: false,
    requiresJustification: true,
    isOutOfSequence: false,
    hasPreviousPendingStep: false,
    requiresOutOfSequenceJustification: false,
    canPointTime: true,
    previousOpenCount: 0,
    previousOpenActivities: [],
    awaitingPreviousActivities: [],
    canCompleteStep: false,
  } as TimeEntryCandidateItem
}

function result(from: number, count: number, nextCursor: string | null): ProductionTimeEntryCandidatesResult {
  return {
    items: Array.from({ length: count }, (_, i) => candidate(from + i)),
    nextCursor,
    collaboratorId: 'collab-1',
    unavailableReason: null,
  }
}

const collaborator = { id: 'collab-1', fullName: 'Tati' } as never

describe('KioskOutraAtividadeFlow — "Carregar mais"', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mocks.listProductionTimeEntryCandidates.mockReset()
  })
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  async function typeAndSettle(value: string) {
    fireEvent.change(screen.getByLabelText('Buscar atividade'), { target: { value } })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(350)
    })
  }

  it('busca com páginas de 20 e acrescenta a próxima página no fim', async () => {
    mocks.listProductionTimeEntryCandidates
      .mockResolvedValueOnce(result(1, 20, 'k1'))
      .mockResolvedValueOnce(result(21, 5, null))
    render(<KioskOutraAtividadeFlow collaborator={collaborator} onClose={() => {}} onSuccess={() => {}} />)

    await typeAndSettle('7467')
    expect(screen.getByText('Atividade 20')).toBeTruthy()
    expect(mocks.listProductionTimeEntryCandidates).toHaveBeenLastCalledWith({
      q: '7467',
      includeUnassigned: true,
      limit: 20,
      cursor: null,
    })

    const footer = screen.getByTestId('kiosk-outra-atividade-load-more')
    await act(async () => {
      fireEvent.click(within(footer).getByRole('button', { name: 'Carregar mais' }))
    })
    expect(screen.getByText('Atividade 25')).toBeTruthy()
    expect(screen.getAllByText('Atividade 1')).toHaveLength(1)
    expect(mocks.listProductionTimeEntryCandidates.mock.calls[1][0]).toMatchObject({ cursor: 'k1' })
    expect(screen.queryByTestId('kiosk-outra-atividade-load-more')).toBeNull()
  })

  it('resposta antiga não sobrescreve pesquisa mais recente', async () => {
    let resolveOld!: (v: ProductionTimeEntryCandidatesResult) => void
    mocks.listProductionTimeEntryCandidates
      .mockReturnValueOnce(new Promise((res) => (resolveOld = res)))
      .mockResolvedValueOnce(result(500, 1, null))
    render(<KioskOutraAtividadeFlow collaborator={collaborator} onClose={() => {}} onSuccess={() => {}} />)

    await typeAndSettle('7467')
    await typeAndSettle('7467 & revestir')
    expect(screen.getByText('Atividade 500')).toBeTruthy()
    await act(async () => {
      resolveOld(result(1, 20, 'k1'))
    })
    expect(screen.queryByText('Atividade 1')).toBeNull()
    expect(screen.getByText('Atividade 500')).toBeTruthy()
  })
})
