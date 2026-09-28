/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { KioskActivityCard } from './KioskActivityCard'
import type { ProductionWorkQueueItem } from '../../domain/production/production.types'
import {
  formatIsoDateBr,
  operationalDateOf,
  operationalTodayIso,
  shiftIsoDate,
} from '../../domain/operational/workDate'

const { createProductionTimeEntryMock } = vi.hoisted(() => ({
  createProductionTimeEntryMock: vi.fn(),
}))

vi.mock('../../services/production/productionApiService', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../services/production/productionApiService')>()
  return { ...actual, createProductionTimeEntry: createProductionTimeEntryMock }
})

const item: ProductionWorkQueueItem = {
  workPlanItemId: 'wpi-1',
  conveyorId: 'conv-1',
  conveyorTitle: 'OS-1000',
  activityNodeId: 'step-1',
  activityTitle: 'Costurar banco',
  taskTitle: 'Estofamento',
  sectorTitle: 'Costura',
  plannedDate: '2026-09-07',
  plannedMinutes: 600,
  realizedMinutes: 0,
  pendingMinutes: 600,
  activityOperationalStatus: 'PENDING',
  isActivityCompleted: false,
  isOverdue: false,
  isOutOfSequence: false,
  isNextRecommended: true,
  hasPreviousPendingStep: false,
  previousOpenCount: 0,
  previousOpenActivities: [],
  allPreviousOpenActivities: [],
  awaitingPreviousActivities: [],
  hasPreviousOpenActivitiesFromOtherCollaborators: false,
  previousOpenActivitiesFromOtherCollaborators: [],
  previousOpenActivitiesWarningMessage: null,
  group: 'today',
  canTrackTime: true,
  canCompleteStep: true,
  requiresOutOfSequenceJustification: false,
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('KioskActivityCard — data de realização', () => {
  it('padrão é hoje: envia o instante atual (dia de hoje em SP)', async () => {
    createProductionTimeEntryMock.mockResolvedValue({ id: 'te-1', minutes: 15, entryOrigin: 'ASSIGNED' })
    render(<KioskActivityCard item={item} onSuccess={() => {}} />)
    const dateInput = screen.getByLabelText('Data em que o trabalho foi realizado') as HTMLInputElement
    expect(dateInput.value).toBe(operationalTodayIso())
    expect(dateInput.max).toBe(operationalTodayIso())

    fireEvent.click(screen.getByRole('button', { name: '15 min' }))
    fireEvent.click(screen.getByRole('button', { name: 'Registrar apontamento' }))

    await waitFor(() => expect(createProductionTimeEntryMock).toHaveBeenCalledTimes(1))
    const sent = createProductionTimeEntryMock.mock.calls[0]![0] as { entryAt: string }
    expect(operationalDateOf(new Date(sent.entryAt))).toBe(operationalTodayIso())
  })

  it('"Ontem" envia meio-dia de SP de ontem e confirma a data no sucesso', async () => {
    createProductionTimeEntryMock.mockResolvedValue({ id: 'te-2', minutes: 30, entryOrigin: 'ASSIGNED' })
    render(<KioskActivityCard item={item} onSuccess={() => {}} />)
    const yesterday = shiftIsoDate(operationalTodayIso(), -1)

    fireEvent.click(screen.getByRole('button', { name: 'Ontem' }))
    fireEvent.click(screen.getByRole('button', { name: '30 min' }))
    fireEvent.click(screen.getByRole('button', { name: 'Registrar apontamento' }))

    await waitFor(() => expect(createProductionTimeEntryMock).toHaveBeenCalledTimes(1))
    expect(createProductionTimeEntryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        conveyorId: 'conv-1',
        stepNodeId: 'step-1',
        minutes: 30,
        entryAt: `${yesterday}T12:00:00-03:00`,
      }),
    )
    expect(
      await screen.findByText(`Data de realização: Ontem · ${formatIsoDateBr(yesterday)}`),
    ).toBeTruthy()
  })

  it('data futura bloqueia o registro na interface', () => {
    render(<KioskActivityCard item={item} onSuccess={() => {}} />)
    const tomorrow = shiftIsoDate(operationalTodayIso(), 1)
    fireEvent.change(screen.getByLabelText('Data em que o trabalho foi realizado'), {
      target: { value: tomorrow },
    })
    fireEvent.click(screen.getByRole('button', { name: '15 min' }))
    expect(screen.getByText('A data de realização não pode ser futura.')).toBeTruthy()
    const btn = screen.getByRole('button', { name: 'Registrar apontamento' }) as HTMLButtonElement
    expect(btn.disabled).toBe(true)
  })
})
