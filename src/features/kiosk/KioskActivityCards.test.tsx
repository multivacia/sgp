/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type {
  ProductionCollaboratorSummary,
  ProductionWorkQueueItem,
} from '../../domain/production/production.types'
import { KioskActivityCards } from './KioskActivityCards'
import { KIOSK_ACTIVITY_TOAST } from './kioskExtraActivityModalLogic'
import * as productionApiService from '../../services/production/productionApiService'

vi.mock('../../services/production/productionApiService', () => ({
  getProductionWorkQueue: vi.fn(),
  listProductionExtraTimeEntryDescriptions: vi.fn(),
  listProductionExtraTimeEntries: vi.fn(),
  createProductionExtraTimeEntry: vi.fn(),
  PRODUCTION_EXTRA_TIME_ENTRY_ERROR_MESSAGE:
    'Não foi possível registrar o apontamento extra esteira.',
}))

vi.mock('./KioskActivityCard', () => ({
  KioskActivityCard: ({
    item,
    onSuccess,
  }: {
    item: ProductionWorkQueueItem
    onSuccess: () => void
  }) => (
    <div data-testid={`card-${item.workPlanItemId}`}>
      <button type="button" onClick={onSuccess}>
        Simular sucesso card
      </button>
    </div>
  ),
}))

const collaborator: ProductionCollaboratorSummary = {
  id: 'col-1',
  fullName: 'Maria Silva',
  name: 'Maria Silva',
  displayName: 'Maria Silva',
  avatarUrl: null,
  initials: 'MS',
  productionCredentialStatus: 'READY',
  mustChangePin: false,
}

function sampleItem(partial: Partial<ProductionWorkQueueItem> = {}): ProductionWorkQueueItem {
  return {
    workPlanItemId: 'wpi-1',
    conveyorId: 'cv-1',
    conveyorTitle: 'OS 100',
    activityNodeId: 'step-1',
    activityTitle: 'Costura',
    sectorTitle: 'Costura',
    taskTitle: 'Montagem',
    plannedMinutes: 30,
    plannedDate: '2026-09-05',
    realizedMinutes: 0,
    pendingMinutes: 30,
    activityOperationalStatus: null,
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
    ...partial,
  } as ProductionWorkQueueItem
}

function mockedService() {
  return productionApiService as unknown as {
    getProductionWorkQueue: ReturnType<typeof vi.fn>
    listProductionExtraTimeEntryDescriptions: ReturnType<typeof vi.fn>
    listProductionExtraTimeEntries: ReturnType<typeof vi.fn>
    createProductionExtraTimeEntry: ReturnType<typeof vi.fn>
  }
}

describe('KioskActivityCards — toast', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const svc = mockedService()
    svc.getProductionWorkQueue.mockResolvedValue({ items: [sampleItem()] })
    svc.listProductionExtraTimeEntryDescriptions.mockResolvedValue([
      { id: 'desc-1', description: 'Reunião de alinhamento' },
    ])
    svc.listProductionExtraTimeEntries.mockResolvedValue([])
    svc.createProductionExtraTimeEntry.mockResolvedValue({
      id: 'entry-1',
      descriptionId: 'desc-1',
      description: 'Reunião de alinhamento',
      entryDate: '2026-09-05',
      minutes: 30,
      notes: null,
      createdAt: '2026-09-05T10:00:00.000Z',
      updatedAt: '2026-09-05T10:00:00.000Z',
    })
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('exibe SgpToast de sucesso ao registrar atividade extra esteira', async () => {
    render(
      <KioskActivityCards
        collaborator={collaborator}
        initialItems={[sampleItem()]}
        onExit={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByTitle(/registrar atividade extra esteira/i))
    await waitFor(() => {
      expect(mockedService().listProductionExtraTimeEntryDescriptions).toHaveBeenCalled()
    })

    fireEvent.change(screen.getByLabelText(/tipo de atividade/i), {
      target: { value: 'desc-1' },
    })
    fireEvent.change(screen.getByPlaceholderText(/ex\.: 30/i), {
      target: { value: '30' },
    })
    fireEvent.click(screen.getByRole('button', { name: /registrar apontamento/i }))

    await waitFor(() => {
      expect(mockedService().createProductionExtraTimeEntry).toHaveBeenCalled()
    })
    await waitFor(() => {
      expect(screen.getByRole('status').textContent).toContain(
        KIOSK_ACTIVITY_TOAST.extraEntrySaved,
      )
    })
    expect(mockedService().getProductionWorkQueue).toHaveBeenCalled()
  })

  it('exibe toast neutro quando a recarga da fila falha após extra', async () => {
    mockedService().getProductionWorkQueue.mockRejectedValue(new Error('network'))

    render(
      <KioskActivityCards
        collaborator={collaborator}
        initialItems={[sampleItem()]}
        onExit={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByTitle(/registrar atividade extra esteira/i))
    await waitFor(() => {
      expect(mockedService().listProductionExtraTimeEntryDescriptions).toHaveBeenCalled()
    })
    fireEvent.change(screen.getByLabelText(/tipo de atividade/i), {
      target: { value: 'desc-1' },
    })
    fireEvent.change(screen.getByPlaceholderText(/ex\.: 30/i), {
      target: { value: '30' },
    })
    fireEvent.click(screen.getByRole('button', { name: /registrar apontamento/i }))

    await waitFor(() => {
      expect(screen.getByRole('status').textContent).toContain(
        KIOSK_ACTIVITY_TOAST.queueReloadFailed,
      )
    })
  })
})
