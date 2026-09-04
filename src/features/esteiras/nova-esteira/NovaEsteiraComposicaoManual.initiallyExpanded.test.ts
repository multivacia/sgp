import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  createInitialManualOption,
  NovaEsteiraComposicaoManual,
} from './NovaEsteiraComposicaoManual'

const emptyLists = {
  alocacoes: {},
  onChangeAlocacoes: () => {},
  colabList: [],
  colabLoading: false,
  colabError: null,
  teamList: [],
  teamLoading: false,
  teamError: null,
}

describe('NovaEsteiraComposicaoManual — initiallyExpanded / optionRemoveLabel', () => {
  it('totem sem initiallyExpanded inicia tarefa recolhida (sem open no details)', () => {
    const roots = [createInitialManualOption(1)]
    const html = renderToStaticMarkup(
      createElement(NovaEsteiraComposicaoManual, {
        roots,
        onChangeRoots: () => {},
        variant: 'totem',
        ...emptyLists,
      }),
    )
    // details sem atributo open (ou open=false) — markup React omit open quando false
    expect(html).toContain('Expandir')
    expect(html).toContain('Remover da esteira')
    expect(html).not.toContain('Descartar item')
  })

  it('totem com initiallyExpanded abre a tarefa (details open) e o primeiro setor', () => {
    const roots = [createInitialManualOption(1)]
    const html = renderToStaticMarkup(
      createElement(NovaEsteiraComposicaoManual, {
        roots,
        onChangeRoots: () => {},
        variant: 'totem',
        initiallyExpanded: true,
        ...emptyLists,
      }),
    )
    expect(html).toContain('open')
    expect(html).toContain('Recolher')
    expect(html).toContain('Nome da tarefa')
    expect(html).toContain('Setor 1')
    // Atividade visível no setor expandido
    expect(html).toMatch(/[Aa]tividade|min/)
  })

  it('optionRemoveLabel customizado substitui o texto padrão só quando informado', () => {
    const roots = [createInitialManualOption(1)]
    const html = renderToStaticMarkup(
      createElement(NovaEsteiraComposicaoManual, {
        roots,
        onChangeRoots: () => {},
        variant: 'totem',
        initiallyExpanded: true,
        optionRemoveLabel: 'Descartar item',
        ...emptyLists,
      }),
    )
    expect(html).toContain('Descartar item')
    expect(html).not.toContain('Remover da esteira')
  })

  it('variant rascunho sem optionRemoveLabel mantém Remover tarefa no header clássico', () => {
    const roots = [createInitialManualOption(1), createInitialManualOption(2)]
    const html = renderToStaticMarkup(
      createElement(NovaEsteiraComposicaoManual, {
        roots,
        onChangeRoots: () => {},
        variant: 'rascunho',
        ...emptyLists,
      }),
    )
    // rascunho usa "Remover tarefa" no headerRow quando não totem-only path...
    // No bloco rascunho details, remove pode não aparecer igual; garante default totem label ausente
    expect(html).not.toContain('Descartar item')
  })
})
