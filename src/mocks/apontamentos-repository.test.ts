import { describe, expect, it, beforeEach } from 'vitest'
import {
  __resetApontamentosRuntimeForTests,
  listarApontamentosPorAtividade,
  obterHistoricoAgregadoAtividade,
  registrarApontamentoOperacional,
  resolverEsteiraIdDaAtividadeNaProjecao,
  validarRegistroApontamento,
} from './apontamentos-repository'
import { ESTEIRA_ET001 } from './esteira-detalhe'
import {
  __resetMaterializacoesRegistryForTests,
  registerNovaEsteiraMaterializacao,
} from './esteira-materializada-registry'
import { __resetRuntimeEsteirasExtrasForTests } from './runtime-esteiras'
import {
  findAtividadeOperacionalNaEsteira,
  getEsteiraOperacionalDetalheMock,
} from './esteira-operacional'
import { __resetGestaoOverridesForTests } from './esteira-gestao-runtime'
import { NOVA_ESTEIRA_EXEMPLO_VALIDA_MANUAL } from './nova-esteira-composicao-exemplos'
import { materializarNovaEsteira } from './nova-esteira-pipeline'
import type { NovaEsteiraDadosIniciais } from './nova-esteira-submit'
import { resolveApontamentoContext } from './apontamento-context'
import { getHistoricoAtividadeMock } from './atividade-historico'

function dadosTeste(): NovaEsteiraDadosIniciais {
  return {
    nome: 'Teste apontamento',
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

describe('apontamentos-repository', () => {
  beforeEach(() => {
    __resetApontamentosRuntimeForTests()
    __resetGestaoOverridesForTests()
    __resetMaterializacoesRegistryForTests()
    __resetRuntimeEsteirasExtrasForTests()
  })

  it('registra apontamento em atividade válida e preserva vínculos', () => {
    const op0 = getEsteiraOperacionalDetalheMock('et-001')!
    const alvo = op0.blocos
      .flatMap((b) => b.atividades)
      .find((a) => a.apontabilidade.apontavel)
    expect(alvo).toBeDefined()
    const r = registrarApontamentoOperacional({
      esteiraId: 'et-001',
      atividadeId: alvo!.id,
      tipoApontamento: 'execucao',
      minutos: 10,
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.apontamento.esteiraId).toBe('et-001')
    expect(r.apontamento.atividadeId).toBe(alvo!.id)
    expect(r.apontamento.setorId).toBe(alvo!.setorId)
    expect(r.apontamento.responsavel).toBe(alvo!.colaboradorNome.trim())
    expect(r.apontamento.colaboradorId).toBe(alvo!.colaboradorId)
  })

  it('bloqueia atividade não apontável (esteira no backlog)', () => {
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
    const esteiraId = result.idsDeterministicos.esteiraId
    const aid = `${result.tarefasMaterializadas[0]!.id}-a1`
    const r = registrarApontamentoOperacional({
      esteiraId,
      atividadeId: aid,
      tipoApontamento: 'execucao',
      minutos: 5,
    })
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.motivo).toBe('nao_apontavel')
  })

  it('bloqueia esteira inexistente', () => {
    const r = registrarApontamentoOperacional({
      esteiraId: 'et-inventada-xyz',
      atividadeId: 't1-a1',
      tipoApontamento: 'execucao',
      minutos: 1,
    })
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.motivo).toBe('esteira_nao_encontrada')
  })

  it('bloqueia id de atividade inventado (não existe na projeção)', () => {
    const r = registrarApontamentoOperacional({
      esteiraId: 'et-001',
      atividadeId: 'atividade-fake-nao-existe',
      tipoApontamento: 'execucao',
      minutos: 1,
    })
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.motivo).toBe('atividade_nao_encontrada')
  })

  it('pausa só a partir de em_execucao', () => {
    const op = getEsteiraOperacionalDetalheMock('et-001')!
    const pendente = op.blocos
      .flatMap((b) => b.atividades)
      .find((a) => a.status === 'pendente' && a.apontabilidade.apontavel)
    expect(pendente).toBeDefined()
    const r = registrarApontamentoOperacional({
      esteiraId: 'et-001',
      atividadeId: pendente!.id,
      tipoApontamento: 'pausa',
      minutos: 5,
    })
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.motivo).toBe('tipo_incompativel_estado')
  })

  it('fluxo ne-…: execução e histórico agregado', () => {
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
    const t0 = result.tarefasMaterializadas[0]!
    const activityId = `${t0.id}-a1`

    const r1 = registrarApontamentoOperacional({
      esteiraId,
      atividadeId: activityId,
      tipoApontamento: 'execucao',
      minutos: 20,
    })
    expect(r1.ok).toBe(true)

    const agg = obterHistoricoAgregadoAtividade(esteiraId, activityId)
    expect(agg.quantidade).toBe(1)
    expect(agg.totalMinutos).toBe(20)

    const lista = listarApontamentosPorAtividade(esteiraId, activityId)
    expect(lista).toHaveLength(1)
    expect(lista[0]!.esteiraId).toBe(esteiraId)
    expect(lista[0]!.atividadeId).toBe(activityId)
  })

  it('resolve esteiraId na projeção a partir da atividade', () => {
    const id = ESTEIRA_ET001.tarefas[0]!.atividades[0]!.id
    expect(resolverEsteiraIdDaAtividadeNaProjecao(id)).toBe('et-001')
  })

  it('validarRegistroApontamento não persiste', () => {
    const op = getEsteiraOperacionalDetalheMock('et-001')!
    const a = op.blocos
      .flatMap((b) => b.atividades)
      .find((x) => x.apontabilidade.apontavel)!
    validarRegistroApontamento({
      esteiraId: 'et-001',
      atividadeId: a.id,
      tipoApontamento: 'execucao',
      minutos: 3,
    })
    expect(obterHistoricoAgregadoAtividade('et-001', a.id).quantidade).toBe(0)
  })

  it('contexto de apontamento não resolve id inventado', () => {
    expect(resolveApontamentoContext('id-inventado-999')).toBeUndefined()
  })

  it('histórico composto inclui apontamento do repositório', () => {
    const op = getEsteiraOperacionalDetalheMock('et-001')!
    const a = op.blocos
      .flatMap((b) => b.atividades)
      .find((x) => x.apontabilidade.apontavel)!
    registrarApontamentoOperacional({
      esteiraId: 'et-001',
      atividadeId: a.id,
      tipoApontamento: 'execucao',
      minutos: 12,
      observacao: 'teste composição',
    })
    const ev = getHistoricoAtividadeMock(a.id)
    expect(ev.some((e) => e.id.startsWith('ap-'))).toBe(true)
  })

  it('efeito operacional: execução atualiza realizado via override', () => {
    const op = getEsteiraOperacionalDetalheMock('et-001')!
    const a = op.blocos
      .flatMap((b) => b.atividades)
      .find((x) => x.apontabilidade.apontavel)!
    const antes = a.realizadoMin
    const r = registrarApontamentoOperacional({
      esteiraId: 'et-001',
      atividadeId: a.id,
      tipoApontamento: 'execucao',
      minutos: 7,
    })
    expect(r.ok).toBe(true)
    const op2 = getEsteiraOperacionalDetalheMock('et-001')!
    const found = findAtividadeOperacionalNaEsteira(op2, a.id)!
    expect(found.atividade.realizadoMin).toBe(antes + 7)
    expect(found.atividade.status).toBe('em_execucao')
  })
})
