/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { KioskCollaboratorGrid } from './KioskCollaboratorGrid'
import type { ProductionCollaboratorSummary } from '../../domain/production/production.types'

const { listProductionCollaboratorsMock } = vi.hoisted(() => ({
  listProductionCollaboratorsMock: vi.fn(),
}))

vi.mock('../../services/production/productionApiService', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../services/production/productionApiService')>()
  return {
    ...actual,
    listProductionCollaborators: listProductionCollaboratorsMock,
  }
})

function collab(partial: Partial<ProductionCollaboratorSummary>): ProductionCollaboratorSummary {
  return {
    id: 'c-1',
    fullName: 'Maria Silva',
    name: 'Maria',
    displayName: 'Maria',
    avatarUrl: null,
    initials: 'MS',
    productionCredentialStatus: 'READY',
    ...partial,
  }
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('KioskCollaboratorGrid — rolagem mobile/tablet', () => {
  it('root limita altura com h-full + min-h-0; header fora do scroll', async () => {
    listProductionCollaboratorsMock.mockResolvedValue({
      items: [collab({ id: '1', fullName: 'Ana' }), collab({ id: '2', fullName: 'Bruno' })],
    })

    const { container } = render(<KioskCollaboratorGrid onSelect={() => {}} />)
    await waitFor(() => expect(screen.getByText('Ana')).toBeTruthy())

    const root = container.firstElementChild as HTMLElement
    expect(root.className).toMatch(/\bh-full\b/)
    expect(root.className).toMatch(/\bmin-h-0\b/)
    expect(root.className).toMatch(/\bflex\b/)
    expect(root.className).toMatch(/\bflex-col\b/)
    expect(root.className).toMatch(/\boverflow-hidden\b/)

    expect(screen.getByRole('heading', { name: 'Quem é você?' })).toBeTruthy()
    const scroll = screen.getByTestId('kiosk-collaborator-grid-scroll')
    expect(scroll.contains(screen.getByRole('heading', { name: 'Quem é você?' }))).toBe(
      false,
    )
  })

  it('área dos colaboradores é o container rolável com overflow-y-auto e pan vertical', async () => {
    listProductionCollaboratorsMock.mockResolvedValue({
      items: [
        collab({ id: '1', fullName: 'Ana' }),
        collab({ id: '2', fullName: 'Bruno' }),
        collab({ id: '3', fullName: 'Catarina' }),
      ],
    })

    render(<KioskCollaboratorGrid onSelect={() => {}} />)
    await waitFor(() => expect(screen.getByText('Catarina')).toBeTruthy())

    const scroll = screen.getByTestId('kiosk-collaborator-grid-scroll')
    expect(scroll.className).toMatch(/\bmin-h-0\b/)
    expect(scroll.className).toMatch(/\bflex-1\b/)
    expect(scroll.className).toMatch(/\boverflow-y-auto\b/)
    expect(scroll.className).toMatch(/\boverscroll-contain\b/)
    expect(scroll.className).toMatch(/\btouch-pan-y\b/)
    expect(scroll.textContent).toMatch(/Catarina/)
  })
})
