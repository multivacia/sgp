/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ColorThemeContext } from '../../lib/theme/theme-context'
import type { ColorThemeId } from '../../lib/theme/theme-constants'
import { HelpMenu } from './HelpMenu'

const auth = vi.hoisted(() => ({ permissions: ['conveyors.create'] as string[] }))
vi.mock('../../lib/use-auth', () => ({
  useAuth: () => ({
    canAny: (codes: string[]) => codes.some((c) => auth.permissions.includes(c)),
  }),
}))

afterEach(() => {
  cleanup()
  auth.permissions = ['conveyors.create']
})

function renderMenu(opts: { themeId?: ColorThemeId } = {}) {
  return render(
    <ColorThemeContext.Provider
      value={{ themeId: opts.themeId ?? 'argos-dark', setThemeId: () => {} }}
    >
      <button type="button">fora</button>
      <HelpMenu />
    </ColorThemeContext.Provider>,
  )
}

const trigger = () => screen.getByRole('button', { name: 'Ajuda' })

describe('HelpMenu (release main: só Guias Práticos)', () => {
  it('abre só com os Guias Práticos, na ordem', () => {
    renderMenu()
    expect(screen.queryByRole('menu')).toBeNull()
    fireEvent.click(trigger())
    const labels = screen.getAllByRole('menuitem').map((i) => i.textContent)
    expect(labels).toEqual(['Guia prático do colaborador', 'Guia prático do gestor'])
    expect(trigger().getAttribute('aria-expanded')).toBe('true')
  })

  it('não oferece Manual do Usuário nem ajuda contextual (fora desta release)', () => {
    renderMenu()
    fireEvent.click(trigger())
    expect(screen.queryByRole('menuitem', { name: /Manual do usuário/ })).toBeNull()
    expect(screen.queryByRole('menuitem', { name: /Como usar esta tela/ })).toBeNull()
    for (const item of screen.getAllByRole('menuitem')) {
      expect(item.getAttribute('href')).not.toContain('manual-usuario')
    }
  })

  it('Guias Práticos abrem dentro do SGP+ com o tema atual', () => {
    renderMenu({ themeId: 'light-executive' })
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

  it('perfil sem permissão de gestão não vê o guia do gestor', () => {
    auth.permissions = []
    renderMenu()
    fireEvent.click(trigger())
    const labels = screen.getAllByRole('menuitem').map((i) => i.textContent)
    expect(labels).toEqual(['Guia prático do colaborador'])
  })

  it('Esc fecha e devolve o foco ao botão', () => {
    renderMenu()
    fireEvent.click(trigger())
    const first = screen.getAllByRole('menuitem')[0]
    expect(document.activeElement).toBe(first)
    fireEvent.keyDown(first, { key: 'Escape' })
    expect(screen.queryByRole('menu')).toBeNull()
    expect(document.activeElement).toBe(trigger())
  })

  it('setas percorrem os itens e clique fora fecha', () => {
    renderMenu()
    fireEvent.click(trigger())
    const items = screen.getAllByRole('menuitem')
    fireEvent.keyDown(items[0], { key: 'ArrowDown' })
    expect(document.activeElement).toBe(items[1])
    fireEvent.keyDown(items[1], { key: 'ArrowDown' })
    expect(document.activeElement).toBe(items[0])
    fireEvent.keyDown(items[0], { key: 'End' })
    expect(document.activeElement).toBe(items[1])
    fireEvent.mouseDown(screen.getByText('fora'))
    expect(screen.queryByRole('menu')).toBeNull()
  })
})
