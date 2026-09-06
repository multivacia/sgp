import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { KioskOutraAtividadeFlow } from './KioskOutraAtividadeFlow'
import type { ProductionCollaboratorSummary } from '../../domain/production/production.types'

const collaborator: ProductionCollaboratorSummary = {
  id: 'col-1',
  fullName: 'Maria Silva',
  name: 'Maria Silva',
  displayName: 'Maria Silva',
  avatarUrl: null,
  initials: 'MS',
  productionCredentialStatus: 'READY',
}

describe('KioskOutraAtividadeFlow', () => {
  it('renderiza o cabeçalho, aviso e busca da fase inicial (form)', () => {
    const html = renderToStaticMarkup(
      createElement(KioskOutraAtividadeFlow, {
        collaborator,
        onClose: () => {},
        onSuccess: () => {},
      }),
    )

    expect(html).toContain('Atividade em que não estou alocado')
    expect(html).toContain('Maria Silva')
    expect(html).toContain(
      'Você está apontando horas em uma atividade pela qual não é responsável.',
    )
    expect(html).toContain('Buscar atividade por nome ou código')
    expect(html).toContain('Digite pelo menos 2 caracteres')
    expect(html).toContain('Cancelar')

    // Nada de seleção/minutos/justificativa antes de escolher um candidato.
    expect(html).not.toContain('Tempo trabalhado')
    expect(html).not.toContain('Revisar apontamento')
  })

  it('camada de empilhamento full-screen (fixed inset-0 z-[100]), mesma família do "+Extra"', () => {
    const html = renderToStaticMarkup(
      createElement(KioskOutraAtividadeFlow, {
        collaborator,
        onClose: () => {},
        onSuccess: () => {},
      }),
    )
    expect(html).toContain('fixed inset-0 z-[100]')
  })
})
