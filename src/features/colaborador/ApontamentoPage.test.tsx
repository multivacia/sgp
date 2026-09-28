/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ApontamentoPage } from './ApontamentoPage'
import type { MyActivityItem } from '../../domain/my-activities/my-activities.types'
import {
  operationalDateOf,
  operationalTodayIso,
  shiftIsoDate,
} from '../../domain/operational/workDate'

const mocks = vi.hoisted(() => ({
  listMyActivities: vi.fn(),
  postConveyorStepTimeEntry: vi.fn(),
}))

vi.mock('../../services/my-activities/myActivitiesApiService', () => ({
  listMyActivities: mocks.listMyActivities,
}))
vi.mock('../../services/conveyors/conveyorStepAssignmentsApiService', () => ({
  postConveyorStepTimeEntry: mocks.postConveyorStepTimeEntry,
}))
const stable = vi.hoisted(() => ({
  auth: { user: { id: 'u-1', collaboratorId: 'collab-1' }, ready: true },
  errorSurface: { presentBlocking: () => {} },
}))
vi.mock('../../lib/use-auth', () => ({ useAuth: () => stable.auth }))
vi.mock('../../lib/errors/SgpErrorPresentation', () => ({
  useSgpErrorSurface: () => stable.errorSurface,
}))

const activity = {
  conveyorId: 'conv-1',
  stepNodeId: 'step-1',
  stepName: 'Costurar banco',
  operationalBucket: 'em_execucao',
  optionName: 'Opção A',
  areaName: 'Costura',
  conveyorName: 'OS-1000',
  conveyorCode: null,
  roleInStep: 'primary',
  estimatedDeadline: null,
  plannedMinutes: 60,
  plannedQuantity: 1,
  realizedMinutes: 0,
} as unknown as MyActivityItem

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/app/apontamento/step-1?conveyorId=conv-1']}>
      <Routes>
        <Route path="/app/apontamento/:taskId" element={<ApontamentoPage />} />
        <Route path="/app/minha-fila" element={<p>fila</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('ApontamentoPage — data de realização', () => {
  it('padrão hoje envia o instante atual', async () => {
    mocks.listMyActivities.mockResolvedValue([activity])
    mocks.postConveyorStepTimeEntry.mockResolvedValue({ id: 'te-1' })
    renderPage()
    const dateInput = (await screen.findByLabelText(
      'Data em que o trabalho foi realizado',
    )) as HTMLInputElement
    expect(dateInput.value).toBe(operationalTodayIso())
    fireEvent.click(screen.getByRole('button', { name: 'Registar apontamento' }))
    await waitFor(() => expect(mocks.postConveyorStepTimeEntry).toHaveBeenCalledTimes(1))
    const body = mocks.postConveyorStepTimeEntry.mock.calls[0]![2] as { entryAt: string }
    expect(operationalDateOf(new Date(body.entryAt))).toBe(operationalTodayIso())
  })

  it('"Ontem" envia meio-dia de SP de ontem', async () => {
    mocks.listMyActivities.mockResolvedValue([activity])
    mocks.postConveyorStepTimeEntry.mockResolvedValue({ id: 'te-1' })
    renderPage()
    await screen.findByLabelText('Data em que o trabalho foi realizado')
    fireEvent.click(screen.getByRole('button', { name: 'Ontem' }))
    fireEvent.click(screen.getByRole('button', { name: 'Registar apontamento' }))
    await waitFor(() => expect(mocks.postConveyorStepTimeEntry).toHaveBeenCalledTimes(1))
    const yesterday = shiftIsoDate(operationalTodayIso(), -1)
    expect(mocks.postConveyorStepTimeEntry).toHaveBeenCalledWith(
      'conv-1',
      'step-1',
      expect.objectContaining({ minutes: 30, entryAt: `${yesterday}T12:00:00-03:00` }),
    )
  })

  it('data futura bloqueia o botão', async () => {
    mocks.listMyActivities.mockResolvedValue([activity])
    renderPage()
    const dateInput = await screen.findByLabelText('Data em que o trabalho foi realizado')
    fireEvent.change(dateInput, { target: { value: shiftIsoDate(operationalTodayIso(), 1) } })
    const btn = screen.getByRole('button', { name: 'Registar apontamento' }) as HTMLButtonElement
    expect(btn.disabled).toBe(true)
  })
})
