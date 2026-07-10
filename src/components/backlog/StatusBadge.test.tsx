import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { StatusBadge, normalizeBacklogStatusValue } from './StatusBadge'

describe('StatusBadge', () => {
  it('renderiza o badge de planejamento com label e classes literais esperadas', () => {
    const html = renderToStaticMarkup(<StatusBadge status="em_planejamento" />)

    expect(html).toContain('Em planejamento')
    expect(html).toContain('border-amber-400')
    expect(html).toContain('bg-amber-100')
    expect(html).toContain('text-amber-900')
    expect(html).toContain('ring-amber-300')
    expect(html).toContain('data-backlog-status="em_planejamento"')
    expect(html).toContain('data-backlog-status-raw="em_planejamento"')
  })

  it('normaliza status bruto em caixa alta sem deixar o badge vazio', () => {
    const html = renderToStaticMarkup(<StatusBadge status="EM_PLANEJAMENTO" />)

    expect(normalizeBacklogStatusValue('EM_PLANEJAMENTO')).toBe('em_planejamento')
    expect(html).toContain('Em planejamento')
    expect(html).toContain('data-backlog-status="em_planejamento"')
    expect(html).toContain('data-backlog-status-raw="EM_PLANEJAMENTO"')
    expect(html).toContain('border-amber-400')
  })

  it('mantem label de fallback visivel quando recebe status desconhecido', () => {
    const html = renderToStaticMarkup(<StatusBadge status="PLANNING" />)

    expect(normalizeBacklogStatusValue('PLANNING')).toBeNull()
    expect(html).toContain('PLANNING')
    expect(html).toContain('data-backlog-status="status_desconhecido"')
    expect(html).toContain('border-slate-400')
  })
})
