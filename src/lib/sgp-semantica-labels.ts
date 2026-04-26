/**
 * Rótulos humanos únicos para enums da espinha dorsal — evita divergência entre telas.
 */
import type { BacklogStatus } from '../mocks/backlog'
import type {
  AtividadeStatusDetalhe,
  EsteiraStatusGeral,
} from '../mocks/esteira-detalhe'

export const BACKLOG_STATUS_LABELS: Record<BacklogStatus, string> = {
  no_backlog: 'No backlog',
  em_revisao: 'Em revisão',
  pronta_liberar: 'Pronta p/ liberar',
  em_producao: 'Em produção',
  concluida: 'Concluída',
}

export const ESTEIRA_STATUS_GERAL_LABELS: Record<EsteiraStatusGeral, string> = {
  em_execucao: 'Em execução',
  pausada: 'Pausada',
  concluida: 'Concluída',
  no_backlog: 'No backlog',
}

export const ATIVIDADE_STATUS_DETALHE_LABELS: Record<
  AtividadeStatusDetalhe,
  string
> = {
  pendente: 'Pendente',
  pronta: 'Pronta',
  em_execucao: 'Em execução',
  pausada: 'Pausada',
  concluida: 'Concluída',
  bloqueada: 'Bloqueada',
}

export function labelBacklogStatus(s: BacklogStatus): string {
  return BACKLOG_STATUS_LABELS[s]
}

export function labelEsteiraStatusGeral(s: EsteiraStatusGeral): string {
  return ESTEIRA_STATUS_GERAL_LABELS[s]
}

export function labelAtividadeStatusDetalhe(s: AtividadeStatusDetalhe): string {
  return ATIVIDADE_STATUS_DETALHE_LABELS[s]
}
