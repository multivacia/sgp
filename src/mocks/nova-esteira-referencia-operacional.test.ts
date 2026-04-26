import { describe, expect, it } from 'vitest'
import { buildAtividadesDetalheTarefa } from './nova-esteira-materializacao-detalhe'
import type { TarefaBlocoDraft } from './nova-esteira-domain'
import {
  classificarSemanticaReferenciaNaComposicao,
  getNovaEsteiraReferenciaOperacionalById,
  listarAtividadesOrdenadasDaReferencia,
  referenciaDeclaradaSemAtividades,
} from './nova-esteira-referencia-operacional'

const dadosMin = {
  nome: 'T',
  cliente: '',
  veiculo: '',
  modeloVersao: '',
  placa: 'ABC1D23',
  observacoes: '',
  responsavel: 'R',
  prazoEstimado: '',
  prioridade: 'media' as const,
}

function draftRef(btId: string, over?: Partial<TarefaBlocoDraft>): TarefaBlocoDraft {
  return {
    id: 'tb-x',
    nome: 'Bloco · Pacote',
    ordem: 1,
    setores: ['Desmontagem'],
    atividadesCount: 4,
    estimativaMin: 120,
    sourceBaseTarefaId: btId,
    modoMontagem: 'REFERENCIA',
    ...over,
  }
}

describe('referência operacional (adapter)', () => {
  it('resolve por id e mantém ordem estável do catálogo', () => {
    const op = getNovaEsteiraReferenciaOperacionalById('bt-001')
    expect(op).toBeDefined()
    const atv = listarAtividadesOrdenadasDaReferencia('bt-001')
    expect(atv.map((a) => a.nome)).toEqual([
      'Isolar bateria e airbag',
      'Remover bancos com etiquetagem',
      'Fotografar fixações',
      'Encaminhar para tapeçaria',
    ])
    expect(atv.map((a) => a.ordem)).toEqual([1, 2, 3, 4])
  })

  it('referência sem atividades é explícita', () => {
    expect(referenciaDeclaradaSemAtividades('bt-empty')).toBe(true)
    expect(listarAtividadesOrdenadasDaReferencia('bt-empty')).toEqual([])
  })

  it('classifica BASE_TAREFA vs MANUAL+REFERENCIA', () => {
    const baseTarefa = classificarSemanticaReferenciaNaComposicao('BASE_TAREFA', [
      draftRef('bt-001', { modoMontagem: undefined }),
    ])
    expect(baseTarefa).toEqual({
      tipo: 'BIBLIOTECA_BASE_TAREFA',
      quantidadeBlocosComReferencia: 1,
    })

    const manualRef = classificarSemanticaReferenciaNaComposicao('MANUAL', [
      draftRef('bt-002'),
    ])
    expect(manualRef).toEqual({
      tipo: 'MANUAL_COM_REFERENCIA',
      quantidadeBlocosComReferencia: 1,
    })

    const manualSemRef = classificarSemanticaReferenciaNaComposicao('MANUAL', [
      {
        id: 'tb-sem-ref',
        nome: 'Bloco básico',
        ordem: 1,
        setores: ['Op'],
        atividadesCount: 2,
        estimativaMin: 40,
        modoMontagem: 'BASICO',
        blocoOperacionalCatalogoId: 'bo-limpeza',
      },
    ])
    expect(manualSemRef.tipo).toBe('SEM_REFERENCIA_CATALOGO')
  })
})

describe('detalhe materializado com sourceBaseTarefaId', () => {
  it('usa nomes reais do catálogo — sem sufixo genérico «parte N»', () => {
    const t = draftRef('bt-001', {
      atividadesCount: 4,
      estimativaMin: 120,
    })
    const atv = buildAtividadesDetalheTarefa(t, dadosMin, 'backlog')
    expect(atv.map((a) => a.nome)).toEqual([
      'Isolar bateria e airbag',
      'Remover bancos com etiquetagem',
      'Fotografar fixações',
      'Encaminhar para tapeçaria',
    ])
    expect(atv.some((a) => a.nome.includes('parte '))).toBe(false)
  })

  it('referência sem atividades: nenhuma linha inventada no detalhe', () => {
    const t = draftRef('bt-empty', {
      atividadesCount: 0,
      estimativaMin: 0,
    })
    const atv = buildAtividadesDetalheTarefa(t, dadosMin, 'backlog')
    expect(atv).toEqual([])
  })

  it('sem sourceBaseTarefaId mantém projeção sintética quando não há fonte', () => {
    const t: TarefaBlocoDraft = {
      id: 'tb-y',
      nome: 'Só bloco',
      ordem: 1,
      setores: ['Op'],
      atividadesCount: 2,
      estimativaMin: 40,
    }
    const atv = buildAtividadesDetalheTarefa(t, dadosMin, 'backlog')
    expect(atv).toHaveLength(2)
    expect(atv[0]?.nome).toContain('parte')
  })
})
