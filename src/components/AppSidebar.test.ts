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
})
