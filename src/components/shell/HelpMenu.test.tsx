/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ColorThemeContext } from '../../lib/theme/theme-context'
import type { ColorThemeId } from '../../lib/theme/theme-constants'
import { HelpMenu } from './HelpMenu'

afterEach(cleanup)

function renderMenu(opts: {
  path: string
  themeId?: ColorThemeId
  onOpenSupportTicket?: () => void
}) {
  return render(
    <ColorThemeContext.Provider
      value={{ themeId: opts.themeId ?? 'argos-dark', setThemeId: () => {} }}
    >
      <MemoryRouter initialEntries={[opts.path]}>
        <button type="button">fora</button>
        <HelpMenu onOpenSupportTicket={opts.onOpenSupportTicket} />
      </MemoryRouter>
    </ColorThemeContext.Provider>,
  )
}

const trigger = () => screen.getByRole('button', { name: 'Ajuda' })

describe('HelpMenu', () => {
  it('abre com os itens na ordem e só mostra "Abrir chamado" quando disponível', () => {
    renderMenu({ path: '/app/backlog', onOpenSupportTicket: () => {} })
    expect(screen.queryByRole('menu')).toBeNull()
    fireEvent.click(trigger())
    const labels = screen.getAllByRole('menuitem').map((i) => i.textContent)
    expect(labels[0]).toContain('Como usar esta tela')
    expect(labels[1]).toBe('Manual do usuário')
    expect(labels[2]).toBe('Guia prático do colaborador')
    expect(labels[3]).toBe('Guia prático do gestor')
    expect(labels[4]).toBe('Abrir chamado')
    expect(trigger().getAttribute('aria-expanded')).toBe('true')
  })

  it('omite "Abrir chamado" quando o módulo não está disponível', () => {
    renderMenu({ path: '/app/backlog' })
    fireEvent.click(trigger())
    expect(screen.getAllByRole('menuitem')).toHaveLength(4)
  })

  it('Guias Práticos abrem dentro do SGP+ com o tema atual', () => {
    renderMenu({ path: '/app/backlog', themeId: 'light-executive' })
    fireEvent.click(trigger())
    expect(
      screen
        .getByRole('menuitem', { name: 'Guia prático do colaborador' })
        .getAttribute('href'),
    ).toBe('/manual/colaborador.html?integrado=1&tema=claro')
    expect(
      screen
        .getByRole('menuitem', { name: 'Guia prático do gestor' })
        .getAttribute('href'),
    ).toBe('/manual/gestor-esteira.html?integrado=1&tema=claro')
  })

  it('"Como usar esta tela" leva à âncora da tela, com tema e modo integrado', () => {
    renderMenu({ path: '/app/esteiras/e-1', themeId: 'light-executive' })
    fireEvent.click(trigger())
    const link = screen.getByRole('menuitem', { name: /Como usar esta tela/ })
    expect(link.getAttribute('href')).toBe(
      '/manual/manual-usuario.html?integrado=1&tema=claro#cap-6-6-2-ler-o-detalhe-de-uma-esteira',
    )
    expect(
      screen.getByRole('menuitem', { name: 'Manual do usuário' }).getAttribute('href'),
    ).toBe('/manual/manual-usuario.html?integrado=1&tema=claro')
  })

  it('tela sem capítulo desabilita só o item contextual, com motivo acessível', () => {
    renderMenu({ path: '/app/minhas-atividades' })
    fireEvent.click(trigger())
    const item = screen.getByRole('menuitem', { name: /Como usar esta tela/ })
    expect(item.getAttribute('aria-disabled')).toBe('true')
    expect(item.getAttribute('href')).toBeNull()
    expect(item.textContent).toContain('não tem entrada no menu')
    expect(
      screen.getByRole('menuitem', { name: 'Manual do usuário' }).getAttribute('href'),
    ).toContain('/manual/manual-usuario.html')
  })

  it('Esc fecha e devolve o foco ao botão', () => {
    renderMenu({ path: '/app/backlog' })
    fireEvent.click(trigger())
    const first = screen.getAllByRole('menuitem')[0]
    expect(document.activeElement).toBe(first)
    fireEvent.keyDown(first, { key: 'Escape' })
    expect(screen.queryByRole('menu')).toBeNull()
    expect(document.activeElement).toBe(trigger())
  })

  it('setas percorrem os itens e clique fora fecha', () => {
    renderMenu({ path: '/app/backlog', onOpenSupportTicket: () => {} })
    fireEvent.click(trigger())
    const items = screen.getAllByRole('menuitem')
    fireEvent.keyDown(items[0], { key: 'ArrowDown' })
    expect(document.activeElement).toBe(items[1])
    fireEvent.keyDown(items[1], { key: 'End' })
    expect(document.activeElement).toBe(items[4])
    fireEvent.keyDown(items[4], { key: 'ArrowDown' })
    expect(document.activeElement).toBe(items[0])
    fireEvent.mouseDown(screen.getByText('fora'))
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('"Abrir chamado" reaproveita o fluxo existente e fecha o menu', () => {
    const open = vi.fn()
    renderMenu({ path: '/app/backlog', onOpenSupportTicket: open })
    fireEvent.click(trigger())
    fireEvent.click(screen.getByRole('menuitem', { name: 'Abrir chamado' }))
    expect(open).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('menu')).toBeNull()
  })
})
