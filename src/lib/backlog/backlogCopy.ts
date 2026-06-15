/**
 * Copy do painel de backlog — alinhada à família semântica V1.5 (buckets operacionais).
 */

import type { BacklogPriorityParam, BacklogSituationFilterValue } from './backlogUrlParams'
import {
  OPERATIONAL_BUCKET_LABELS,
  isOperationalBucketKey,
} from './operationalBuckets'

export const backlogHeaderSemanticLine =
  'Os buckets usam a mesma regra operacional do painel de esteiras.'

export const backlogKpiDeckIntro =
  'Os cards somam todas as esteiras desta lista carregada (mesma regra de bucket). Filtros da tabela não alteram estes totais.'

export const backlogTotalsVsTableFiltered =
  'Os totais dos cards continuam a refletir todas as esteiras carregadas; só a tabela abaixo respeita os filtros.'

export const backlogFilterDetailAtivas =
  'Recorte «não encerradas» (exclui finalizadas e canceladas). Parâmetro de URL preferido: scope=ativas.'

export function backlogFilterDetailConcluidasWindow(days: number): string {
  return `Apenas finalizadas com completed_at nos últimos ${days} dias (alinhado ao dashboard gerencial). Parâmetro: days=${days}.`
}

export const backlogKpiHints = {
  emElaboracao: 'Rascunho administrativo — ainda não visível para produção.',
  aguardandoPlanejamento: 'Cadastro concluído; aguardando aceite do gestor da fábrica.',
  emPlanejamento: 'Gestor planejando equipe, responsáveis e sequência.',
  emExecucao: 'Liberada para produção (a iniciar ou em andamento), sem atraso de prazo.',
  emAtraso: 'Prazo estimado da esteira comparado com hoje (bucket operacional).',
  finalizadas: 'Encerradas operacionalmente nesta lista carregada.',
} as const

export function backlogFiltersSituationLine(
  statusFilter: BacklogSituationFilterValue,
): string {
  if (statusFilter === 'ativas') {
    return 'Ativas: esteiras não finalizadas nem canceladas.'
  }
  if (statusFilter === 'em_atraso') {
    return 'Em atraso: prazo estimado da esteira comparado com hoje.'
  }
  if (statusFilter === 'finalizadas') {
    return 'Finalizadas: use a URL com days= para janela por data de conclusão (completed_at).'
  }
  if (isOperationalBucketKey(statusFilter)) {
    return `${OPERATIONAL_BUCKET_LABELS[statusFilter]}: filtro alinhado ao bucket operacional.`
  }
  return 'Situação: escolha um bucket ou «Ativas» para filtrar a tabela.'
}

export function backlogPriorityDisplay(p: BacklogPriorityParam): string {
  if (p === 'alta') return 'Alta'
  if (p === 'media') return 'Média'
  return 'Baixa'
}

export function backlogSituationChipLabel(
  statusFilter: BacklogSituationFilterValue,
): string | null {
  if (!statusFilter) return null
  if (statusFilter === 'ativas') return 'Ativas'
  if (isOperationalBucketKey(statusFilter)) {
    return OPERATIONAL_BUCKET_LABELS[statusFilter]
  }
  return null
}

export function backlogChipJanelaDias(days: number): string {
  return `Janela: ${days} dias`
}

export function backlogChipBusca(q: string): string {
  const t = q.trim()
  const short = t.length > 36 ? `${t.slice(0, 34)}…` : t
  return `Busca: ${short}`
}

export function backlogChipPrioridade(p: BacklogPriorityParam): string {
  return `Prioridade: ${backlogPriorityDisplay(p)}`
}

export function backlogChipResponsavel(name: string): string {
  return `Responsável: ${name}`
}

export function backlogChipSituacaoPrefixed(
  statusFilter: BacklogSituationFilterValue,
): string | null {
  if (!statusFilter || statusFilter === 'ativas') return null
  const lab = backlogSituationChipLabel(statusFilter)
  return lab ? `Situação: ${lab}` : null
}
