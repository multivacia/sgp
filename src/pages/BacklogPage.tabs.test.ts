import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

let currentSearch = ''

vi.mock('react-router-dom', () => ({
  Link: ({ to, children, className }: { to: string; children: unknown; className?: string }) =>
    createElement('a', { href: to, className }, children as never),
  useLocation: () => ({ pathname: '/app/backlog', search: `?${currentSearch}`, state: null }),
  useNavigate: () => () => {},
  useSearchParams: () => [new URLSearchParams(currentSearch), () => {}],
}))

vi.mock('../lib/use-auth', () => ({
  useAuth: () => ({ can: () => true }),
}))

vi.mock('../lib/api/env', () => ({
  getDataMode: () => 'mock',
}))

vi.mock('../lib/errors/SgpErrorPresentation', () => ({
  useSgpErrorSurface: () => ({ presentBlocking: () => {} }),
}))

vi.mock('../lib/shell/transient-context', () => ({
  useRegisterTransientContext: () => {},
}))

const { BacklogPage } = await import('./BacklogPage')

function renderAt(search: string): string {
  currentSearch = search
  return renderToStaticMarkup(createElement(BacklogPage))
}

describe('BacklogPage — abas Operacional / Histórico', () => {
  it('padrão: abas visíveis, Operacional selecionada, sem aviso da lista combinada', () => {
    const html = renderAt('')
    expect(html).toContain('role="tablist"')
    expect(html).toMatch(/aria-selected="true"[^>]*>Operacional</)
    expect(html).toMatch(/aria-selected="false"[^>]*>Histórico</)
    expect(html).not.toContain('Exibindo Operacional + Histórico')
  })

  it('aba=historico seleciona Histórico e mantém cards e filtros', () => {
    const html = renderAt('aba=historico&scope=ativas')
    expect(html).toMatch(/aria-selected="true"[^>]*>Histórico</)
    expect(html).toContain('Finalizadas')
    expect(html).toContain('Situação')
  })

  it('link situacao=finalizadas&days=N abre a lista combinada com aviso e botão de volta', () => {
    const html = renderAt('situacao=finalizadas&days=30')
    expect(html).toContain('Exibindo Operacional + Histórico')
    expect(html).toContain('Voltar às abas')
    expect(html).not.toContain('role="tablist"')
    // Filtro e janela atuais continuam valendo.
    expect(html).toContain('Janela: 30 dias')
  })

  it('aba=todas (Finalizadas/Canceladas sem days) também mostra o aviso', () => {
    const html = renderAt('aba=todas&situacao=canceladas')
    expect(html).toContain('Exibindo Operacional + Histórico')
  })
})
