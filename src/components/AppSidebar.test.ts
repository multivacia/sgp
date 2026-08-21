import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { AppSidebar } from './AppSidebar'

vi.mock('react-router-dom', () => ({
  NavLink: ({
    children,
    to,
  }: {
    children: React.ReactNode
    to: string
  }) => createElement('a', { href: to }, children),
  useLocation: () => ({ pathname: '/app/backlog', search: '', hash: '' }),
}))

vi.mock('../lib/use-auth', () => ({
  useAuth: () => ({
    can: () => true,
    canAny: () => true,
    user: { permissions: ['*'] },
  }),
}))

vi.mock('../lib/api/env', () => ({
  isSupportTicketsEnabled: () => false,
}))

vi.mock('../lib/shell/shell-function-context', () => ({
  useShellFunction: () => ({ functionId: 'gestor' }),
  pathsWouldChangeForNavigation: () => false,
}))

vi.mock('./AppVersionStamp', () => ({
  AppVersionStamp: ({ placement }: { placement?: string }) =>
    createElement('div', { 'data-version-placement': placement }, 'SGP+ v1.8.4 · Produção'),
}))

describe('AppSidebar', () => {
  it('não renderiza Família ARGOS quando a flag está desligada', () => {
    const html = renderToStaticMarkup(
      createElement(AppSidebar, {
        open: true,
        onClose: () => {},
        collapsed: false,
        onToggleCollapsed: () => {},
      }),
    )

    expect(html).not.toContain('Família ARGOS')
    expect(html).toContain('Sistema de Gestão da Produção')
  })

  it('renderiza badge Novo em Agenda da semana', () => {
    const html = renderToStaticMarkup(
      createElement(AppSidebar, {
        open: true,
        onClose: () => {},
        collapsed: false,
        onToggleCollapsed: () => {},
      }),
    )

    expect(html).toContain('Agenda da semana')
    expect(html).toContain('aria-label="Novo"')
    expect(html).toContain('>Novo<')
  })

  it('menu colaborador exibe Minha fila e Minha jornada sem itens redundantes', () => {
    const html = renderToStaticMarkup(
      createElement(AppSidebar, {
        open: true,
        onClose: () => {},
        collapsed: false,
        onToggleCollapsed: () => {},
      }),
    )

    expect(html).toContain('Minha fila')
    expect(html).toContain('Minha jornada')
    expect(html).not.toContain('Meu Trabalho')
    expect(html).not.toContain('Minhas atividades')
    expect(html).not.toContain('href="/app/meu-trabalho"')
    expect(html).not.toContain('href="/app/minhas-atividades"')
  })

  it('renderiza a versão no rodapé do sidebar expandido', () => {
    const html = renderToStaticMarkup(
      createElement(AppSidebar, {
        open: true,
        onClose: () => {},
        collapsed: false,
        onToggleCollapsed: () => {},
      }),
    )

    expect(html).toContain('SGP+ v1.8.4 · Produção')
    expect(html).toContain('data-version-placement="sidebar"')
  })
})
