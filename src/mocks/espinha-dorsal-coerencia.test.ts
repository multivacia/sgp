/**
 * Testes transversais da espinha dorsal — coerência entre backlog, projeção,
 * apontamentos, jornada e dashboard; proteção contra ids inválidos; ausência de
 * dependência funcional de legados removidos do barrel.
 */
import { describe, expect, it, beforeEach } from 'vitest'
import { resolveApontamentoContext } from './apontamento-context'
import {
  __resetApontamentosRuntimeForTests,
  listarTodosApontamentosOperacionais,
  registrarApontamentoOperacional,
} from './apontamentos-repository'
import { BACKLOG_MOCK_ROWS } from './backlog'
import {
  aplicarFiltrosDashboard,
  buildDashboardOperacional,
} from './dashboard-operacional'
import { computeResumoEsteira, getEsteiraDetalheMock } from './esteira-detalhe'
import { __resetGestaoOverridesForTests } from './esteira-gestao-runtime'
import {
  getEsteiraOperacionalDetalheMock,
  listEsteiraIdsParaApontamento,
} from './esteira-operacional'
import {
  __resetMaterializacoesRegistryForTests,
  registerNovaEsteiraMaterializacao,
} from './esteira-materializada-registry'
import * as mocksBarrel from './index'
import { buildJornadaColaboradorOperacional } from './jornada-colaborador-operacional'
import { NOVA_ESTEIRA_EXEMPLO_VALIDA_MANUAL } from './nova-esteira-composicao-exemplos'
import { materializarNovaEsteira } from './nova-esteira-pipeline'
import type { NovaEsteiraDadosIniciais } from './nova-esteira-submit'
import { __resetColaboradoresRepositoryForTests } from './colaboradores-operacionais-repository'
import { __resetRuntimeEsteirasExtrasForTests } from './runtime-esteiras'

function dadosNe(): NovaEsteiraDadosIniciais {
  return {
    nome: 'Coerência NE',
    cliente: '',
    veiculo: 'Gol',
    modeloVersao: '1.0',
    placa: 'COE88R8',
    observacoes: '',
    responsavel: 'Carlos',
    prazoEstimado: 'Prazo teste',
    prioridade: 'media',
  }
}

describe('espinha dorsal — coerência transversal', () => {
  beforeEach(() => {
    __resetApontamentosRuntimeForTests()
    __resetGestaoOverridesForTests()
    __resetMaterializacoesRegistryForTests()
    __resetRuntimeEsteirasExtrasForTests()
    __resetColaboradoresRepositoryForTests()
  })

  it('backlog: coluna atividades bate com resumo do detalhe oficial', () => {
    for (const row of BACKLOG_MOCK_ROWS) {
      if (!row.esteiraId) continue
      const e = getEsteiraDetalheMock(row.esteiraId)
      expect(e).toBeDefined()
      const r = computeResumoEsteira(e!)
      expect(row.activities).toBe(r.totalAtividades)
    }
  })

  it('resolveApontamentoContext retorna undefined para id inventado', () => {
    expect(resolveApontamentoContext('__nao_existe_99')).toBeUndefined()
    expect(resolveApontamentoContext(undefined)).toBeUndefined()
  })

  it('minutos totais: jornada ↔ repositório ↔ dashboard (snapshot integral)', () => {
    const j = buildJornadaColaboradorOperacional()
    const lista = listarTodosApontamentosOperacionais()
    const somaLista = lista.reduce((s, x) => s + x.minutos, 0)
    expect(j.totais.minutosApontados).toBe(somaLista)

    const d = buildDashboardOperacional({ backlogRows: BACKLOG_MOCK_ROWS })
    expect(d.kpis.apontamentos.totalMinutosApontados).toBe(somaLista)
    expect(d.kpis.apontamentos.fonte).toBe('listarTodosApontamentosOperacionais')
  })

  it('dashboard: total responsáveis bate com agregado da jornada', () => {
    const d = buildDashboardOperacional({ backlogRows: BACKLOG_MOCK_ROWS })
    expect(d.kpis.totalResponsaveisNaOperacao).toBe(
      d.blocoResponsaveis.agregado.totais.responsaveis,
    )
  })

  it('esteira ne-… entra na projeção e no dashboard após registro', () => {
    const result = materializarNovaEsteira(
      {
        dados: dadosNe(),
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

    expect(listEsteiraIdsParaApontamento().includes(neId)).toBe(true)
    const op = getEsteiraOperacionalDetalheMock(neId)
    expect(op).toBeDefined()

    const dash = buildDashboardOperacional({ backlogRows: BACKLOG_MOCK_ROWS })
    expect(dash.blocoOperacao.esteiras.some((e) => e.esteiraId === neId)).toBe(
      true,
    )
  })

  it('filtro dashboard sem resultado: KPIs coerentes com listas vazias', () => {
    const base = buildDashboardOperacional({ backlogRows: BACKLOG_MOCK_ROWS })
    const vazio = aplicarFiltrosDashboard(base, {
      buscaTexto: '__xyz_sem_match_garantido__',
    })
    expect(vazio.blocoEntrada.linhas.length).toBe(0)
    expect(vazio.blocoOperacao.esteiras.length).toBe(0)
    expect(vazio.kpis.entrada.totalLinhas).toBe(0)
    expect(vazio.kpis.operacao.totalEsteiras).toBe(0)
  })

  it('após apontamento, jornada e dashboard refletem o mesmo acúmulo', () => {
    const op = getEsteiraOperacionalDetalheMock('et-001')!
    const alvo = op.blocos
      .flatMap((b) => b.atividades)
      .find((a) => a.apontabilidade.apontavel)
    expect(alvo).toBeDefined()

    registrarApontamentoOperacional({
      esteiraId: op.esteiraId,
      atividadeId: alvo!.id,
      tipoApontamento: 'execucao',
      minutos: 42,
    })

    const j = buildJornadaColaboradorOperacional()
    const d = buildDashboardOperacional({ backlogRows: BACKLOG_MOCK_ROWS })
    expect(j.totais.minutosApontados).toBe(d.kpis.apontamentos.totalMinutosApontados)
  })

  it('barrel de mocks não reexporta legados decorativos nem carteira paralela', () => {
    expect('DASHBOARD_KPIS' in mocksBarrel).toBe(false)
    expect('MOCK_TASKS' in mocksBarrel).toBe(false)
    expect('MOCK_JORNADA' in mocksBarrel).toBe(false)
    expect(typeof mocksBarrel.buildDashboardOperacional).toBe('function')
  })
})
