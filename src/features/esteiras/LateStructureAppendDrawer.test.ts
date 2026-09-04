import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { LateStructureAppendDrawer } from './LateStructureAppendDrawer'

vi.mock('./nova-esteira/NovaEsteiraComposicaoManual', () => ({
  createInitialManualOption: (orderIndex: number) => ({
    key: `opt-${orderIndex}`,
    titulo: '',
    orderIndex,
    areas: [
      {
        key: `area-${orderIndex}`,
        titulo: '',
        orderIndex: 1,
        steps: [
          {
            key: `step-${orderIndex}`,
            titulo: '',
            orderIndex: 1,
            plannedMinutes: 0,
            required: true,
          },
        ],
      },
    ],
  }),
  NovaEsteiraComposicaoManual: () =>
    createElement('div', { 'data-testid': 'mock-composicao' }, 'composicao'),
}))

const baseProps = {
  busy: false,
  colabList: [],
  colabLoading: false,
  colabError: null,
  teamList: [],
  teamLoading: false,
  teamError: null,
  onCancel: () => {},
  onConfirm: () => {},
}

describe('LateStructureAppendDrawer tema', () => {
  it('não renderiza quando open=false', () => {
    const html = renderToStaticMarkup(
      createElement(LateStructureAppendDrawer, { ...baseProps, open: false }),
    )
    expect(html).toBe('')
  })

  it('renderiza painel temático sem fundo escuro hexadecimal fixo', () => {
    const html = renderToStaticMarkup(
      createElement(LateStructureAppendDrawer, { ...baseProps, open: true }),
    )

    expect(html).toContain('data-testid="late-structure-append-panel"')
    expect(html).toContain('Incluir novo item')
    expect(html).toContain('bg-sgp-app-panel')
    expect(html).toContain('border-sgp-border')
    expect(html).toContain('text-sgp-muted')
    expect(html).toContain('bg-sgp-surface-muted')
    expect(html).toContain('border-sgp-border-subtle')
    expect(html).not.toContain('bg-[#0b1220]')
    expect(html).not.toContain('border-white/10')
    expect(html).not.toContain('bg-white/[0.03]')
    expect(html).not.toContain('text-white')
    expect(html).not.toContain('text-amber-300')
    expect(html).not.toContain('text-rose-300')
  })

  it('mantém campo de motivo, CTAs e estado desabilitado', () => {
    const html = renderToStaticMarkup(
      createElement(LateStructureAppendDrawer, {
        ...baseProps,
        open: true,
        busy: true,
      }),
    )

    expect(html).toContain('sgp-input-app')
    expect(html).toContain('sgp-cta-secondary')
    expect(html).toContain('sgp-cta-primary')
    expect(html).toContain('Incluindo…')
    expect(html).toContain('disabled')
    expect(html).toContain('placeholder="Descreva o motivo (3 a 500 caracteres)"')
  })

  it('título e descrição usam tipografia temática', () => {
    const html = renderToStaticMarkup(
      createElement(LateStructureAppendDrawer, { ...baseProps, open: true }),
    )

    expect(html).toContain('late-structure-append-title')
    expect(html).toContain('text-[color:var(--semantic-base-fg)]')
    expect(html).toContain('Backlog do Planejamento Semanal')
  })
})
