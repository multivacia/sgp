/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { JornadaColaboradorGestorPage } from './JornadaColaboradorGestorPage'
import type { OperationalJourneyData } from '../../domain/operational-journey/operational-journey.types'

const COLAB_A = '11111111-1111-1111-1111-111111111111'
const COLAB_B = '22222222-2222-2222-2222-222222222222'

const mocks = vi.hoisted(() => ({
  fetchOperationalJourney: vi.fn(),
  fetchOperationalJourneyForCollaborators: vi.fn(),
  exportOperationalJourneyToExcel: vi.fn(),
  listAdminCollaborators: vi.fn(),
}))

vi.mock('../../services/operational-journey/operationalJourneyApiService', () => ({
  EXPORT_OPERATIONAL_JOURNEY_FAIL_MESSAGE: 'Não foi possível exportar o Excel da jornada.',
  exportOperationalJourneyToExcel: mocks.exportOperationalJourneyToExcel,
  fetchOperationalJourney: mocks.fetchOperationalJourney,
  fetchOperationalJourneyForCollaborators: mocks.fetchOperationalJourneyForCollaborators,
}))
vi.mock('../../services/admin/adminCollaboratorsApiService', () => ({
  listAdminCollaborators: mocks.listAdminCollaborators,
}))
const stable = vi.hoisted(() => {
  const can = () => true
  return { auth: { user: { id: 'u-1' }, ready: true, can, canAny: can } }
})
vi.mock('../../lib/use-auth', () => ({ useAuth: () => stable.auth }))

function journeyFixture(over: Partial<OperationalJourneyData> = {}): OperationalJourneyData {
  return {
    meta: { semanticsVersion: '1.5' },
    collaborator: { id: COLAB_A, fullName: 'Maria Souza' },
    collaborators: [
      { id: COLAB_A, fullName: 'Maria Souza' },
      { id: COLAB_B, fullName: 'João Lima' },
    ],
    period: { from: '2026-09-01T03:00:00.000Z', to: '2026-09-28T15:00:00.000Z' },
    query: { limit: 20, conveyorId: null, periodPreset: '7d', collaboratorIds: [COLAB_A, COLAB_B] },
    load: { assignmentCount: 3, plannedMinutesOnStepsSum: 300 },
    coberturaTempo: {
      ratio: 100 / 300,
      previstoMinutosEscopo: 300,
      realizadoMinutosAcumuladoEscopo: 100,
      formula: '',
    },
    execution: { realizedMinutesInPeriod: 100, realizedMinutesTotal: 100 },
    extraTimeEntriesSummary: { totalMinutes: 0, entriesCount: 0, topDescriptions: [] },
    risk: {
      byBucket: {
        em_elaboracao: 0,
        aguardando_planejamento: 0,
        em_planejamento: 0,
        em_execucao: 3,
        em_atraso: 0,
        finalizadas: 0,
        canceladas: 0,
      },
      overdueCount: 0,
    },
    signals: { pressaoAtrasoAlocacoes: 0, pendenciaTempo: { count: 0, items: [] } },
    assignmentsOpen: [],
    assignmentsAtRisk: [],
    recentTimeEntries: [
      {
        id: 'te-1',
        collaboratorId: COLAB_B,
        collaboratorName: 'João Lima',
        conveyorId: 'conv-1',
        conveyorName: 'OS-1000',
        stepNodeId: 'step-1',
        stepName: 'Costurar banco',
        minutes: 45,
        entryAt: '2026-09-27T15:00:00.000Z',
        notes: null,
        entryOrigin: 'ASSIGNED',
        exceptionJustification: null,
        isOutOfSequence: false,
        outOfSequenceJustification: null,
      },
    ],
    ...over,
  } as unknown as OperationalJourneyData
}

function renderPage(search: string) {
  mocks.listAdminCollaborators.mockResolvedValue({
    items: [
      { id: COLAB_A, fullName: 'Maria Souza' },
      { id: COLAB_B, fullName: 'João Lima' },
    ],
  })
  return render(
    <MemoryRouter initialEntries={[`/app/gestao/jornada-colaborador${search}`]}>
      <JornadaColaboradorGestorPage />
    </MemoryRouter>,
  )
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('JornadaColaboradorGestorPage — seleção de colaboradores', () => {
  it('1 colaborador: usa a jornada de colaborador único e não rotula o registro', async () => {
    mocks.fetchOperationalJourney.mockResolvedValue(
      journeyFixture({
        collaborators: [{ id: COLAB_A, fullName: 'Maria Souza' }],
        recentTimeEntries: [
          {
            id: 'te-1',
            collaboratorId: COLAB_A,
            collaboratorName: 'Maria Souza',
            conveyorId: 'conv-1',
            conveyorName: 'OS-1000',
            stepNodeId: 'step-1',
            stepName: 'Costurar banco',
            minutes: 45,
            entryAt: '2026-09-27T15:00:00.000Z',
            notes: null,
            entryOrigin: 'ASSIGNED',
            exceptionJustification: null,
            isOutOfSequence: false,
            outOfSequenceJustification: null,
          },
        ],
      } as unknown as Partial<OperationalJourneyData>),
    )
    renderPage(`?colaboradorIds=${COLAB_A}`)

    await waitFor(() => expect(mocks.fetchOperationalJourney).toHaveBeenCalled())
    expect(mocks.fetchOperationalJourney.mock.calls[0]![0]).toBe(COLAB_A)
    expect(mocks.fetchOperationalJourneyForCollaborators).not.toHaveBeenCalled()
    // sem escopo múltiplo, o histórico não recebe etiqueta de colaborador
    expect((await screen.findAllByText('OS-1000')).length).toBeGreaterThan(0)
    expect(screen.queryByText('Maria Souza', { selector: 'span' })).toBeNull()
    expect(screen.queryByText(/escopo consolidado/)).toBeNull()
  })

  it('aceita o parâmetro legado colaboradorId', async () => {
    mocks.fetchOperationalJourney.mockResolvedValue(journeyFixture())
    renderPage(`?colaboradorId=${COLAB_A}`)
    await waitFor(() => expect(mocks.fetchOperationalJourney).toHaveBeenCalled())
    expect(mocks.fetchOperationalJourney.mock.calls[0]![0]).toBe(COLAB_A)
  })

  it('vários colaboradores: usa a jornada consolidada e identifica o colaborador do registro', async () => {
    mocks.fetchOperationalJourneyForCollaborators.mockResolvedValue(journeyFixture())
    renderPage(`?colaboradorIds=${COLAB_A},${COLAB_B}`)

    await waitFor(() =>
      expect(mocks.fetchOperationalJourneyForCollaborators).toHaveBeenCalled(),
    )
    expect(mocks.fetchOperationalJourneyForCollaborators.mock.calls[0]![0]).toEqual([
      COLAB_A,
      COLAB_B,
    ])
    expect(mocks.fetchOperationalJourney).not.toHaveBeenCalled()
    // cards consolidados + identificação do colaborador no histórico
    // previsto estrutural consolidado (300 min) exibido como total somado
    expect((await screen.findAllByText('5 h')).length).toBeGreaterThan(0)
    expect(screen.getByText(/escopo consolidado de 2 colaboradores/)).toBeTruthy()
    expect(screen.getByText('João Lima')).toBeTruthy()
    expect(screen.getByText(/2 colaboradores: Maria Souza · João Lima/)).toBeTruthy()
  })

  it('ids duplicados na URL não repetem o colaborador no escopo', async () => {
    mocks.fetchOperationalJourneyForCollaborators.mockResolvedValue(journeyFixture())
    renderPage(`?colaboradorIds=${COLAB_A},${COLAB_B},${COLAB_A}`)
    await waitFor(() =>
      expect(mocks.fetchOperationalJourneyForCollaborators).toHaveBeenCalled(),
    )
    expect(mocks.fetchOperationalJourneyForCollaborators.mock.calls[0]![0]).toEqual([
      COLAB_A,
      COLAB_B,
    ])
  })

  it('limpar a seleção remove a jornada e volta ao estado inicial', async () => {
    mocks.fetchOperationalJourneyForCollaborators.mockResolvedValue(journeyFixture())
    renderPage(`?colaboradorIds=${COLAB_A},${COLAB_B}`)
    await waitFor(() =>
      expect(mocks.fetchOperationalJourneyForCollaborators).toHaveBeenCalledTimes(1),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Limpar seleção' }))

    expect(await screen.findByText('Selecione um ou mais colaboradores.')).toBeTruthy()
    expect(screen.queryByText('João Lima', { selector: 'span' })).toBeNull()
    expect(mocks.fetchOperationalJourneyForCollaborators).toHaveBeenCalledTimes(1)
    expect(mocks.fetchOperationalJourney).not.toHaveBeenCalled()
  })

  it('adicionar um segundo colaborador pelo popover passa a usar a jornada consolidada', async () => {
    mocks.fetchOperationalJourney.mockResolvedValue(journeyFixture())
    mocks.fetchOperationalJourneyForCollaborators.mockResolvedValue(journeyFixture())
    renderPage(`?colaboradorIds=${COLAB_A}`)
    await waitFor(() => expect(mocks.fetchOperationalJourney).toHaveBeenCalledTimes(1))

    fireEvent.click(screen.getByRole('button', { name: 'Adicionar colaborador à jornada' }))
    fireEvent.change(screen.getByPlaceholderText('Buscar colaborador…'), {
      target: { value: 'João' },
    })
    fireEvent.click(screen.getByRole('button', { name: /João Lima/ }))

    await waitFor(() =>
      expect(mocks.fetchOperationalJourneyForCollaborators).toHaveBeenCalledTimes(1),
    )
    expect(mocks.fetchOperationalJourneyForCollaborators.mock.calls[0]![0]).toEqual([
      COLAB_A,
      COLAB_B,
    ])
  })

  it('exportar Excel envia a seleção atual e o recorte da tela', async () => {
    mocks.fetchOperationalJourneyForCollaborators.mockResolvedValue(journeyFixture())
    mocks.exportOperationalJourneyToExcel.mockResolvedValue(undefined)
    renderPage(`?colaboradorIds=${COLAB_A},${COLAB_B}&periodPreset=15d`)
    await waitFor(() =>
      expect(mocks.fetchOperationalJourneyForCollaborators).toHaveBeenCalled(),
    )

    const btn = await screen.findByRole('button', { name: 'Exportar Excel' })
    await waitFor(() => expect((btn as HTMLButtonElement).disabled).toBe(false))
    fireEvent.click(btn)
    await waitFor(() => expect(mocks.exportOperationalJourneyToExcel).toHaveBeenCalledTimes(1))
    expect(mocks.exportOperationalJourneyToExcel).toHaveBeenCalledWith(
      [COLAB_A, COLAB_B],
      expect.objectContaining({ periodPreset: '15d' }),
    )
  })

  it('resposta antiga não sobrescreve a carga mais recente', async () => {
    let releaseStale: (v: OperationalJourneyData) => void = () => {}
    mocks.fetchOperationalJourney.mockImplementationOnce(
      () =>
        new Promise<OperationalJourneyData>((resolve) => {
          releaseStale = resolve
        }),
    )
    mocks.fetchOperationalJourneyForCollaborators.mockResolvedValue(journeyFixture())
    renderPage(`?colaboradorIds=${COLAB_A}`)
    await waitFor(() => expect(mocks.fetchOperationalJourney).toHaveBeenCalledTimes(1))

    fireEvent.click(screen.getByRole('button', { name: 'Adicionar colaborador à jornada' }))
    fireEvent.click(screen.getByRole('button', { name: /João Lima/ }))
    expect(await screen.findByText(/escopo consolidado de 2 colaboradores/)).toBeTruthy()

    // resposta tardia da seleção anterior (1 colaborador) não pode substituir o consolidado
    releaseStale(
      journeyFixture({
        collaborators: [{ id: COLAB_A, fullName: 'Maria Souza' }],
      } as Partial<OperationalJourneyData>),
    )
    await new Promise((r) => setTimeout(r, 0))
    expect(screen.getByText(/escopo consolidado de 2 colaboradores/)).toBeTruthy()
  })
})
