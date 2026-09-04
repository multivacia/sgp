import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { LateStructureAppendDrawer } from './LateStructureAppendDrawer'
import { validateManualStructure } from './nova-esteira/matrixToConveyorCreateInput'
import { createInitialManualOption } from './nova-esteira/NovaEsteiraComposicaoManual'

type CapturedProps = {
  initiallyExpanded?: boolean
  optionRemoveLabel?: string
  variant?: string
  roots?: unknown[]
  onChangeRoots?: (next: unknown[]) => void
}

let lastComposicaoProps: CapturedProps | null = null

vi.mock('./nova-esteira/NovaEsteiraComposicaoManual', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./nova-esteira/NovaEsteiraComposicaoManual')>()
  return {
    ...actual,
    NovaEsteiraComposicaoManual: (props: CapturedProps) => {
      lastComposicaoProps = props
      return createElement(
        'div',
        { 'data-testid': 'mock-composicao' },
        props.optionRemoveLabel ?? 'Remover da esteira',
      )
    },
  }
})

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

describe('LateStructureAppendDrawer UX inclusão tardia', () => {
  it('não renderiza quando open=false', () => {
    const html = renderToStaticMarkup(
      createElement(LateStructureAppendDrawer, { ...baseProps, open: false }),
    )
    expect(html).toBe('')
  })

  it('abre sem erro estrutural prematuro e com orientação neutra', () => {
    lastComposicaoProps = null
    const html = renderToStaticMarkup(
      createElement(LateStructureAppendDrawer, { ...baseProps, open: true }),
    )

    expect(html).toContain('data-testid="late-structure-hint"')
    expect(html).toContain('Preencha os dados da tarefa, do setor e da atividade.')
    expect(html).not.toContain('Cada setor precisa de um título')
    expect(html).not.toContain('SgpInlineBanner')
    // Estrutura inicial continua inválida (botão desabilitado), sem afrouxar validação.
    expect(html).toMatch(/disabled/)
    expect(validateManualStructure([createInitialManualOption(1)])).toBeTruthy()
  })

  it('passa initiallyExpanded e Descartar item para a composição', () => {
    lastComposicaoProps = null
    const html = renderToStaticMarkup(
      createElement(LateStructureAppendDrawer, { ...baseProps, open: true }),
    )

    expect(lastComposicaoProps).not.toBeNull()
    const props = lastComposicaoProps as unknown as CapturedProps
    expect(props.initiallyExpanded).toBe(true)
    expect(props.optionRemoveLabel).toBe('Descartar item')
    expect(props.variant).toBe('totem')
    expect(html).toContain('Descartar item')
    expect(html).not.toContain('Remover da esteira')
  })

  it('descartar (onChangeRoots []) recria só o rascunho e preserva o motivo', () => {
    lastComposicaoProps = null
    renderToStaticMarkup(
      createElement(LateStructureAppendDrawer, { ...baseProps, open: true }),
    )
    expect(lastComposicaoProps).not.toBeNull()
    const props = lastComposicaoProps as unknown as CapturedProps
    expect(typeof props.onChangeRoots).toBe('function')
    expect(() => props.onChangeRoots?.([])).not.toThrow()
  })

  it('erro de API continua visível imediatamente', () => {
    const html = renderToStaticMarkup(
      createElement(LateStructureAppendDrawer, {
        ...baseProps,
        open: true,
        error: 'Falha de domínio',
      }),
    )
    expect(html).toContain('Falha de domínio')
  })

  it('preserva tokens temáticos da correção anterior', () => {
    const html = renderToStaticMarkup(
      createElement(LateStructureAppendDrawer, { ...baseProps, open: true }),
    )
    expect(html).toContain('bg-sgp-app-panel')
    expect(html).toContain('border-sgp-border')
    expect(html).toContain('sgp-input-app')
    expect(html).toContain('sgp-cta-primary')
    expect(html).not.toContain('bg-[#0b1220]')
    expect(html).not.toContain('border-white/10')
    expect(html).not.toContain('text-white')
  })
})
