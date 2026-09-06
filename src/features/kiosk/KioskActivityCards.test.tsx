/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
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

/**
 * Aguarda o esvaziamento da fila de microtasks pendentes (promises já
 * resolvidas/rejeitadas pelos mocks de serviço), dentro de `act` para que
 * as atualizações de estado do React decorrentes sejam corretamente
 * "flushadas" e commitadas — funciona independente de fake timers, já que
 * a resolução de Promises nativas não depende do relógio mockado.
 */
async function flushMicrotasks() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
  })
}

async function openExtraModal() {
  fireEvent.click(screen.getByTitle(/registrar atividade extra esteira/i))
  await flushMicrotasks()
}

function fillValidExtraForm() {
  fireEvent.change(screen.getByLabelText(/tipo de atividade/i), {
    target: { value: 'desc-1' },
  })
  fireEvent.change(screen.getByPlaceholderText(/ex\.: 30/i), {
    target: { value: '30' },
  })
}

async function submitExtraForm() {
  fireEvent.click(screen.getByRole('button', { name: /registrar apontamento/i }))
  await flushMicrotasks()
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
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('não exibe toast no estado inicial', () => {
    render(
      <KioskActivityCards
        collaborator={collaborator}
        initialItems={[sampleItem()]}
        onExit={vi.fn()}
      />,
    )

    expect(screen.queryByRole('status')).toBeNull()
  })

  it('exibe toast de sucesso com o texto exato ao registrar atividade extra, sem recarregar a fila', async () => {
    render(
      <KioskActivityCards
        collaborator={collaborator}
        initialItems={[sampleItem()]}
        onExit={vi.fn()}
      />,
    )

    await openExtraModal()
    fillValidExtraForm()
    await submitExtraForm()

    expect(mockedService().createProductionExtraTimeEntry).toHaveBeenCalled()
    const status = screen.getByRole('status')
    expect(status.textContent).toContain(KIOSK_ACTIVITY_TOAST.extraEntrySaved)
    expect(mockedService().getProductionWorkQueue).not.toHaveBeenCalled()
  })

  it('toast possui role="status" e aria-live="polite"', async () => {
    render(
      <KioskActivityCards
        collaborator={collaborator}
        initialItems={[sampleItem()]}
        onExit={vi.fn()}
      />,
    )

    await openExtraModal()
    fillValidExtraForm()
    await submitExtraForm()

    const status = screen.getByRole('status')
    expect(status.getAttribute('aria-live')).toBe('polite')
  })

  it('toast desaparece automaticamente após ~4200ms', async () => {
    vi.useFakeTimers()
    render(
      <KioskActivityCards
        collaborator={collaborator}
        initialItems={[sampleItem()]}
        onExit={vi.fn()}
      />,
    )

    await openExtraModal()
    fillValidExtraForm()
    await submitExtraForm()

    expect(screen.getByRole('status')).not.toBeNull()

    act(() => {
      vi.advanceTimersByTime(4199)
    })
    expect(screen.getByRole('status')).not.toBeNull()

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('um segundo sucesso reinicia o temporizador do toast', async () => {
    vi.useFakeTimers()
    render(
      <KioskActivityCards
        collaborator={collaborator}
        initialItems={[sampleItem()]}
        onExit={vi.fn()}
      />,
    )

    await openExtraModal()
    fillValidExtraForm()
    await submitExtraForm()
    expect(screen.getByRole('status')).not.toBeNull()

    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(screen.getByRole('status')).not.toBeNull()

    // Segundo sucesso, antes do primeiro toast desaparecer.
    await openExtraModal()
    fillValidExtraForm()
    await submitExtraForm()

    // Total de 6000ms desde o 1º sucesso, mas apenas 3000ms desde o 2º —
    // o toast deve continuar visível porque o temporizador foi reiniciado.
    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(screen.getByRole('status')).not.toBeNull()

    // Mais ~1300ms (total de 4300ms desde o 2º sucesso) — ultrapassa os
    // ~4200ms do temporizador reiniciado, então o toast desaparece.
    act(() => {
      vi.advanceTimersByTime(1300)
    })
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('fechar o modal sem submeter não exibe toast', async () => {
    render(
      <KioskActivityCards
        collaborator={collaborator}
        initialItems={[sampleItem()]}
        onExit={vi.fn()}
      />,
    )

    await openExtraModal()
    fireEvent.click(screen.getByRole('button', { name: /fechar/i }))
    await flushMicrotasks()

    expect(mockedService().createProductionExtraTimeEntry).not.toHaveBeenCalled()
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('erro ao criar o apontamento extra não exibe toast de sucesso', async () => {
    mockedService().createProductionExtraTimeEntry.mockRejectedValueOnce(
      new Error('falha ao salvar'),
    )

    render(
      <KioskActivityCards
        collaborator={collaborator}
        initialItems={[sampleItem()]}
        onExit={vi.fn()}
      />,
    )

    await openExtraModal()
    fillValidExtraForm()
    await submitExtraForm()

    expect(mockedService().createProductionExtraTimeEntry).toHaveBeenCalled()
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('desmontar com o temporizador do toast pendente não gera warning/erro do React', async () => {
    vi.useFakeTimers()
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { unmount } = render(
      <KioskActivityCards
        collaborator={collaborator}
        initialItems={[sampleItem()]}
        onExit={vi.fn()}
      />,
    )

    await openExtraModal()
    fillValidExtraForm()
    await submitExtraForm()
    expect(screen.getByRole('status')).not.toBeNull()

    unmount()

    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(consoleErrorSpy).not.toHaveBeenCalled()
  })
})
