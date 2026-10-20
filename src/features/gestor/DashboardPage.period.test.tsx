/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { DashboardPage } from './DashboardPage'
import { ColorThemeProvider } from '../../lib/theme/ColorThemeProvider'
import type {
  ExecutiveDashboardData,
  OperationalDashboardData,
} from '../../domain/dashboard/dashboard.types'
import { notifyOperationalDataChanged } from '../../lib/operational/operationalDataEvents'
import { DASHBOARD_DATE_RANGE_STORAGE_KEY } from '../../lib/dashboard/dashboardDateRange'

const mocks = vi.hoisted(() => ({
  fetchOperationalDashboard: vi.fn(),
  fetchExecutiveDashboard: vi.fn(),
}))

vi.mock('../../services/dashboard/dashboardApiService', () => ({
  fetchOperationalDashboard: mocks.fetchOperationalDashboard,
  fetchExecutiveDashboard: mocks.fetchExecutiveDashboard,
}))
vi.mock('../../services/operationalCapacity.service', () => ({
  getCollaboratorCapacityResolved: vi.fn(async () => ({ resolvedDailyMinutes: 480 })),
}))
vi.mock('../../services/conveyors/conveyorsApiService', () => ({
  getConveyorHealthSummary: vi.fn(async () => ({ data: [] })),
}))
const stable = vi.hoisted(() => ({
  auth: { can: () => true, user: { id: 'u-1' }, ready: true },
  errorSurface: { presentBlocking: () => {} },
}))
vi.mock('../../lib/use-auth', () => ({ useAuth: () => stable.auth }))
vi.mock('../../lib/errors/SgpErrorPresentation', () => ({
  useSgpErrorSurface: () => stable.errorSurface,
}))

/** Termos técnicos que não podem aparecer em textos do Dashboard (inclui title/aria-label). */
const TECHNICAL_TERMS = [
  'step',
  'bucket',
  'snapshot',
  'preset',
  'entry_at',
  'completed_at',
  'total_planned_minutes',
  'snapshot_atual',
  'âmbito',
  'premir',
  'registad',
  'janela',
  'recorte executivo',
  'utc',
  '(30d)',
  'últimos 30 dias',
]

function operationalData(minutesInPeriod: number): OperationalDashboardData {
  return {
    meta: { generatedAt: '2026-10-20T15:00:00.000Z', scope: 'snapshot_atual', bucketRule: 'x' },
    conveyorsByBucket: {
      em_elaboracao: 1,
      aguardando_planejamento: 0,
      em_planejamento: 0,
      em_execucao: 3,
      em_atraso: 2,
      finalizadas: 4,
      canceladas: 0,
    },
    overdueHighlight: [],
    assignees: { totalAllocations: 5, primaryAllocations: 3, supportAllocations: 2 },
    plannedVsRealized: {
      plannedMinutesConveyorTotal: 600,
      plannedMinutesStepNodes: 540,
      realizedMinutesTotal: 1200,
      realizedMinutesInPeriod: minutesInPeriod,
      realizedPeriod: { from: 'a', to: 'b', preset: 'custom', startDate: '2026-10-01', endDate: '2026-10-20' },
      notes: 'Tempo previsto das atividades: soma das atividades ativas.',
    },
    collaboratorLoad: [
      {
        collaboratorId: 'c-1',
        fullName: 'Tati',
        assignmentCount: 4,
        primaryCount: 2,
        supportCount: 2,
        plannedMinutesOnSteps: 240,
        realizedMinutes: 0,
      },
    ],
    recentTimeEntries: [],
  }
}

function executiveData(completed: number): ExecutiveDashboardData {
  return {
    meta: { generatedAt: '2026-10-20T15:00:00.000Z', completedWithinDays: 20, scope: 'x' },
    totals: { activeConveyors: 6, completedInWindow: completed, overdueConveyors: 2, delayRateVsActive: 0.333 },
    plannedVsRealized: {
      plannedMinutesConveyorTotal: 600,
      plannedMinutesStepNodes: 540,
      realizedMinutesTotal: 1200,
      notes: 'Tempo previsto das atividades: soma das atividades ativas.',
    },
    topOverdueConveyors: [],
  }
}

function renderPage() {
  return render(
    <ColorThemeProvider>
      <MemoryRouter initialEntries={['/app/dashboard']}>
        <DashboardPage />
      </MemoryRouter>
    </ColorThemeProvider>,
  )
}

function lastRange(fn: typeof mocks.fetchOperationalDashboard) {
  return fn.mock.calls.at(-1)?.[0]
}

function visibleTextAndLabels(): string {
  const attrs = [...document.querySelectorAll('[title],[aria-label]')]
    .map((el) => `${el.getAttribute('title') ?? ''} ${el.getAttribute('aria-label') ?? ''}`)
    .join(' ')
  return `${document.body.textContent ?? ''} ${attrs}`.toLowerCase()
}

async function applyPeriod(start: string, end: string) {
  fireEvent.change(screen.getByLabelText('Data inicial'), { target: { value: start } })
  fireEvent.change(screen.getByLabelText('Data final'), { target: { value: end } })
  fireEvent.click(screen.getByRole('button', { name: 'Aplicar período' }))
}

describe('DashboardPage — período único (Data inicial / Data final)', () => {
  beforeEach(() => {
    localStorage.clear()
    mocks.fetchOperationalDashboard.mockReset()
    mocks.fetchExecutiveDashboard.mockReset()
    mocks.fetchOperationalDashboard.mockResolvedValue(operationalData(90))
    mocks.fetchExecutiveDashboard.mockResolvedValue(executiveData(3))
  })
  afterEach(() => cleanup())

  it('sem preferência salva usa 01/10/2026 a 20/10/2026 nas duas consultas', async () => {
    renderPage()
    await screen.findByText(/Horas apontadas no período — 01\/10\/2026 a 20\/10\/2026/)
    const range = { startDate: '2026-10-01', endDate: '2026-10-20' }
    expect(lastRange(mocks.fetchOperationalDashboard)).toEqual(range)
    expect(lastRange(mocks.fetchExecutiveDashboard)).toEqual(range)
    expect(screen.getAllByLabelText('Data inicial')).toHaveLength(1)
    expect(screen.getAllByLabelText('Data final')).toHaveLength(1)
  })

  it('editar não consulta; aplicar consulta as duas visões com o mesmo intervalo e persiste', async () => {
    renderPage()
    await screen.findByText(/Horas apontadas no período — /)
    const calls = mocks.fetchOperationalDashboard.mock.calls.length
    fireEvent.change(screen.getByLabelText('Data inicial'), { target: { value: '2026-09-01' } })
    fireEvent.change(screen.getByLabelText('Data final'), { target: { value: '2026-09-30' } })
    expect(mocks.fetchOperationalDashboard.mock.calls.length).toBe(calls)

    fireEvent.click(screen.getByRole('button', { name: 'Aplicar período' }))
    const range = { startDate: '2026-09-01', endDate: '2026-09-30' }
    await waitFor(() => expect(lastRange(mocks.fetchOperationalDashboard)).toEqual(range))
    expect(lastRange(mocks.fetchExecutiveDashboard)).toEqual(range)
    expect(JSON.parse(localStorage.getItem(DASHBOARD_DATE_RANGE_STORAGE_KEY)!)).toEqual(range)
    await screen.findByText(/Horas apontadas no período — 01\/09\/2026 a 30\/09\/2026/)
  })

  it('Operacional → Gerencial → Operacional e Cards → Gráficos mantêm o período, sem nova consulta', async () => {
    renderPage()
    await screen.findByText(/Horas apontadas no período — /)
    await applyPeriod('2026-09-01', '2026-09-30')
    await screen.findByText(/Horas apontadas no período — 01\/09\/2026 a 30\/09\/2026/)
    const opCalls = mocks.fetchOperationalDashboard.mock.calls.length
    const exCalls = mocks.fetchExecutiveDashboard.mock.calls.length

    fireEvent.click(screen.getByRole('tab', { name: 'Gerencial' }))
    expect(await screen.findByText('Esteiras concluídas — 01/09/2026 a 30/09/2026')).toBeTruthy()
    expect((screen.getByLabelText('Data inicial') as HTMLInputElement).value).toBe('2026-09-01')

    fireEvent.click(screen.getByRole('tab', { name: 'Operacional' }))
    await screen.findByText(/Horas apontadas no período — 01\/09\/2026 a 30\/09\/2026/)

    fireEvent.click(screen.getByRole('radio', { name: 'Gráficos' }))
    expect(await screen.findByText(/situação atual, exceto as horas apontadas no período \(\s*01\/09\/2026 a 30\/09\/2026\)/)).toBeTruthy()
    fireEvent.click(screen.getByRole('tab', { name: 'Gerencial' }))
    expect((await screen.findAllByText(/01\/09\/2026 a 30\/09\/2026/)).length).toBeGreaterThan(0)
    expect((screen.getByLabelText('Data final') as HTMLInputElement).value).toBe('2026-09-30')

    expect(mocks.fetchOperationalDashboard.mock.calls.length).toBe(opCalls)
    expect(mocks.fetchExecutiveDashboard.mock.calls.length).toBe(exCalls)
  })

  it('recarregar a página recupera o período salvo (e ignora as preferências antigas)', async () => {
    localStorage.setItem('sgp.dashboard.executiveWindowDays', '90')
    localStorage.setItem(
      DASHBOARD_DATE_RANGE_STORAGE_KEY,
      JSON.stringify({ startDate: '2026-08-01', endDate: '2026-08-31' }),
    )
    renderPage()
    await screen.findByText(/Horas apontadas no período — 01\/08\/2026 a 31\/08\/2026/)
    expect(lastRange(mocks.fetchExecutiveDashboard)).toEqual({ startDate: '2026-08-01', endDate: '2026-08-31' })
  })

  it('resposta de um período antigo não sobrescreve a do período mais recente', async () => {
    let resolveOld!: (v: OperationalDashboardData) => void
    mocks.fetchOperationalDashboard.mockReset()
    mocks.fetchOperationalDashboard
      .mockReturnValueOnce(new Promise((res) => (resolveOld = res)))
      .mockResolvedValueOnce(operationalData(30))
    renderPage()
    await applyPeriod('2026-09-01', '2026-09-30')
    expect((await screen.findAllByText('30 min')).length).toBeGreaterThan(0)
    await act(async () => {
      resolveOld(operationalData(999))
    })
    expect(screen.queryAllByText('16 h 39 min')).toHaveLength(0)
    expect(screen.getAllByText('30 min').length).toBeGreaterThan(0)
    expect(screen.getByText(/Horas apontadas no período — 01\/09\/2026 a 30\/09\/2026/)).toBeTruthy()
  })

  it('Atualizar e a atualização automática (apontamento) reconsultam com o período aplicado', async () => {
    renderPage()
    await screen.findByText(/Horas apontadas no período — /)
    await applyPeriod('2026-09-01', '2026-09-30')
    await screen.findByText(/Horas apontadas no período — 01\/09\/2026 a 30\/09\/2026/)
    const range = { startDate: '2026-09-01', endDate: '2026-09-30' }

    mocks.fetchOperationalDashboard.mockClear()
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar' }))
    await waitFor(() => expect(mocks.fetchOperationalDashboard).toHaveBeenCalledWith(range))

    mocks.fetchExecutiveDashboard.mockClear()
    await act(async () => {
      notifyOperationalDataChanged('time_entry_created')
    })
    await waitFor(() => expect(mocks.fetchExecutiveDashboard).toHaveBeenCalledWith(range))
  })

  it('detalhamento das concluídas abre o painel de esteiras com o mesmo período', async () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)
    renderPage()
    await screen.findByText(/Horas apontadas no período — /)
    fireEvent.click(screen.getByRole('tab', { name: 'Gerencial' }))
    fireEvent.click(
      await screen.findByRole('button', {
        name: /esteiras concluídas de 01\/10\/2026 a 20\/10\/2026/,
      }),
    )
    const url = new URL(String(open.mock.calls[0]?.[0]))
    expect(url.searchParams.get('situacao')).toBe('finalizadas')
    expect(url.searchParams.get('completedFrom')).toBe('2026-10-01')
    expect(url.searchParams.get('completedTo')).toBe('2026-10-20')
    expect(url.searchParams.has('days')).toBe(false)
    open.mockRestore()
  })

  it('nenhum termo técnico visível nas duas visões e nos dois modos', async () => {
    renderPage()
    await screen.findByText(/Horas apontadas no período — /)
    const check = () => {
      const text = visibleTextAndLabels()
      expect(TECHNICAL_TERMS.filter((t) => text.includes(t))).toEqual([])
    }
    check()
    fireEvent.click(screen.getByRole('tab', { name: 'Gerencial' }))
    await screen.findByText(/Esteiras concluídas — /)
    check()
    fireEvent.click(screen.getByRole('radio', { name: 'Gráficos' }))
    expect((await screen.findAllByText(/Período de análise/)).length).toBeGreaterThan(0)
    check()
    fireEvent.click(screen.getByRole('tab', { name: 'Operacional' }))
    await screen.findByText(/exceto as horas apontadas no período/)
    check()
  })

  it('erro ao carregar mostra mensagem padrão em português', async () => {
    mocks.fetchOperationalDashboard.mockRejectedValue(new Error('rede'))
    renderPage()
    expect(await screen.findByText('Não foi possível atualizar o Dashboard. Tente novamente.')).toBeTruthy()
  })
})
