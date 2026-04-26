import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { buildDashboardOperacional } from '../../mocks/dashboard-operacional'
import { BACKLOG_MOCK_ROWS } from '../../mocks/backlog'
import {
  dashSeriesEntradaPorStatusBacklog,
  dashSeriesEsteirasPorStatus,
} from '../../lib/dashboard-operacional-series'
import { DashboardHeroOperacionalGrafico } from './DashboardHeroOperacionalGrafico'

describe('DashboardHeroOperacionalGrafico', () => {
  it('expõe eixo e variante para leitura de modo gráfico', () => {
    const dash = buildDashboardOperacional({ backlogRows: BACKLOG_MOCK_ROWS })
    const html = renderToStaticMarkup(
      createElement(DashboardHeroOperacionalGrafico, {
        eixo: 'entrada',
        title: 'Linhas na fila (entrada)',
        semantica: dash.kpis.entrada.semantica,
        micro: 'Backlog operacional',
        total: dash.kpis.entrada.totalLinhas,
        items: dashSeriesEntradaPorStatusBacklog(dash),
      }),
    )
    expect(html).toContain('data-dashboard-hero="entrada"')
    expect(html).toContain('data-dashboard-hero-variant="grafico"')
  })

  it('usa apenas séries derivadas do dash (sem fonte paralela)', () => {
    const dash = buildDashboardOperacional({ backlogRows: BACKLOG_MOCK_ROWS })
    const html = renderToStaticMarkup(
      createElement(DashboardHeroOperacionalGrafico, {
        eixo: 'operacao',
        title: 'Esteiras com projeção',
        semantica: dash.kpis.operacao.semantica,
        micro: 'Operação viva',
        total: dash.kpis.operacao.totalEsteiras,
        items: dashSeriesEsteirasPorStatus(dash),
      }),
    )
    expect(html).toContain('data-dashboard-hero="operacao"')
  })
})
