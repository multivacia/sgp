/** @vitest-environment jsdom */
// Navegador fora de SP (Tóquio, UTC+9) para provar que a data exibida é a de São Paulo.

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { JornadaPage } from './JornadaPage'
import type { OperationalJourneyData } from '../../domain/operational-journey/operational-journey.types'

vi.stubEnv('TZ', 'Asia/Tokyo')

const { fetchMyOperationalJourney } = vi.hoisted(() => ({ fetchMyOperationalJourney: vi.fn() }))
vi.mock('../../services/operational-journey/operationalJourneyApiService', () => ({
  fetchMyOperationalJourney,
}))

const journey = {
  meta: { semanticsVersion: '1.5' },
  collaborator: { id: 'c-1', fullName: 'Maria' },
  period: { from: '2026-09-01T03:00:00.000Z', to: '2026-09-28T15:00:00.000Z' },
  query: { limit: 20, conveyorId: null, periodPreset: 'custom' },
  load: { assignmentCount: 0, plannedMinutesOnStepsSum: 0 },
  coberturaTempo: {
    ratio: null,
    previstoMinutosEscopo: 0,
    realizadoMinutosAcumuladoEscopo: 0,
    formula: '',
  },
  execution: { realizedMinutesInPeriod: 45, realizedMinutesTotal: 45 },
  extraTimeEntriesSummary: { totalMinutes: 0, entriesCount: 0, topDescriptions: [] },
  risk: {
    byBucket: {
      em_elaboracao: 0,
      aguardando_planejamento: 0,
      em_planejamento: 0,
      em_execucao: 0,
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
      conveyorId: 'conv-1',
      conveyorName: 'OS-1000',
      stepNodeId: 'step-1',
      stepName: 'Costurar banco',
      minutes: 45,
      // retroativo: 27/09 12:00 em SP (convenção) = 28/09 00:00 em Tóquio
      entryAt: '2026-09-27T15:00:00.000Z',
      notes: null,
      entryOrigin: 'ASSIGNED',
      exceptionJustification: null,
      isOutOfSequence: false,
      outOfSequenceJustification: null,
    },
  ],
} as unknown as OperationalJourneyData

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('JornadaPage — histórico e período', () => {
  it('histórico mostra só a data de realização (dia de SP), sem horário', async () => {
    fetchMyOperationalJourney.mockResolvedValue(journey)
    render(
      <MemoryRouter initialEntries={['/app/jornada?periodPreset=custom&periodFrom=2026-09-01&periodTo=2026-09-28']}>
        <JornadaPage />
      </MemoryRouter>,
    )
    expect(await screen.findByText('27/09/2026')).toBeTruthy()
    expect(screen.queryByText(/28\/09\/2026/)).toBeNull()
    expect(screen.queryByText(/12:00|00:00:00/)).toBeNull()
  })

  it('intervalo personalizado é enviado com limites do dia em SP (não UTC)', async () => {
    fetchMyOperationalJourney.mockResolvedValue(journey)
    render(
      <MemoryRouter initialEntries={['/app/jornada?periodPreset=custom&periodFrom=2026-09-01&periodTo=2026-09-30']}>
        <JornadaPage />
      </MemoryRouter>,
    )
    await waitFor(() => expect(fetchMyOperationalJourney).toHaveBeenCalled())
    expect(fetchMyOperationalJourney).toHaveBeenCalledWith(
      expect.objectContaining({
        periodPreset: 'custom',
        from: '2026-09-01T00:00:00.000-03:00',
        to: '2026-09-30T23:59:59.999-03:00',
      }),
    )
  })
})
