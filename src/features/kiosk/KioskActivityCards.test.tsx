/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { KioskActivityCards } from './KioskActivityCards'
import type {
  ProductionCollaboratorSummary,
  ProductionWorkQueueItem,
} from '../../domain/production/production.types'
import type { TimeEntryCandidateItem } from '../../domain/my-activities/my-activities.types'
import { ApiError } from '../../lib/api/apiErrors'

const {
  getProductionWorkQueueMock,
  listProductionExtraTimeEntryDescriptionsMock,
  createProductionExtraTimeEntryMock,
  listProductionTimeEntryCandidatesMock,
  createProductionUnassignedTimeEntryMock,
} = vi.hoisted(() => ({
  getProductionWorkQueueMock: vi.fn(),
  listProductionExtraTimeEntryDescriptionsMock: vi.fn(),
  createProductionExtraTimeEntryMock: vi.fn(),
  listProductionTimeEntryCandidatesMock: vi.fn(),
  createProductionUnassignedTimeEntryMock: vi.fn(),
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
    createProductionUnassignedTimeEntry: createProductionUnassignedTimeEntryMock,
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

describe('KioskActivityCards — rolagem do modo lista', () => {
  it('modo lista usa container rolável com min-h-0, overflow-y-auto e pan vertical', () => {
    renderKiosk()
    fireEvent.click(screen.getByRole('button', { name: 'Modo lista' }))
    const scroll = screen.getByTestId('kiosk-activity-list-scroll')
    expect(scroll.className).toMatch(/\bmin-h-0\b/)
    expect(scroll.className).toMatch(/\bflex-1\b/)
    expect(scroll.className).toMatch(/\boverflow-y-auto\b/)
    expect(scroll.className).toMatch(/\boverscroll-contain\b/)
    expect(scroll.className).toMatch(/\btouch-pan-y\b/)
  })

  it('troca carrossel → lista mantém Extra esteira e Outra atividade acessíveis', () => {
    renderKiosk()
    expect(screen.getByRole('button', { name: 'Modo carrossel' }).getAttribute('aria-pressed')).toBe(
      'true',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Modo lista' }))
    expect(screen.getByRole('button', { name: 'Modo lista' }).getAttribute('aria-pressed')).toBe(
      'true',
    )
    expect(screen.getByTestId('kiosk-activity-list-scroll')).toBeTruthy()
    expect(screen.getByRole('button', { name: '+ Extra esteira' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '+ Outra atividade' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Modo carrossel' }))
    expect(screen.queryByTestId('kiosk-activity-list-scroll')).toBeNull()
    expect(screen.getByRole('button', { name: 'Modo carrossel' }).getAttribute('aria-pressed')).toBe(
      'true',
    )
  })
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

  it('sucesso no apontamento outra atividade fecha o overlay e retorna ao Kiosk', async () => {
    const candidate: TimeEntryCandidateItem = {
      conveyorId: 'conv-2',
      conveyorCode: 'OS-2000',
      conveyorName: 'OS-2000',
      clientName: null,
      vehicleLabel: null,
      plate: null,
      stepNodeId: 'step-99',
      stepName: 'Revisar acabamento',
      activityTitle: 'Revisar acabamento',
      taskTitle: 'Acabamento',
      areaName: 'Acabamento',
      sectorTitle: 'Costura',
      roleInStep: 'primary',
      assignmentType: 'COLLABORATOR',
      plannedMinutes: 30,
      realizedMinutes: 0,
      pendingMinutes: 30,
      isAssignedToMe: true,
      requiresJustification: false,
      isOutOfSequence: false,
      hasPreviousPendingStep: false,
      requiresOutOfSequenceJustification: false,
      previousOpenCount: 0,
      previousOpenActivities: [],
      awaitingPreviousActivities: [],
    }

    listProductionTimeEntryCandidatesMock.mockResolvedValue({
      items: [candidate],
      collaboratorId: 'collab-1',
      unavailableReason: null,
    })
    createProductionUnassignedTimeEntryMock.mockResolvedValue({
      id: 'entry-2',
      conveyorId: 'conv-2',
      stepNodeId: 'step-99',
      minutes: 30,
      createdAt: '2026-09-07T10:00:00.000Z',
    })

    renderKiosk()
    fireEvent.click(screen.getByRole('button', { name: '+ Outra atividade' }))
    const dialog = screen.getByRole('dialog', { name: 'Outra atividade' })

    const searchInput = within(dialog).getByLabelText('Buscar atividade')
    fireEvent.change(searchInput, { target: { value: 'acabamento' } })

    fireEvent.click(
      await within(dialog).findByRole('button', { name: /Revisar acabamento/ }),
    )

    fireEvent.click(within(dialog).getByRole('button', { name: '30 min' }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Continuar' }))

    fireEvent.click(await within(dialog).findByRole('button', { name: 'Confirmar apontamento' }))

    await waitFor(() => expect(createProductionUnassignedTimeEntryMock).toHaveBeenCalledTimes(1))
    expect(createProductionUnassignedTimeEntryMock).toHaveBeenCalledWith({
      conveyorId: 'conv-2',
      stepNodeId: 'step-99',
      minutes: 30,
    })

    await within(dialog).findByText('Apontamento registrado!')

    await waitFor(
      () => expect(screen.queryByRole('dialog', { name: 'Outra atividade' })).toBeNull(),
      { timeout: 3000 },
    )
    expect(screen.getByRole('button', { name: '+ Outra atividade' })).toBeTruthy()
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
