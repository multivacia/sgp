/**
 * Séries para visualização em barras — derivadas exclusivamente do snapshot
 * `DashboardOperacional` (mesma agregação dos cards). Não iterar esteiras/apontamentos
 * na UI do gráfico; usar apenas estes helpers.
 */

import type { BacklogStatus } from '../mocks/backlog'
import type { DashboardOperacional } from '../mocks/dashboard-operacional'
import type { AtividadeStatusDetalhe, EsteiraStatusGeral } from '../mocks/esteira-detalhe'
import {
  ATIVIDADE_STATUS_DETALHE_LABELS,
  BACKLOG_STATUS_LABELS,
  ESTEIRA_STATUS_GERAL_LABELS,
} from './sgp-semantica-labels'

export type DashboardOperacionalSerieItem = {
  key: string
  label: string
  value: number
}

const ORDER_ESTEIRA: EsteiraStatusGeral[] = [
  'em_execucao',
  'pausada',
  'concluida',
  'no_backlog',
]

const ORDER_ATIVIDADE: AtividadeStatusDetalhe[] = [
  'pendente',
  'pronta',
  'em_execucao',
  'pausada',
  'concluida',
  'bloqueada',
]

export const ORDER_BACKLOG_STATUS: BacklogStatus[] = [
  'no_backlog',
  'em_revisao',
  'pronta_liberar',
  'em_producao',
  'concluida',
]

export function somaSerie(items: DashboardOperacionalSerieItem[]): number {
  return items.reduce((s, x) => s + x.value, 0)
}

/** Distribuição da fila por status de backlog — soma = `kpis.entrada.totalLinhas`. */
export function dashSeriesEntradaPorStatusBacklog(
  dash: DashboardOperacional,
): DashboardOperacionalSerieItem[] {
  const rec = dash.kpis.entrada.porStatusBacklog
  return ORDER_BACKLOG_STATUS.map((k) => ({
    key: k,
    label: BACKLOG_STATUS_LABELS[k],
    value: rec[k] ?? 0,
  }))
}

export function dashSeriesEsteirasPorStatus(
  dash: DashboardOperacional,
): DashboardOperacionalSerieItem[] {
  const rec = dash.kpis.operacao.esteirasPorStatusGeral
  return ORDER_ESTEIRA.map((k) => ({
    key: k,
    label: ESTEIRA_STATUS_GERAL_LABELS[k],
    value: rec[k],
  }))
}

export function dashSeriesAtividadesPorStatus(
  dash: DashboardOperacional,
): DashboardOperacionalSerieItem[] {
  const rec = dash.kpis.operacao.atividadesPorStatus
  return ORDER_ATIVIDADE.map((k) => ({
    key: k,
    label: ATIVIDADE_STATUS_DETALHE_LABELS[k],
    value: rec[k],
  }))
}

/** Uma barra por responsável — quantidade de atividades (mesmo critério dos cards). */
export function dashSeriesResponsaveisAtividades(
  dash: DashboardOperacional,
): DashboardOperacionalSerieItem[] {
  return dash.blocoResponsaveis.agregado.porResponsavel.map((r) => ({
    key: r.responsavelChaveAgregacao,
    label: r.responsavelNome,
    value: r.quantidadeAtividades,
  }))
}

/** Uma barra por responsável — minutos apontados (mesmo critério dos cards). */
export function dashSeriesResponsaveisMinutosApontados(
  dash: DashboardOperacional,
): DashboardOperacionalSerieItem[] {
  return dash.blocoResponsaveis.agregado.porResponsavel.map((r) => ({
    key: r.responsavelChaveAgregacao,
    label: r.responsavelNome,
    value: r.minutosApontados,
  }))
}
