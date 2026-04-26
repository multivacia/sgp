/**
 * Copy do painel de backlog — alinhada à família semântica V1.5 (buckets operacionais).
 * Não duplicar indicadores de cobertura/pendência/minutos na listagem.
 */

import type { BacklogPriorityParam, BacklogSituationFilterValue } from './backlogUrlParams'
import {
  OPERATIONAL_BUCKET_LABELS,
  type OperationalBucket,
} from './operationalBuckets'

/** Linha curta no header: mesma regra que o painel de esteiras. */
export const backlogHeaderSemanticLine =
  'Os buckets usam a mesma regra operacional do painel de esteiras.'

/** Acima dos KPIs: totais da lista carregada + filtros não alteram os cards. */
export const backlogKpiDeckIntro =
  'Os cards somam todas as esteiras desta lista carregada (mesma regra de bucket). Filtros da tabela não alteram estes totais.'

/** Bloco quando há filtros ativos na tabela. */
export const backlogTotalsVsTableFiltered =
  'Os totais dos cards continuam a refletir todas as esteiras carregadas; só a tabela abaixo respeita os filtros.'

export const backlogFilterDetailAtivas =
  'Recorte «não concluídas» (exclui concluídas). Parâmetro de URL preferido: scope=ativas.'

export function backlogFilterDetailConcluidasWindow(days: number): string {
  return `Apenas concluídas com completed_at nos últimos ${days} dias (alinhado ao dashboard gerencial). Parâmetro: days=${days}.`
}

/** Hints por bucket — labels curtos no cartão; texto de apoio discreto. */
export const backlogKpiHints = {
  noBacklog: 'Na fila operacional, ainda sem execução neste recorte.',
  emRevisao: 'Validação ou retorno de fluxo antes de avançar.',
  emAndamento: 'Em execução ou pronta para liberar, sem atraso de prazo.',
  emAtraso: 'Prazo estimado da esteira comparado com hoje (bucket operacional).',
  concluidas: 'Encerradas operacionalmente nesta lista carregada.',
} as const

/** Linha abaixo do painel de filtros — reforço do recorte «Situação». */
export function backlogFiltersSituationLine(
  statusFilter: BacklogSituationFilterValue,
): string {
  if (statusFilter === 'ativas') {
    return 'Ativas: esteiras não concluídas (qualquer bucket exceto concluídas).'
  }
  if (statusFilter === 'em_atraso') {
    return 'Em atraso: prazo estimado da esteira comparado com hoje.'
  }
  if (statusFilter === 'concluidas') {
    return 'Concluídas: use a URL com days= para janela por data de conclusão (completed_at).'
  }
  if (statusFilter === 'no_backlog') {
    return 'No backlog: ainda não em execução neste recorte.'
  }
  if (statusFilter === 'em_revisao') {
    return 'Em revisão: validação ou retorno de fluxo.'
  }
  if (statusFilter === 'em_andamento') {
    return 'Em andamento: execução ou fila de liberação, sem atraso de prazo.'
  }
  return 'Situação: escolha um bucket ou «Ativas» para filtrar a tabela.'
}

export function backlogPriorityDisplay(p: BacklogPriorityParam): string {
  if (p === 'alta') return 'Alta'
  if (p === 'media') return 'Média'
  return 'Baixa'
}

/** Rótulo curto para chip (alinhado aos labels do select). */
export function backlogSituationChipLabel(
  statusFilter: BacklogSituationFilterValue,
): string | null {
  if (!statusFilter) return null
  if (statusFilter === 'ativas') return 'Ativas'
  if (isOperationalBucket(statusFilter)) {
    return OPERATIONAL_BUCKET_LABELS[statusFilter]
  }
  return null
}

function isOperationalBucket(s: string): s is OperationalBucket {
  return (
    s === 'no_backlog' ||
    s === 'em_revisao' ||
    s === 'em_andamento' ||
    s === 'em_atraso' ||
    s === 'concluidas'
  )
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

/** Chip «Situação: …» quando não é o recorte «Ativas» sozinho. */
export function backlogChipSituacaoPrefixed(
  statusFilter: BacklogSituationFilterValue,
): string | null {
  if (!statusFilter || statusFilter === 'ativas') return null
  const lab = backlogSituationChipLabel(statusFilter)
  return lab ? `Situação: ${lab}` : null
}
