import { describe, expect, it, beforeEach } from 'vitest'
import {
  __resetApontamentosRuntimeForTests,
  listarTodosApontamentosOperacionais,
  registrarApontamentoOperacional,
} from './apontamentos-repository'
import { __resetGestaoOverridesForTests } from './esteira-gestao-runtime'
import {
  __resetMaterializacoesRegistryForTests,
  registerNovaEsteiraMaterializacao,
} from './esteira-materializada-registry'
import { __resetRuntimeEsteirasExtrasForTests } from './runtime-esteiras'
import { getEsteiraOperacionalDetalheMock } from './esteira-operacional'
import { NOVA_ESTEIRA_EXEMPLO_VALIDA_MANUAL } from './nova-esteira-composicao-exemplos'
import { materializarNovaEsteira } from './nova-esteira-pipeline'
import type { NovaEsteiraDadosIniciais } from './nova-esteira-submit'
import {
  aplicarFiltrosDashboard,
  buildDashboardOperacional,
  getDashboardOperacionalMock,
  somaMinutosApontamentosPorAtividadeGlobal,
} from './dashboard-operacional'
import { BACKLOG_MOCK_ROWS } from './backlog'

function dadosTesteNe(): NovaEsteiraDadosIniciais {
  return {
    nome: 'Teste dashboard ne',
    cliente: '',
    veiculo: 'Gol',
    modeloVersao: '1.0',
    placa: 'TST88X8',
    observacoes: '',
    responsavel: 'Carlos',
    prazoEstimado: 'Prazo teste',
    prioridade: 'media',
  }
}

describe('dashboard-operacional', () => {
  beforeEach(() => {
    __resetApontamentosRuntimeForTests()
    __resetGestaoOverridesForTests()
    __resetMaterializacoesRegistryForTests()
    __resetRuntimeEsteirasExtrasForTests()
  })

  it('inclui esteira materializada ne-… no bloco operação', () => {
    const result = materializarNovaEsteira(
      {
        dados: dadosTesteNe(),
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

    const d = buildDashboardOperacional({ backlogRows: BACKLOG_MOCK_ROWS })
    expect(d.kpis.operacao.semantica).toBe('esteiras_com_projecao_resolvida')
    expect(d.blocoOperacao.esteiras.some((e) => e.esteiraId === neId)).toBe(true)
  })

  it('minutos: listarTodosApontamentosOperacionais equivale à soma por atividade', () => {
    const op = getEsteiraOperacionalDetalheMock('et-001')!
    const alvo = op.blocos
      .flatMap((b) => b.atividades)
      .find((a) => a.apontabilidade.apontavel)
    expect(alvo).toBeDefined()

    registrarApontamentoOperacional({
      esteiraId: op.esteiraId,
      atividadeId: alvo!.id,
      tipoApontamento: 'execucao',
      minutos: 17,
    })

    const lista = listarTodosApontamentosOperacionais()
    const somaLista = lista.reduce((s, x) => s + x.minutos, 0)
    const somaPorAtividade = somaMinutosApontamentosPorAtividadeGlobal()

    expect(somaLista).toBe(somaPorAtividade)

    const dash = buildDashboardOperacional()
    expect(dash.kpis.apontamentos.totalMinutosApontados).toBe(somaLista)
    expect(dash.kpis.apontamentos.fonte).toBe('listarTodosApontamentosOperacionais')
    expect('eficienciaMediaPct' in dash.kpis).toBe(false)
  })

  it('aplicarFiltrosDashboard atua sobre o agregado e alinha entrada com escopo', () => {
    const base = buildDashboardOperacional({ backlogRows: BACKLOG_MOCK_ROWS })
    const filtrado = aplicarFiltrosDashboard(base, {
      escopoEntrada: 'somente_no_backlog',
    })
    expect(filtrado.blocoEntrada.linhas.every((r) => r.status === 'no_backlog')).toBe(
      true,
    )
    expect(filtrado.kpis.entrada.totalLinhas).toBe(filtrado.blocoEntrada.linhas.length)
  })

  it('getDashboardOperacionalMock é alias de buildDashboardOperacional', () => {
    const a = buildDashboardOperacional({ backlogRows: BACKLOG_MOCK_ROWS })
    const b = getDashboardOperacionalMock({ backlogRows: BACKLOG_MOCK_ROWS })
    expect(a.kpis.operacao.totalEsteiras).toBe(b.kpis.operacao.totalEsteiras)
  })

  it('filtro por status de esteira reduz KPIs operacionais de forma coerente', () => {
    const base = buildDashboardOperacional({ backlogRows: BACKLOG_MOCK_ROWS })
    const f = aplicarFiltrosDashboard(base, { statusEsteira: 'em_execucao' })
    expect(f.kpis.operacao.totalEsteiras).toBe(
      f.blocoOperacao.esteiras.length,
    )
    expect(
      f.kpis.operacao.esteirasPorStatusGeral.em_execucao,
    ).toBe(f.kpis.operacao.totalEsteiras)
  })

  it('bloco responsáveis deriva da jornada agregada', () => {
    const d = buildDashboardOperacional({ backlogRows: BACKLOG_MOCK_ROWS })
    expect(d.blocoResponsaveis.agregado.totais.responsaveis).toBe(
      d.kpis.totalResponsaveisNaOperacao,
    )
  })

  it('alertas incluem fonteGaps da jornada', () => {
    const d = buildDashboardOperacional({ backlogRows: BACKLOG_MOCK_ROWS })
    expect(
      d.alertas.some((a) => a.codigo === 'fonte_jornada'),
    ).toBe(true)
  })
})
