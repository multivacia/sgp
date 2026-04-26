import { describe, expect, it, beforeEach } from 'vitest'
import {
  __resetApontamentosRuntimeForTests,
  listarTodosApontamentosOperacionais,
  registrarApontamentoOperacional,
} from './apontamentos-repository'
import {
  applyAtividadeOverride,
  __resetGestaoOverridesForTests,
} from './esteira-gestao-runtime'
import {
  __resetMaterializacoesRegistryForTests,
  registerNovaEsteiraMaterializacao,
} from './esteira-materializada-registry'
import { __resetColaboradoresRepositoryForTests } from './colaboradores-operacionais-repository'
import { __resetRuntimeEsteirasExtrasForTests } from './runtime-esteiras'
import {
  findAtividadeOperacionalNaEsteira,
  getEsteiraOperacionalDetalheMock,
} from './esteira-operacional'
import { NOVA_ESTEIRA_EXEMPLO_VALIDA_MANUAL } from './nova-esteira-composicao-exemplos'
import { materializarNovaEsteira } from './nova-esteira-pipeline'
import type { NovaEsteiraDadosIniciais } from './nova-esteira-submit'
import {
  buildJornadaColaboradorOperacional,
  coletarChavesResponsavelProjecao,
  RESPONSAVEL_AUSENTE_CHAVE,
} from './jornada-colaborador-operacional'

function dadosTeste(): NovaEsteiraDadosIniciais {
  return {
    nome: 'Teste jornada ne',
    cliente: '',
    veiculo: 'Gol',
    modeloVersao: '1.0',
    placa: 'TST99X9',
    observacoes: '',
    responsavel: 'Carlos',
    prazoEstimado: 'Prazo teste',
    prioridade: 'media',
  }
}

describe('jornada-colaborador-operacional', () => {
  beforeEach(() => {
    __resetApontamentosRuntimeForTests()
    __resetGestaoOverridesForTests()
    __resetMaterializacoesRegistryForTests()
    __resetRuntimeEsteirasExtrasForTests()
    __resetColaboradoresRepositoryForTests()
  })

  it('agrupa responsável vazio no bucket explícito', () => {
    const alvo = getEsteiraOperacionalDetalheMock('et-001')!
      .blocos.flatMap((b) => b.atividades)
      .find((a) => a.apontabilidade.apontavel)
    expect(alvo).toBeDefined()
    applyAtividadeOverride(alvo!.id, { responsavel: '   ' })

    const j = buildJornadaColaboradorOperacional()
    const ausente = j.porResponsavel.find(
      (r) => r.responsavelChaveAgregacao === RESPONSAVEL_AUSENTE_CHAVE,
    )
    expect(ausente).toBeDefined()
    expect(ausente!.carteira.some((c) => c.atividadeId === alvo!.id)).toBe(true)
  })

  it('sinaliza homônimo textual quando o mesmo nome aparece em mais de uma esteira', () => {
    const j = buildJornadaColaboradorOperacional()
    const pedro = j.porResponsavel.find((r) => r.responsavelNome === 'Pedro')
    expect(pedro).toBeDefined()
    expect(pedro!.temAmbiguidadeIdentidade).toBe(true)
    const esteiras = new Set(pedro!.carteira.map((c) => c.esteiraId))
    expect(esteiras.size).toBeGreaterThan(1)
  })

  it('inclui esteira materializada ne-… na agregação', () => {
    const result = materializarNovaEsteira(
      {
        dados: dadosTeste(),
        estruturaOrigem: 'MANUAL',
        linhasManual: NOVA_ESTEIRA_EXEMPLO_VALIDA_MANUAL.linhasManual,
        tarefasNaoManual: [],
        baseEsteiraAplicadaId: null,
      },
      'exec',
    )
    registerNovaEsteiraMaterializacao(result)
    const neId = result.idsDeterministicos.esteiraId
    expect(neId.startsWith('ne-')).toBe(true)

    const j = buildJornadaColaboradorOperacional()
    const comNe = j.porResponsavel.some((r) =>
      r.carteira.some((c) => c.esteiraId === neId),
    )
    expect(comNe).toBe(true)
  })

  it('atualiza minutos apontados após registro no repositório', () => {
    const op = getEsteiraOperacionalDetalheMock('et-001')!
    const alvo = op.blocos
      .flatMap((b) => b.atividades)
      .find((a) => a.apontabilidade.apontavel)
    expect(alvo).toBeDefined()

    const antes = buildJornadaColaboradorOperacional()
    const chave = alvo!.colaboradorChaveAgregacao
    const minAntes =
      antes.porResponsavel.find((r) => r.responsavelChaveAgregacao === chave)
        ?.minutosApontados ?? 0

    const r = registrarApontamentoOperacional({
      esteiraId: 'et-001',
      atividadeId: alvo!.id,
      tipoApontamento: 'execucao',
      minutos: 42,
    })
    expect(r.ok).toBe(true)

    const depois = buildJornadaColaboradorOperacional()
    const minDepois =
      depois.porResponsavel.find((r) => r.responsavelChaveAgregacao === chave)
        ?.minutosApontados ?? 0

    expect(minDepois).toBe(minAntes + 42)

    const repoTotal = listarTodosApontamentosOperacionais().reduce(
      (s, x) => s + x.minutos,
      0,
    )
    expect(depois.totais.minutosApontados).toBe(repoTotal)
  })

  it('não inventa colaboradores: chaves da agregação = chaves da projeção', () => {
    const j = buildJornadaColaboradorOperacional()
    const keysAg = new Set(j.porResponsavel.map((r) => r.responsavelChaveAgregacao))
    const keysProj = coletarChavesResponsavelProjecao()
    expect(keysAg).toEqual(keysProj)
  })

  it('preserva vínculos esteiraId, atividadeId, setorId na carteira', () => {
    const op = getEsteiraOperacionalDetalheMock('et-001')!
    const a = op.blocos[0]!.atividades[0]!
    const found = findAtividadeOperacionalNaEsteira(op, a.id)
    expect(found).toBeDefined()

    const j = buildJornadaColaboradorOperacional()
    const linha = j.porResponsavel
      .flatMap((r) => r.carteira)
      .find((c) => c.atividadeId === a.id && c.esteiraId === 'et-001')
    expect(linha).toBeDefined()
    expect(linha!.setorId).toBe(found!.atividade.setorId)
  })
})
