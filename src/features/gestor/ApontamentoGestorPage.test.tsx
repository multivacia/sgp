/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ApontamentoGestorPage } from './ApontamentoGestorPage'
import {
  formatIsoDateBr,
  operationalTodayIso,
  shiftIsoDate,
} from '../../domain/operational/workDate'

const mocks = vi.hoisted(() => ({
  getConveyorStepAssignees: vi.fn(),
  getConveyorStepTimeEntries: vi.fn(),
  postConveyorStepTimeEntryOnBehalf: vi.fn(),
  deleteConveyorStepTimeEntry: vi.fn(),
  getConveyorStepSequenceCheck: vi.fn(),
}))

vi.mock('../../services/conveyors/conveyorStepAssignmentsApiService', () => ({
  getConveyorStepAssignees: mocks.getConveyorStepAssignees,
  getConveyorStepTimeEntries: mocks.getConveyorStepTimeEntries,
  postConveyorStepTimeEntryOnBehalf: mocks.postConveyorStepTimeEntryOnBehalf,
  deleteConveyorStepTimeEntry: mocks.deleteConveyorStepTimeEntry,
}))
vi.mock('../../services/conveyors/conveyorsApiService', () => ({
  getConveyorStepSequenceCheck: mocks.getConveyorStepSequenceCheck,
}))
const stable = vi.hoisted(() => {
  const can = () => true
  return {
    auth: {
      user: { id: 'u-1', collaboratorId: 'collab-gestor' },
      ready: true,
      can,
      canAny: can,
    },
    errorSurface: { presentBlocking: () => {} },
  }
})
vi.mock('../../lib/use-auth', () => ({ useAuth: () => stable.auth }))
vi.mock('../../lib/errors/SgpErrorPresentation', () => ({
  useSgpErrorSurface: () => stable.errorSurface,
}))

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/app/gestao/apontamento/step-1?conveyorId=conv-1']}>
      <Routes>
        <Route path="/app/gestao/apontamento/:stepNodeId" element={<ApontamentoGestorPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('ApontamentoGestorPage — data de realização', () => {
  it('envia a data escolhida (ontem) e mostra na confirmação; lista exibe a data de realização', async () => {
    const yesterday = shiftIsoDate(operationalTodayIso(), -1)
    mocks.getConveyorStepAssignees.mockResolvedValue([
      { id: 'a-1', type: 'COLLABORATOR', collaboratorId: 'collab-1', collaboratorName: 'Maria' },
    ])
    mocks.getConveyorStepTimeEntries.mockResolvedValue([
      {
        id: 'te-0',
        collaboratorId: 'collab-1',
        collaboratorName: 'Maria',
        minutes: 30,
        entryAt: `${yesterday}T15:00:00.000Z`,
        createdAt: new Date().toISOString(),
        isDelegated: false,
      },
    ])
    mocks.getConveyorStepSequenceCheck.mockResolvedValue({
      isOutOfSequence: false,
      requiresJustification: false,
    })
    mocks.postConveyorStepTimeEntryOnBehalf.mockResolvedValue({ id: 'te-1' })

    renderPage()

    expect(
      await screen.findByText(`realizado em ${formatIsoDateBr(yesterday)}`),
    ).toBeTruthy()

    const dateInput = screen.getByLabelText(
      'Data em que o trabalho foi realizado',
    ) as HTMLInputElement
    expect(dateInput.value).toBe(operationalTodayIso())

    fireEvent.click(screen.getByRole('button', { name: 'Ontem' }))
    fireEvent.change(screen.getByLabelText(/Motivo do registro/), {
      target: { value: 'Colaborador esqueceu' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Rever e registar' }))

    expect(screen.getByText(`Ontem · ${formatIsoDateBr(yesterday)}`)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))

    await waitFor(() => expect(mocks.postConveyorStepTimeEntryOnBehalf).toHaveBeenCalledTimes(1))
    expect(mocks.postConveyorStepTimeEntryOnBehalf).toHaveBeenCalledWith(
      'conv-1',
      'step-1',
      expect.objectContaining({
        targetCollaboratorId: 'collab-1',
        minutes: 30,
        entryAt: `${yesterday}T12:00:00-03:00`,
        reason: 'Colaborador esqueceu',
      }),
    )
  })

  it('data futura desabilita o envio', async () => {
    mocks.getConveyorStepAssignees.mockResolvedValue([
      { id: 'a-1', type: 'COLLABORATOR', collaboratorId: 'collab-1', collaboratorName: 'Maria' },
    ])
    mocks.getConveyorStepTimeEntries.mockResolvedValue([])
    mocks.getConveyorStepSequenceCheck.mockResolvedValue({
      isOutOfSequence: false,
      requiresJustification: false,
    })
    renderPage()
    const dateInput = await screen.findByLabelText('Data em que o trabalho foi realizado')
    fireEvent.change(dateInput, { target: { value: shiftIsoDate(operationalTodayIso(), 1) } })
    fireEvent.change(screen.getByLabelText(/Motivo do registro/), { target: { value: 'x' } })
    const btn = screen.getByRole('button', { name: 'Rever e registar' }) as HTMLButtonElement
    expect(btn.disabled).toBe(true)
    expect(screen.getByText('A data de realização não pode ser futura.')).toBeTruthy()
  })
})
