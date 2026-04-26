import { describe, expect, it } from 'vitest'
import {
  dadosCamposOkParaRegistro,
  impeditivoCamposDadosParaRegistro,
  prazoEstimadoFormatoAceito,
} from './nova-esteira-dados-validacao'
import type { NovaEsteiraDadosIniciais } from './nova-esteira-submit'

function dados(over: Partial<NovaEsteiraDadosIniciais> = {}): NovaEsteiraDadosIniciais {
  return {
    nome: 'Esteira',
    cliente: '',
    veiculo: '',
    modeloVersao: '',
    placa: '',
    observacoes: '',
    responsavel: '',
    prazoEstimado: '',
    prioridade: 'media',
    ...over,
  }
}

describe('nova-esteira-dados-validacao', () => {
  it('prazo vazio ou numérico é aceito', () => {
    expect(prazoEstimadoFormatoAceito('')).toBe(true)
    expect(prazoEstimadoFormatoAceito('  ')).toBe(true)
    expect(prazoEstimadoFormatoAceito('10')).toBe(true)
    expect(prazoEstimadoFormatoAceito('3,5')).toBe(true)
    expect(prazoEstimadoFormatoAceito('2.5')).toBe(true)
  })

  it('prazo com texto livre é rejeitado', () => {
    expect(prazoEstimadoFormatoAceito('dscsdcs')).toBe(false)
    expect(prazoEstimadoFormatoAceito('10 dias')).toBe(false)
  })

  it('impeditivo exige nome e prazo no formato', () => {
    expect(impeditivoCamposDadosParaRegistro(dados({ nome: '' }))).toMatch(/nome/i)
    expect(
      impeditivoCamposDadosParaRegistro(dados({ prazoEstimado: 'xyz' })),
    ).toMatch(/Prazo estimado/)
    expect(impeditivoCamposDadosParaRegistro(dados())).toBe('')
  })

  it('dadosCamposOkParaRegistro reflete impeditivo vazio', () => {
    expect(dadosCamposOkParaRegistro(dados())).toBe(true)
    expect(dadosCamposOkParaRegistro(dados({ prazoEstimado: 'não' }))).toBe(false)
  })
})
