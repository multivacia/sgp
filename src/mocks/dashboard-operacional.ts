/**
 * Dashboard operacional — agregação única sobre backlog (fila), projeção das esteiras,
 * repositório de apontamentos e jornada do colaborador.
 *
 * Fronteira (mock → futuro backend): este módulo permanece como **agregador puro**;
 * substituir `listarTodosApontamentosOperacionais`, `resolveOperacoes` e fontes de
 * backlog por chamadas API sem alterar o contrato exposto aos componentes.
 *
 * Eixos obrigatórios no contrato:
 * - Entrada / fila (`BacklogRow`) — não misturar totais com esteiras operacionais.
 * - Operação (`EsteiraOperacionalDetalhe`) — ids com projeção resolvida via `getEsteiraOperacionalDetalheMock`.
 *
 * Minutos apontados: fonte única `listarTodosApontamentosOperacionais()` (subconjuntos filtram essa lista).
 */

import type { BacklogRow, BacklogStatus } from './backlog'
import { BACKLOG_MOCK_ROWS } from './backlog'
import type { AtividadeStatusDetalhe, EsteiraStatusGeral } from './esteira-detalhe'
import {
  getEsteiraOperacionalDetalheMock,
  listEsteiraIdsParaApontamento,
  type EsteiraAtividadeOperacional,
  type EsteiraOperacionalDetalhe,
} from './esteira-operacional'
import {
  aplicarFiltrosJornada,
  buildJornadaColaboradorOperacional,
  refiltrarJornadaAgregadoPorEsteiraIds,
  type JornadaColaboradorAgregado,
} from './jornada-colaborador-operacional'
import {
  getApontamentosVersion,
  listarTodosApontamentosOperacionais,
  obterHistoricoAgregadoAtividade,
  type ApontamentoOperacional,
} from './apontamentos-repository'
import { getEsteirasExtraSnapshot } from './runtime-esteiras'

export type DashboardOperacionalAlerta = {
  codigo: string
  mensagem: string
  severidade: 'info' | 'warning'
}

/** Filtros aplicados sempre sobre o agregado completo (`buildDashboardOperacional`), nunca sobre fontes soltas na UI. */
export type DashboardOperacionalFiltros = {
  statusEsteira?: EsteiraStatusGeral | 'all'
  statusAtividade?: AtividadeStatusDetalhe | 'all'
  responsavelChave?: string
  buscaTexto?: string
  /** Restringe linhas do bloco entrada a `status === 'no_backlog'`. */
  escopoEntrada?: 'todos' | 'somente_no_backlog'
  somenteApontaveis?: boolean
  somenteComApontamento?: boolean
}

/** KPIs da fila de entrada — semântica exclusiva de linhas de backlog. */
export type DashboardOperacionalKpisEntrada = {
  semantica: 'linhas_backlog_fila'
  totalLinhas: number
  porStatusBacklog: Partial<Record<BacklogStatus, number>>
}

/**
 * KPIs da operação viva — semântica exclusiva de projeção resolvida
 * (`listEsteiraIdsParaApontamento` + `getEsteiraOperacionalDetalheMock`).
 */
export type DashboardOperacionalKpisOperacao = {
  semantica: 'esteiras_com_projecao_resolvida'
  totalEsteiras: number
  esteirasPorStatusGeral: Record<EsteiraStatusGeral, number>
  totalAtividades: number
  atividadesPorStatus: Record<AtividadeStatusDetalhe, number>
  totalAtividadesApontaveis: number
  totalAtividadesBloqueadas: number
  totalAtividadesComApontamento: number
}

/** Apontamentos — fonte única explícita. */
export type DashboardOperacionalKpisApontamentos = {
  fonte: 'listarTodosApontamentosOperacionais'
  totalRegistros: number
  totalMinutosApontados: number
}

export type DashboardOperacionalKpis = {
  entrada: DashboardOperacionalKpisEntrada
  operacao: DashboardOperacionalKpisOperacao
  apontamentos: DashboardOperacionalKpisApontamentos
  totalResponsaveisNaOperacao: number
}

export type DashboardOperacionalBlocoEntrada = {
  linhas: BacklogRow[]
  kpis: DashboardOperacionalKpisEntrada
}

export type DashboardOperacionalBlocoOperacao = {
  esteiras: EsteiraOperacionalDetalhe[]
  kpis: DashboardOperacionalKpisOperacao
}

export type DashboardOperacionalBlocoResponsaveis = {
  agregado: JornadaColaboradorAgregado
}

export type DashboardOperacional = {
  kpis: DashboardOperacionalKpis
  blocoEntrada: DashboardOperacionalBlocoEntrada
  blocoOperacao: DashboardOperacionalBlocoOperacao
  blocoResponsaveis: DashboardOperacionalBlocoResponsaveis
  alertas: DashboardOperacionalAlerta[]
  meta: {
    versaoApontamentos: number
    geradoEm: string
  }
}

const STATUS_ESTEIRA_ZERO: Record<EsteiraStatusGeral, number> = {
  em_execucao: 0,
  pausada: 0,
  concluida: 0,
  no_backlog: 0,
}

const STATUS_ATIVIDADE_ORDER: AtividadeStatusDetalhe[] = [
  'pendente',
  'pronta',
  'em_execucao',
  'pausada',
  'concluida',
  'bloqueada',
]

function emptyAtividadesPorStatus(): Record<AtividadeStatusDetalhe, number> {
  const o = {} as Record<AtividadeStatusDetalhe, number>
  for (const s of STATUS_ATIVIDADE_ORDER) o[s] = 0
  return o
}

export function flattenAtividadesOperacionais(
  ops: EsteiraOperacionalDetalhe[],
): { esteiraId: string; atividade: EsteiraAtividadeOperacional }[] {
  const out: { esteiraId: string; atividade: EsteiraAtividadeOperacional }[] = []
  for (const op of ops) {
    for (const b of op.blocos) {
      for (const a of b.atividades) {
        out.push({ esteiraId: op.esteiraId, atividade: a })
      }
    }
  }
  return out
}

function countPorStatusBacklog(rows: BacklogRow[]): Partial<Record<BacklogStatus, number>> {
  const out: Partial<Record<BacklogStatus, number>> = {}
  for (const r of rows) {
    out[r.status] = (out[r.status] ?? 0) + 1
  }
  return out
}

function countAtividadesComApontamento(
  flat: { esteiraId: string; atividade: EsteiraAtividadeOperacional }[],
): number {
  let n = 0
  for (const { esteiraId, atividade } of flat) {
    const h = obterHistoricoAgregadoAtividade(esteiraId, atividade.id)
    if (h.quantidade > 0) n += 1
  }
  return n
}

function computeEntradaKpis(rows: BacklogRow[]): DashboardOperacionalKpisEntrada {
  return {
    semantica: 'linhas_backlog_fila',
    totalLinhas: rows.length,
    porStatusBacklog: countPorStatusBacklog(rows),
  }
}

function computeOperacaoKpis(
  esteiras: EsteiraOperacionalDetalhe[],
): DashboardOperacionalKpisOperacao {
  const esteirasPorStatusGeral = { ...STATUS_ESTEIRA_ZERO }
  for (const e of esteiras) {
    esteirasPorStatusGeral[e.statusGeral] += 1
  }

  const flat = flattenAtividadesOperacionais(esteiras)
  const atividadesPorStatus = emptyAtividadesPorStatus()
  for (const { atividade: a } of flat) {
    atividadesPorStatus[a.status] += 1
  }

  return {
    semantica: 'esteiras_com_projecao_resolvida',
    totalEsteiras: esteiras.length,
    esteirasPorStatusGeral,
    totalAtividades: flat.length,
    atividadesPorStatus,
    totalAtividadesApontaveis: flat.filter((x) => x.atividade.apontabilidade.apontavel)
      .length,
    totalAtividadesBloqueadas: atividadesPorStatus.bloqueada,
    totalAtividadesComApontamento: countAtividadesComApontamento(flat),
  }
}

function computeApontamentosKpis(
  lista: ApontamentoOperacional[],
): DashboardOperacionalKpisApontamentos {
  const totalMinutosApontados = lista.reduce((s, x) => s + x.minutos, 0)
  return {
    fonte: 'listarTodosApontamentosOperacionais',
    totalRegistros: lista.length,
    totalMinutosApontados,
  }
}

function buildAlertas(
  linhas: BacklogRow[],
  jornada: JornadaColaboradorAgregado,
): DashboardOperacionalAlerta[] {
  const out: DashboardOperacionalAlerta[] = []
  for (const g of jornada.fonteGaps) {
    out.push({ codigo: 'fonte_jornada', mensagem: g, severidade: 'warning' })
  }
  for (const r of linhas) {
    if (!r.esteiraId) continue
    if (!getEsteiraOperacionalDetalheMock(r.esteiraId)) {
      out.push({
        codigo: 'backlog_sem_projecao',
        mensagem: `Linha ${r.ref} referencia esteira ${r.esteiraId} sem projeção operacional resolvida.`,
        severidade: 'warning',
      })
    }
  }
  for (const jr of jornada.porResponsavel) {
    if (jr.temAmbiguidadeIdentidade) {
      out.push({
        codigo: 'amb_responsavel',
        mensagem: jr.colaboradorId
          ? `Colaborador "${jr.responsavelNome}" aparece em mais de uma esteira.`
          : `Responsável "${jr.responsavelNome}" aparece em mais de uma esteira — possível homônimo.`,
        severidade: 'info',
      })
    }
  }
  return out
}

function resolveOperacoes(): EsteiraOperacionalDetalhe[] {
  const operacoes: EsteiraOperacionalDetalhe[] = []
  for (const id of listEsteiraIdsParaApontamento()) {
    const op = getEsteiraOperacionalDetalheMock(id)
    if (op) operacoes.push(op)
  }
  return operacoes
}

export type BuildDashboardOperacionalOpts = {
  backlogRows?: BacklogRow[]
  /** Para testes — injeta versão de apontamentos sem depender do singleton. */
  apontamentosLista?: ApontamentoOperacional[]
  versaoApontamentos?: number
}

function assembleDashboard(
  linhas: BacklogRow[],
  esteiras: EsteiraOperacionalDetalhe[],
  todosApontamentos: ApontamentoOperacional[],
  jornada: JornadaColaboradorAgregado,
  versaoApontamentos: number,
): DashboardOperacional {
  const kpisEntrada = computeEntradaKpis(linhas)
  const kpisOperacao = computeOperacaoKpis(esteiras)
  const kpisAp = computeApontamentosKpis(todosApontamentos)

  return {
    kpis: {
      entrada: kpisEntrada,
      operacao: kpisOperacao,
      apontamentos: kpisAp,
      totalResponsaveisNaOperacao: jornada.totais.responsaveis,
    },
    blocoEntrada: { linhas, kpis: kpisEntrada },
    blocoOperacao: { esteiras, kpis: kpisOperacao },
    blocoResponsaveis: { agregado: jornada },
    alertas: buildAlertas(linhas, jornada),
    meta: {
      versaoApontamentos,
      geradoEm: new Date().toISOString(),
    },
  }
}

/**
 * Snapshot completo do dashboard — sempre filtrar com `aplicarFiltrosDashboard` na UI,
 * nunca recomputar KPIs na página.
 */
export function buildDashboardOperacional(
  opts?: BuildDashboardOperacionalOpts,
): DashboardOperacional {
  const linhas =
    opts?.backlogRows ?? [...BACKLOG_MOCK_ROWS, ...getEsteirasExtraSnapshot()]
  const esteiras = resolveOperacoes()
  const todosApontamentos =
    opts?.apontamentosLista ?? listarTodosApontamentosOperacionais()
  const jornada = buildJornadaColaboradorOperacional()
  const v = opts?.versaoApontamentos ?? getApontamentosVersion()

  return assembleDashboard(linhas, esteiras, todosApontamentos, jornada, v)
}

/** Alias explícito para protótipo / testes. */
export function getDashboardOperacionalMock(
  opts?: BuildDashboardOperacionalOpts,
): DashboardOperacional {
  return buildDashboardOperacional(opts)
}

function matchesBuscaLinha(row: BacklogRow, q: string): boolean {
  const s = q.toLowerCase()
  return (
    row.ref.toLowerCase().includes(s) ||
    row.name.toLowerCase().includes(s) ||
    row.responsible.toLowerCase().includes(s)
  )
}

function matchesBuscaEsteira(op: EsteiraOperacionalDetalhe, q: string): boolean {
  const s = q.toLowerCase()
  return (
    op.ref.toLowerCase().includes(s) ||
    op.nome.toLowerCase().includes(s) ||
    op.veiculo.toLowerCase().includes(s)
  )
}

/**
 * Aplica filtros sobre o agregado já construído — cards e listas permanecem coerentes.
 * Deve receber o snapshot integral de `buildDashboardOperacional` (não encadear sobre resultado já filtrado).
 */
export function aplicarFiltrosDashboard(
  agregado: DashboardOperacional,
  filtros: DashboardOperacionalFiltros,
): DashboardOperacional {
  const f = filtros
  let linhas = agregado.blocoEntrada.linhas.slice()
  let esteiras = agregado.blocoOperacao.esteiras.slice()

  if (f.escopoEntrada === 'somente_no_backlog') {
    linhas = linhas.filter((r) => r.status === 'no_backlog')
  }

  if (f.statusEsteira && f.statusEsteira !== 'all') {
    esteiras = esteiras.filter((e) => e.statusGeral === f.statusEsteira)
  }

  if (f.buscaTexto?.trim()) {
    const q = f.buscaTexto.trim()
    linhas = linhas.filter((r) => matchesBuscaLinha(r, q))
    esteiras = esteiras.filter((e) => matchesBuscaEsteira(e, q))
  }

  if (f.statusAtividade && f.statusAtividade !== 'all') {
    esteiras = esteiras.filter((op) =>
      op.blocos.some((b) =>
        b.atividades.some((a) => a.status === f.statusAtividade),
      ),
    )
  }

  if (f.somenteApontaveis) {
    esteiras = esteiras.filter((op) =>
      op.blocos.some((b) => b.atividades.some((a) => a.apontabilidade.apontavel)),
    )
  }

  if (f.somenteComApontamento) {
    esteiras = esteiras.filter((op) => {
      for (const b of op.blocos) {
        for (const a of b.atividades) {
          const h = obterHistoricoAgregadoAtividade(op.esteiraId, a.id)
          if (h.quantidade > 0) return true
        }
      }
      return false
    })
  }

  if (f.responsavelChave) {
    const jFull = agregado.blocoResponsaveis.agregado
    const row = jFull.porResponsavel.find(
      (r) => r.responsavelChaveAgregacao === f.responsavelChave,
    )
    const allowed = row
      ? new Set(row.carteira.map((l) => l.esteiraId))
      : new Set<string>()
    esteiras = esteiras.filter((e) => allowed.has(e.esteiraId))
  }

  const ids = new Set(esteiras.map((e) => e.esteiraId))
  const todos = listarTodosApontamentosOperacionais()
  const apFiltrados = todos.filter((a) => ids.has(a.esteiraId))

  let jornada = refiltrarJornadaAgregadoPorEsteiraIds(
    agregado.blocoResponsaveis.agregado,
    ids,
  )

  if (f.responsavelChave) {
    jornada = aplicarFiltrosJornada(jornada, { responsavelChave: f.responsavelChave })
  }

  return assembleDashboard(
    linhas,
    esteiras,
    apFiltrados,
    jornada,
    agregado.meta.versaoApontamentos,
  )
}

/** Soma de minutos por atividade — deve coincidir com `listarTodosApontamentosOperacionais` no conjunto global. */
export function somaMinutosApontamentosPorAtividadeGlobal(): number {
  const flat = flattenAtividadesOperacionais(resolveOperacoes())
  return flat.reduce(
    (s, { esteiraId, atividade }) =>
      s + obterHistoricoAgregadoAtividade(esteiraId, atividade.id).totalMinutos,
    0,
  )
}
