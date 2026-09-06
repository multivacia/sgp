import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { KioskActivityCards } from './KioskActivityCards'
import type { ProductionCollaboratorSummary } from '../../domain/production/production.types'

const collaborator: ProductionCollaboratorSummary = {
  id: 'col-1',
  fullName: 'Colaborador Teste',
  name: 'Colaborador Teste',
  displayName: 'Colaborador Teste',
  avatarUrl: null,
  initials: 'CT',
  productionCredentialStatus: 'READY',
}

describe('KioskActivityCards', () => {
  it('header não usa flex-wrap', () => {
    const html = renderToStaticMarkup(
      createElement(KioskActivityCards, {
        collaborator,
        initialItems: [],
        onExit: () => {},
      }),
    )

    expect(html).not.toContain('flex-wrap')
  })
})
