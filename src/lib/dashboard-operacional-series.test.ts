import { describe, expect, it, beforeEach } from 'vitest'
import { __resetApontamentosRuntimeForTests } from '../mocks/apontamentos-repository'
import { __resetGestaoOverridesForTests } from '../mocks/esteira-gestao-runtime'
import {
  __resetMaterializacoesRegistryForTests,
} from '../mocks/esteira-materializada-registry'
import { __resetRuntimeEsteirasExtrasForTests } from '../mocks/runtime-esteiras'
import {
  aplicarFiltrosDashboard,
  buildDashboardOperacional,
} from '../mocks/dashboard-operacional'
import { BACKLOG_MOCK_ROWS } from '../mocks/backlog'
import {
  dashSeriesAtividadesPorStatus,
  dashSeriesEntradaPorStatusBacklog,
  dashSeriesEsteirasPorStatus,
  dashSeriesResponsaveisAtividades,
  dashSeriesResponsaveisMinutosApontados,
  ORDER_BACKLOG_STATUS,
  somaSerie,
} from './dashboard-operacional-series'

describe('dashboard-operacional-series', () => {
  beforeEach(() => {
    __resetApontamentosRuntimeForTests()
    __resetGestaoOverridesForTests()
    __resetMaterializacoesRegistryForTests()
    __resetRuntimeEsteirasExtrasForTests()
  })

  it('entrada por status backlog: soma da série = totalLinhas do KPI', () => {
    const dash = buildDashboardOperacional({ backlogRows: BACKLOG_MOCK_ROWS })
    const s = dashSeriesEntradaPorStatusBacklog(dash)
    expect(somaSerie(s)).toBe(dash.kpis.entrada.totalLinhas)
    for (const row of s) {
      expect(row.value).toBe(
        dash.kpis.entrada.porStatusBacklog[
          row.key as keyof typeof dash.kpis.entrada.porStatusBacklog
        ] ?? 0,
      )
    }
    expect(s.map((x) => x.key)).toEqual(ORDER_BACKLOG_STATUS)
  })

  it('esteiras por status: soma da série = totalEsteiras do KPI', () => {
    const dash = buildDashboardOperacional({ backlogRows: BACKLOG_MOCK_ROWS })
    const s = dashSeriesEsteirasPorStatus(dash)
    expect(somaSerie(s)).toBe(dash.kpis.operacao.totalEsteiras)
    for (const row of s) {
      expect(row.value).toBe(
        dash.kpis.operacao.esteirasPorStatusGeral[
          row.key as keyof typeof dash.kpis.operacao.esteirasPorStatusGeral
        ],
      )
    }
  })

  it('atividades por status: soma da série = totalAtividades do KPI', () => {
    const dash = buildDashboardOperacional({ backlogRows: BACKLOG_MOCK_ROWS })
    const s = dashSeriesAtividadesPorStatus(dash)
    expect(somaSerie(s)).toBe(dash.kpis.operacao.totalAtividades)
    for (const row of s) {
      expect(row.value).toBe(
        dash.kpis.operacao.atividadesPorStatus[
          row.key as keyof typeof dash.kpis.operacao.atividadesPorStatus
        ],
      )
    }
  })

  it('responsáveis: somas batem com totais da jornada agregada', () => {
    const dash = buildDashboardOperacional({ backlogRows: BACKLOG_MOCK_ROWS })
    const sa = dashSeriesResponsaveisAtividades(dash)
    const sm = dashSeriesResponsaveisMinutosApontados(dash)
    expect(somaSerie(sa)).toBe(dash.blocoResponsaveis.agregado.totais.atividades)
    expect(somaSerie(sm)).toBe(
      dash.blocoResponsaveis.agregado.totais.minutosApontados,
    )
    const por = dash.blocoResponsaveis.agregado.porResponsavel
    expect(sa.length).toBe(por.length)
    for (let i = 0; i < por.length; i++) {
      expect(sa[i].value).toBe(por[i].quantidadeAtividades)
      expect(sm[i].value).toBe(por[i].minutosApontados)
    }
  })

  it('filtro único: série reflete o mesmo snapshot filtrado que os cards', () => {
    const base = buildDashboardOperacional({ backlogRows: BACKLOG_MOCK_ROWS })
    const dash = aplicarFiltrosDashboard(base, { statusEsteira: 'em_execucao' })
    const s = dashSeriesEsteirasPorStatus(dash)
    expect(somaSerie(s)).toBe(dash.kpis.operacao.totalEsteiras)
    expect(dash.kpis.operacao.esteirasPorStatusGeral.em_execucao).toBe(
      dash.kpis.operacao.totalEsteiras,
    )
  })

  it('recorte sem resultado operacional: séries vazias ou totais zero', () => {
    const base = buildDashboardOperacional({ backlogRows: BACKLOG_MOCK_ROWS })
    const dash = aplicarFiltrosDashboard(base, {
      buscaTexto: '___nada_deve_bater_esse_texto___',
    })
    expect(dash.kpis.operacao.totalEsteiras).toBe(0)
    const se = dashSeriesEsteirasPorStatus(dash)
    const sa = dashSeriesAtividadesPorStatus(dash)
    expect(somaSerie(se)).toBe(0)
    expect(somaSerie(sa)).toBe(0)
    expect(dash.blocoResponsaveis.agregado.porResponsavel.length).toBe(0)
    expect(dashSeriesResponsaveisAtividades(dash)).toEqual([])
  })
})
