import { describe, expect, it } from 'vitest'
import { COLABORADOR_NAV_ITEMS, filterShellNavItems } from './app-nav-config'

const canAll = () => true
const canAnyAll = () => true

function colaboradorMenuLabels(supportTicketsEnabled: boolean): string[] {
  return filterShellNavItems(COLABORADOR_NAV_ITEMS, canAll, canAnyAll)
    .filter((item) => !(item.requiresSupportTickets && !supportTicketsEnabled))
    .map((item) => item.label)
}

describe('COLABORADOR_NAV_ITEMS', () => {
  it('exibe Minha fila e Minha jornada', () => {
    const labels = colaboradorMenuLabels(false)
    expect(labels).toContain('Minha fila')
    expect(labels).toContain('Minha jornada')
  })

  it('não exibe Meu Trabalho nem Minhas atividades', () => {
    const labels = colaboradorMenuLabels(false)
    expect(labels).not.toContain('Meu Trabalho')
    expect(labels).not.toContain('Minhas atividades')
  })

  it('exibe Chamados somente quando support tickets está habilitado', () => {
    expect(colaboradorMenuLabels(false)).not.toContain('Chamados')
    expect(colaboradorMenuLabels(true)).toContain('Chamados')
  })

  it('mantém rotas legadas fora do menu', () => {
    const routes = COLABORADOR_NAV_ITEMS.map((item) => item.to)
    expect(routes).not.toContain('/app/meu-trabalho')
    expect(routes).not.toContain('/app/minhas-atividades')
  })
})
