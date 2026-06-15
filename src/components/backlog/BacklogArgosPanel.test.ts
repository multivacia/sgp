import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { buildArgosHealthSummaryOverview } from '../../domain/conveyors/conveyorHealthBacklog'
import { BACKLOG_MOCK_ROWS } from '../../mocks/backlog'
import { BacklogArgosPanel } from './BacklogArgosPanel'

const overview = buildArgosHealthSummaryOverview(BACKLOG_MOCK_ROWS)

describe('BacklogArgosPanel', () => {
  it('não renderiza filtros e resumos ARGOS quando desabilitado na UI', () => {
    const html = renderToStaticMarkup(
      createElement(BacklogArgosPanel, {
        argosFilter: 'all',
        onArgosFilterChange: () => {},
        overview,
      }),
    )

    expect(html).toBe('')
    expect(html).not.toContain('ARGOS: Todas')
    expect(html).not.toContain('ARGOS: Com análise')
    expect(html).not.toContain('ARGOS: Sem análise')
    expect(html).not.toContain('ARGOS: Risco baixo')
    expect(html).not.toContain('ARGOS: Risco médio')
    expect(html).not.toContain('ARGOS: Alto/crítico')
    expect(html).not.toContain('ARGOS: Saúde atenção')
    expect(html).not.toContain('ARGOS: Saúde crítica')
    expect(html).not.toContain('Com análise ARGOS:')
    expect(html).not.toContain('Sem análise ARGOS:')
    expect(html).not.toContain('Em atenção:')
    expect(html).not.toContain('Alto/crítico risco:')
    expect(html).not.toContain('Saudáveis/baixo risco:')
  })
})
