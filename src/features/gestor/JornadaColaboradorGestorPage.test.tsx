/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { JornadaColaboradorGestorPage } from './JornadaColaboradorGestorPage'
import type { OperationalJourneyData } from '../../domain/operational-journey/operational-journey.types'

const { fetchOperationalJourney, exportOperationalJourneyToExcel, listAdminCollaborators } =
  vi.hoisted(() => ({
    fetchOperationalJourney: vi.fn(),
    exportOperationalJourneyToExcel: vi.fn(),
    listAdminCollaborators: vi.fn(),
  }))

vi.mock('../../services/operational-journey/operationalJourneyApiService', () => ({
  EXPORT_OPERATIONAL_JOURNEY_FAIL_MESSAGE: 'Não foi possível exportar o Excel da jornada.',
  fetchOperationalJourney,
  exportOperationalJourneyToExcel,
}))
vi.mock('../../services/admin/adminCollaboratorsApiService', () => ({ listAdminCollaborators }))
vi.mock('../../lib/use-auth', () => ({ useAuth: () => ({ canAny: () => false }) }))
vi.mock('../../lib/errors', () => ({
  reportClientError: () => ({ userMessage: 'Falha', errorRef: null }),
  formatUserError: (n: { userMessage: string }) => n.userMessage,
}))

const ANA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const BRUNO = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

function journey(id: string, fullName: string, realizedPeriod: number): OperationalJourneyData {
  return {
    meta: { semanticsVersion: '1.5' },
    collaborator: { id, fullName },
    period: { from: '2026-09-01T03:00:00.000Z', to: '2026-09-08T02:59:59.999Z' },
    query: { limit: 20, conveyorId: null, periodPreset: '7d' },
    load: { assignmentCount: 1, plannedMinutesOnStepsSum: 120 },
    coberturaTempo: {
      ratio: 0.5,
      previstoMinutosEscopo: 120,
      realizadoMinutosAcumuladoEscopo: 60,
      formula: '',
    },
    execution: { realizedMinutesInPeriod: realizedPeriod, realizedMinutesTotal: realizedPeriod },
    extraTimeEntriesSummary: { totalMinutes: 0, entriesCount: 0, topDescriptions: [] },
    risk: {
      byBucket: {
        em_elaboracao: 0,
        aguardando_planejamento: 0,
        em_planejamento: 0,
        em_execucao: 1,
        em_atraso: 0,
        finalizadas: 0,
        canceladas: 0,
      },
      overdueCount: 0,
    },
    signals: { pressaoAtrasoAlocacoes: 0, pendenciaTempo: { count: 0, items: [] } },
    assignmentsOpen: [],
    assignmentsAtRisk: [],
    recentTimeEntries: [],
  }
}

function renderAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <JornadaColaboradorGestorPage />
    </MemoryRouter>,
  )
}

function totalsText(): string {
  return screen.getByTestId('jornada-totais').textContent ?? ''
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('JornadaColaboradorGestorPage — seleção, totais e exportação', () => {
  it('link legado ?colaboradorId= carrega um colaborador sem resumo por colaborador', async () => {
    listAdminCollaborators.mockResolvedValue({
      items: [{ id: ANA, fullName: 'Ana Souza' }],
    })
    fetchOperationalJourney.mockResolvedValue(journey(ANA, 'Ana Souza', 90))
    renderAt(`/app/gestao/jornada-colaborador?colaboradorId=${ANA}`)
    await screen.findByTestId('jornada-totais')
    expect(fetchOperationalJourney).toHaveBeenCalledTimes(1)
    expect(fetchOperationalJourney).toHaveBeenCalledWith(ANA, expect.objectContaining({ periodPreset: '7d' }))
    expect(totalsText()).toContain('1 h 30 min')
    expect(screen.queryByTestId('jornada-resumo-colaboradores')).toBeNull()
  })

  it('vários colaboradores: totais consolidados, resumo por colaborador e exportação com a seleção', async () => {
    listAdminCollaborators.mockResolvedValue({
      items: [
        { id: ANA, fullName: 'Ana Souza' },
        { id: BRUNO, fullName: 'Bruno Lima' },
      ],
    })
    fetchOperationalJourney.mockImplementation(async (id: string) =>
      id === ANA ? journey(ANA, 'Ana Souza', 30) : journey(BRUNO, 'Bruno Lima', 45),
    )
    exportOperationalJourneyToExcel.mockResolvedValue(undefined)
    renderAt(`/app/gestao/jornada-colaborador?colaboradorIds=${ANA},${BRUNO}&periodPreset=15d`)

    const resumo = await screen.findByTestId('jornada-resumo-colaboradores')
    expect(within(resumo).getByText('Ana Souza')).toBeTruthy()
    expect(within(resumo).getByText('Bruno Lima')).toBeTruthy()
    // 30 + 45 = 75 min consolidados no quadro de totais.
    expect(totalsText()).toContain('1 h 15 min')
    expect(totalsText()).toContain('Alocações (escopo)2')

    fireEvent.click(screen.getByRole('button', { name: 'Exportar Excel' }))
    await waitFor(() => expect(exportOperationalJourneyToExcel).toHaveBeenCalledTimes(1))
    expect(exportOperationalJourneyToExcel).toHaveBeenCalledWith(
      [ANA, BRUNO],
      expect.objectContaining({ periodPreset: '15d' }),
    )
  })

  it('adicionar colaborador recalcula os totais; resposta antiga não sobrescreve a nova', async () => {
    listAdminCollaborators.mockResolvedValue({
      items: [
        { id: ANA, fullName: 'Ana Souza' },
        { id: BRUNO, fullName: 'Bruno Lima' },
      ],
    })
    let releaseStale: (v: OperationalJourneyData) => void = () => {}
    fetchOperationalJourney
      // 1ª carga (só Ana) fica pendente e responde por último.
      .mockImplementationOnce(
        () =>
          new Promise<OperationalJourneyData>((resolve) => {
            releaseStale = resolve
          }),
      )
      .mockImplementation(async (id: string) =>
        id === ANA ? journey(ANA, 'Ana Souza', 30) : journey(BRUNO, 'Bruno Lima', 45),
      )
    renderAt(`/app/gestao/jornada-colaborador?colaboradorId=${ANA}`)

    const add = await screen.findByLabelText('Adicionar colaborador')
    await waitFor(() => expect((add as HTMLSelectElement).disabled).toBe(false))
    fireEvent.change(add, { target: { value: BRUNO } })

    await screen.findByTestId('jornada-resumo-colaboradores')
    expect(totalsText()).toContain('1 h 15 min')

    // Resposta atrasada da seleção anterior chega depois — deve ser ignorada.
    releaseStale(journey(ANA, 'Ana Souza', 999))
    await new Promise((r) => setTimeout(r, 0))
    expect(totalsText()).toContain('1 h 15 min')
    expect(screen.getByTestId('jornada-resumo-colaboradores')).toBeTruthy()
  })
})
