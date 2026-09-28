/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ProductionTimeEntryDialog } from './ProductionTimeEntryDialog'
import type { ProductionWorkQueueItem } from '../../domain/production/production.types'
import {
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

const item = {
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
  requiresOutOfSequenceJustification: false,
  hasPreviousPendingStep: false,
  isOutOfSequence: false,
  canTrackTime: true,
  canCompleteStep: true,
} as unknown as ProductionWorkQueueItem

const DATE_LABEL = 'Data em que o trabalho foi realizado'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('ProductionTimeEntryDialog — data de realização', () => {
  it('padrão hoje: envia o instante atual', async () => {
    createProductionTimeEntryMock.mockResolvedValue({ id: 'te-1', minutes: 40, entryOrigin: 'ASSIGNED' })
    const onSuccess = vi.fn()
    render(<ProductionTimeEntryDialog item={item} onClose={() => {}} onSuccess={onSuccess} />)
    const date = screen.getByLabelText(DATE_LABEL) as HTMLInputElement
    expect(date.value).toBe(operationalTodayIso())
    expect(date.max).toBe(operationalTodayIso())
    fireEvent.change(screen.getByLabelText(/Tempo apontado/), { target: { value: '40' } })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar apontamento' }))
    await waitFor(() => expect(createProductionTimeEntryMock).toHaveBeenCalledTimes(1))
    const sent = createProductionTimeEntryMock.mock.calls[0]![0] as { entryAt: string }
    expect(operationalDateOf(new Date(sent.entryAt))).toBe(operationalTodayIso())
    expect(onSuccess).toHaveBeenCalled()
  })

  it('data passada escolhida é enviada em entryAt (meio-dia de SP)', async () => {
    createProductionTimeEntryMock.mockResolvedValue({ id: 'te-2', minutes: 40, entryOrigin: 'ASSIGNED' })
    render(<ProductionTimeEntryDialog item={item} onClose={() => {}} onSuccess={() => {}} />)
    const past = shiftIsoDate(operationalTodayIso(), -5)
    fireEvent.change(screen.getByLabelText(DATE_LABEL), { target: { value: past } })
    fireEvent.change(screen.getByLabelText(/Tempo apontado/), { target: { value: '40' } })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar apontamento' }))
    await waitFor(() => expect(createProductionTimeEntryMock).toHaveBeenCalledTimes(1))
    expect(createProductionTimeEntryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        conveyorId: 'conv-1',
        stepNodeId: 'step-1',
        minutes: 40,
        executedQuantity: 1,
        entryAt: `${past}T12:00:00-03:00`,
      }),
    )
  })

  it('data futura bloqueia o envio', () => {
    render(<ProductionTimeEntryDialog item={item} onClose={() => {}} onSuccess={() => {}} />)
    fireEvent.change(screen.getByLabelText(DATE_LABEL), {
      target: { value: shiftIsoDate(operationalTodayIso(), 1) },
    })
    fireEvent.change(screen.getByLabelText(/Tempo apontado/), { target: { value: '40' } })
    expect(screen.getByText('A data de realização não pode ser futura.')).toBeTruthy()
    const btn = screen.getByRole('button', { name: 'Registrar apontamento' }) as HTMLButtonElement
    expect(btn.disabled).toBe(true)
    fireEvent.submit(btn.closest('form')!)
    expect(createProductionTimeEntryMock).not.toHaveBeenCalled()
  })
})
