import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { SgpContextActionsMenuProvider } from '../shell/SgpContextActionsMenu'
import { BACKLOG_MOCK_ROWS } from '../../mocks/backlog'
import { BacklogTable } from './BacklogTable'

vi.mock('react-router-dom', () => ({
  useNavigate: () => () => {},
}))

vi.mock('../../lib/use-auth', () => ({
  useAuth: () => ({ can: () => true }),
}))

function renderTable(rows = BACKLOG_MOCK_ROWS.slice(0, 2)) {
  return renderToStaticMarkup(
    createElement(
      SgpContextActionsMenuProvider,
      null,
      createElement(BacklogTable, { rows }),
    ),
  )
}

describe('BacklogTable — colunas visíveis no Painel Operacional', () => {
  it('não renderiza coluna Origem', () => {
    const html = renderTable()
    expect(html).not.toMatch(/>\s*Origem\s*</)
  })

  it('não renderiza coluna Atividades', () => {
    const html = renderTable()
    expect(html).not.toMatch(/>\s*Atividades\s*</)
  })

  it('não renderiza coluna ARGOS nem texto Sem análise ARGOS', () => {
    const html = renderTable([
      {
        ...BACKLOG_MOCK_ROWS[0],
        argosSummary: undefined,
      },
    ])
    expect(html).not.toMatch(/>\s*ARGOS\s*</)
    expect(html).not.toContain('Sem análise ARGOS')
  })

  it('mantém colunas Esteira / OS, Responsável, Prioridade, Situação, Entrada e Ações', () => {
    const html = renderTable()
    expect(html).toContain('Esteira / OS')
    expect(html).toContain('Responsável')
    expect(html).toContain('Prioridade')
    expect(html).toContain('Situação')
    expect(html).toContain('Entrada')
    expect(html).toContain('Ações')
  })

  it('continua listando esteiras normalmente', () => {
    const html = renderTable()
    expect(html).toContain('OS ET-001')
    expect(html).toContain('OS ET-002')
    expect(html).toContain('Carlos')
    expect(html).toContain('Marcos')
  })
})
