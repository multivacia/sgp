import { beforeEach, describe, expect, it } from 'vitest'
import { resolveApontamentoContext } from './apontamento-context'
import {
  __resetApontamentosRuntimeForTests,
} from './apontamentos-repository'
import { ESTEIRA_ET001, type EsteiraDetalheMock } from './esteira-detalhe'
import {
  __resetGestaoOverridesForTests,
  mergeEsteiraDetalhe,
} from './esteira-gestao-runtime'
import {
  __resetMaterializacoesRegistryForTests,
  registerNovaEsteiraMaterializacao,
} from './esteira-materializada-registry'
import { __resetRuntimeEsteirasExtrasForTests } from './runtime-esteiras'
import {
  buildEsteiraOperacionalDetalhe,
  computeApontabilidadeAtividade,
  findAtividadeOperacionalNaEsteira,
  getEsteiraOperacionalDetalheMock,
  stableSetorId,
} from './esteira-operacional'
import { NOVA_ESTEIRA_EXEMPLO_VALIDA_MANUAL } from './nova-esteira-composicao-exemplos'
import { materializarNovaEsteira } from './nova-esteira-pipeline'
import type { NovaEsteiraDadosIniciais } from './nova-esteira-submit'

function dadosTeste(): NovaEsteiraDadosIniciais {
  return {
    nome: 'Teste operacional',
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

describe('esteira-operacional', () => {
  beforeEach(() => {
    __resetApontamentosRuntimeForTests()
    __resetGestaoOverridesForTests()
    __resetMaterializacoesRegistryForTests()
    __resetRuntimeEsteirasExtrasForTests()
  })

  it('preserva ids e setorId determinístico na projeção a partir da materialização', () => {
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
    const esteiraId = result.idsDeterministicos.esteiraId
    const op = getEsteiraOperacionalDetalheMock(esteiraId)
    expect(op).toBeDefined()
    expect(op!.esteiraId).toBe(esteiraId)

    const t0 = result.tarefasMaterializadas[0]
    expect(t0).toBeDefined()
    const bloco0 = op!.blocos.find((b) => b.id === t0!.id)
    expect(bloco0).toBeDefined()
    const a0 = bloco0!.atividades[0]
    expect(a0.id).toBe(`${t0!.id}-a1`)
    expect(a0.atividadeId).toBe(a0.id)
    expect(a0.setorId).toBe(stableSetorId(esteiraId, a0.setorNome))

    const found = findAtividadeOperacionalNaEsteira(op!, a0.id)
    expect(found?.atividade.nome).toBe(a0.nome)
  })

  it('apontabilidade: esteira no backlog não é apontável', () => {
    const result = materializarNovaEsteira(
      {
        dados: dadosTeste(),
        estruturaOrigem: 'MANUAL',
        linhasManual: NOVA_ESTEIRA_EXEMPLO_VALIDA_MANUAL.linhasManual,
        tarefasNaoManual: [],
        baseEsteiraAplicadaId: null,
      },
      'backlog',
    )
    registerNovaEsteiraMaterializacao(result)
    const op = getEsteiraOperacionalDetalheMock(result.idsDeterministicos.esteiraId)!
    for (const b of op.blocos) {
      for (const a of b.atividades) {
        expect(a.apontabilidade.apontavel).toBe(false)
        expect(a.apontabilidade.motivoNaoApontavel).toBeDefined()
      }
    }
  })

  it('apontamento-context resolve atividade ne-… pela projeção', () => {
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
    const t0 = result.tarefasMaterializadas[0]!
    const activityId = `${t0.id}-a1`
    const esteiraId = result.idsDeterministicos.esteiraId
    const ctx = resolveApontamentoContext(activityId, {
      esteiraIdHint: esteiraId,
      origem: 'esteira_detalhe',
    })
    expect(ctx).toBeDefined()
    expect(ctx!.origem).toBe('esteira_detalhe')
    expect(ctx!.esteiraId).toBe(esteiraId)
    expect(ctx!.setorId).toBeDefined()
    expect(ctx!.apontavel).toBe(true)
  })

  it('fallback mínimo: esteira sem macroblocos não inventa atividades', () => {
    const vazia: EsteiraDetalheMock = {
      id: 'et-empty-test',
      nome: 'Vazia',
      veiculo: '—',
      tipoOrigem: 'Teste',
      referenciaOs: 'OS-V',
      statusGeral: 'em_execucao',
      prioridade: 'baixa',
      prazoTexto: '—',
      tarefas: [],
    }
    const op = buildEsteiraOperacionalDetalhe(mergeEsteiraDetalhe(vazia), {})
    expect(op.blocos).toHaveLength(0)
    expect(op.quantidadeAtividades).toBe(0)
    expect(op.resumoOperacional.apontaveis).toBe(0)
  })

  it('computeApontabilidadeAtividade — concluída nunca apontável', () => {
    const r = computeApontabilidadeAtividade('concluida', {
      statusGeralEsteira: 'em_execucao',
    })
    expect(r.apontavel).toBe(false)
  })

  it('ET-001 oficial: projeção alinhada ao detalhe mock', () => {
    const op = getEsteiraOperacionalDetalheMock('et-001')!
    expect(op.nome).toBe(ESTEIRA_ET001.nome)
    expect(op.quantidadeAtividades).toBeGreaterThan(0)
    const flat = op.blocos.flatMap((b) => b.atividades)
    expect(flat.length).toBe(op.resumoOperacional.totalAtividades)
  })
})
