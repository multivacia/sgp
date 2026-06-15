import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { BacklogFilters } from './BacklogFilters'

describe('BacklogFilters', () => {
  it('mantém filtros principais visíveis no Painel Operacional', () => {
    const html = renderToStaticMarkup(
      createElement(BacklogFilters, {
        search: '',
        onSearchChange: () => {},
        statusFilter: '',
        onStatusChange: () => {},
        priorityFilter: '',
        onPriorityChange: () => {},
        responsibleFilter: '',
        onResponsibleChange: () => {},
        responsibleOptions: ['Carlos', 'Marcos'],
        pageSize: 25,
        onPageSizeChange: () => {},
      }),
    )

    expect(html).toContain('Buscar')
    expect(html).toContain('Situação')
    expect(html).toContain('Prioridade')
    expect(html).toContain('Responsável')
    expect(html).toContain('Por página')
    expect(html).toContain('Mais filtros (em breve)')
    expect(html).not.toContain('ARGOS:')
    expect(html).not.toContain('Sem análise ARGOS')
  })
})
