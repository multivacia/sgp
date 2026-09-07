/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { KioskActivityCards } from './KioskActivityCards'
import type {
  ProductionCollaboratorSummary,
  ProductionWorkQueueItem,
} from '../../domain/production/production.types'
import { ApiError } from '../../lib/api/apiErrors'

const {
  getProductionWorkQueueMock,
  listProductionExtraTimeEntryDescriptionsMock,
  createProductionExtraTimeEntryMock,
  listProductionTimeEntryCandidatesMock,
} = vi.hoisted(() => ({
  getProductionWorkQueueMock: vi.fn(),
  listProductionExtraTimeEntryDescriptionsMock: vi.fn(),
  createProductionExtraTimeEntryMock: vi.fn(),
  listProductionTimeEntryCandidatesMock: vi.fn(),
}))

vi.mock('../../services/production/productionApiService', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../services/production/productionApiService')>()
  return {
    ...actual,
    getProductionWorkQueue: getProductionWorkQueueMock,
    listProductionExtraTimeEntryDescriptions: listProductionExtraTimeEntryDescriptionsMock,
    createProductionExtraTimeEntry: createProductionExtraTimeEntryMock,
    listProductionTimeEntryCandidates: listProductionTimeEntryCandidatesMock,
  }
})

const collaborator: ProductionCollaboratorSummary = {
  id: 'collab-1',
  fullName: 'Maria Souza',
  name: 'Maria',
  displayName: 'Maria',
  avatarUrl: null,
  initials: 'MS',
  productionCredentialStatus: 'READY',
}

const workQueueItem: ProductionWorkQueueItem = {
  workPlanItemId: 'wpi-1',
  conveyorId: 'conv-1',
  conveyorTitle: 'OS-1000',
  activityNodeId: 'step-1',
  activityTitle: 'Costurar banco',
  taskTitle: 'Estofamento',
  sectorTitle: 'Costura',
  plannedDate: '2026-09-07',
  plannedMinutes: 60,
  realizedMinutes: 0,
  pendingMinutes: 60,
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

function renderKiosk() {
  return render(
    <KioskActivityCards
      collaborator={collaborator}
      initialItems={[workQueueItem]}
      onExit={() => {}}
    />,
  )
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('KioskActivityCards — apontamentos avulsos', () => {
  it('exibe os botões "+ Extra esteira" e "+ Outra atividade" no header', () => {
    renderKiosk()
    expect(screen.getByRole('button', { name: '+ Extra esteira' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '+ Outra atividade' })).toBeTruthy()
  })

  it('clicar em "+ Extra esteira" abre o fluxo em overlay (role=dialog)', () => {
    listProductionExtraTimeEntryDescriptionsMock.mockResolvedValue([])
    renderKiosk()
    fireEvent.click(screen.getByRole('button', { name: '+ Extra esteira' }))
    expect(screen.getByRole('dialog', { name: 'Extra esteira' })).toBeTruthy()
  })

  it('clicar em "+ Outra atividade" abre o fluxo em overlay (role=dialog)', () => {
    renderKiosk()
    fireEvent.click(screen.getByRole('button', { name: '+ Outra atividade' }))
    expect(screen.getByRole('dialog', { name: 'Outra atividade' })).toBeTruthy()
  })

  it('sucesso no apontamento extra esteira fecha o overlay e retorna ao Kiosk', async () => {
    listProductionExtraTimeEntryDescriptionsMock.mockResolvedValue([
      { id: 'desc-1', description: 'Ajuste de bancada' },
    ])
    createProductionExtraTimeEntryMock.mockResolvedValue({
      id: 'entry-1',
      descriptionId: 'desc-1',
      description: 'Ajuste de bancada',
      entryDate: '2026-09-07',
      minutes: 15,
      notes: null,
      createdAt: '2026-09-07T10:00:00.000Z',
      updatedAt: '2026-09-07T10:00:00.000Z',
    })

    renderKiosk()
    fireEvent.click(screen.getByRole('button', { name: '+ Extra esteira' }))
    const dialog = screen.getByRole('dialog', { name: 'Extra esteira' })

    const select = await within(dialog).findByLabelText(/Descrição/)
    await waitFor(() =>
      expect(within(dialog).getByRole('option', { name: 'Ajuste de bancada' })).toBeTruthy(),
    )
    fireEvent.change(select, { target: { value: 'desc-1' } })
    fireEvent.click(within(dialog).getByRole('button', { name: '15 min' }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Continuar' }))

    fireEvent.click(await within(dialog).findByRole('button', { name: 'Confirmar apontamento' }))

    await waitFor(() => expect(createProductionExtraTimeEntryMock).toHaveBeenCalledTimes(1))
    expect(createProductionExtraTimeEntryMock).toHaveBeenCalledWith({
      descriptionId: 'desc-1',
      minutes: 15,
    })

    await within(dialog).findByText('Apontamento registrado!')

    await waitFor(
      () => expect(screen.queryByRole('dialog', { name: 'Extra esteira' })).toBeNull(),
      { timeout: 3000 },
    )
  })

  it('erro de persistência mantém o overlay aberto com banner de erro (nunca mostra sucesso)', async () => {
    listProductionExtraTimeEntryDescriptionsMock.mockResolvedValue([
      { id: 'desc-1', description: 'Ajuste de bancada' },
    ])
    createProductionExtraTimeEntryMock.mockRejectedValue(
      new ApiError('Falha ao registrar o apontamento.', 500),
    )

    renderKiosk()
    fireEvent.click(screen.getByRole('button', { name: '+ Extra esteira' }))
    const dialog = screen.getByRole('dialog', { name: 'Extra esteira' })

    const select = await within(dialog).findByLabelText(/Descrição/)
    await waitFor(() =>
      expect(within(dialog).getByRole('option', { name: 'Ajuste de bancada' })).toBeTruthy(),
    )
    fireEvent.change(select, { target: { value: 'desc-1' } })
    fireEvent.click(within(dialog).getByRole('button', { name: '15 min' }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Continuar' }))

    fireEvent.click(await within(dialog).findByRole('button', { name: 'Confirmar apontamento' }))

    await waitFor(() => expect(createProductionExtraTimeEntryMock).toHaveBeenCalledTimes(1))

    const alert = await within(dialog).findByRole('alert')
    expect(alert.textContent).toBe('Falha ao registrar o apontamento.')
    expect(screen.getByRole('dialog', { name: 'Extra esteira' })).toBeTruthy()
    expect(screen.queryByText('Apontamento registrado!')).toBeNull()
  })
})
