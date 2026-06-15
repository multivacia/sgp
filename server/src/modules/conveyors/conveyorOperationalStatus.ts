/**
 * Ciclo de vida oficial das esteiras (Item A — sprint status).
 * Valores persistidos em `conveyors.operational_status` (VARCHAR + CHECK).
 */

export const CONVEYOR_OPERATIONAL_STATUSES = [
  'EM_ELABORACAO',
  'AGUARDANDO_PLANEJAMENTO',
  'EM_PLANEJAMENTO',
  'A_INICIAR',
  'EM_ANDAMENTO',
  'FINALIZADA',
  'CANCELADA',
] as const

export type ConveyorOperationalStatusDb =
  (typeof CONVEYOR_OPERATIONAL_STATUSES)[number]

/** Status legados removidos do pipeline — usados só na migração de dados. */
export const LEGACY_CONVEYOR_OPERATIONAL_STATUS_MAP: Record<string, ConveyorOperationalStatusDb> =
  {
    NO_BACKLOG: 'EM_ELABORACAO',
    EM_REVISAO: 'AGUARDANDO_PLANEJAMENTO',
    PRONTA_LIBERAR: 'A_INICIAR',
    EM_PRODUCAO: 'EM_ANDAMENTO',
    CONCLUIDA: 'FINALIZADA',
  }

export const CONVEYOR_OPERATIONAL_STATUS_LABELS: Record<
  ConveyorOperationalStatusDb,
  string
> = {
  EM_ELABORACAO: 'Rascunho / Em elaboração',
  AGUARDANDO_PLANEJAMENTO: 'Aguardando planejamento',
  EM_PLANEJAMENTO: 'Em planejamento',
  A_INICIAR: 'A iniciar',
  EM_ANDAMENTO: 'Em andamento',
  FINALIZADA: 'Finalizada',
  CANCELADA: 'Cancelada',
}

export const CONVEYOR_OPERATIONAL_STATUS_DEFAULT: ConveyorOperationalStatusDb =
  'EM_ELABORACAO'

/** Status em que colaboradores podem apontar horas. */
export const CONVEYOR_TIME_ENTRY_ALLOWED_STATUSES: readonly ConveyorOperationalStatusDb[] =
  ['A_INICIAR', 'EM_ANDAMENTO']

/** Status ocultos para produção / colaboradores (listagens operacionais). */
export const CONVEYOR_PRODUCTION_HIDDEN_STATUSES: readonly ConveyorOperationalStatusDb[] =
  ['EM_ELABORACAO']

/** Transições oficiais (origem|destino). Cancelamento: qualquer → CANCELADA. */
const ALLOWED_STATUS_TRANSITIONS = new Set<string>([
  'EM_ELABORACAO|AGUARDANDO_PLANEJAMENTO',
  'AGUARDANDO_PLANEJAMENTO|EM_PLANEJAMENTO',
  'EM_PLANEJAMENTO|A_INICIAR',
  'EM_ANDAMENTO|FINALIZADA',
])

export function conveyorOperationalStatusLabel(
  status: ConveyorOperationalStatusDb,
): string {
  return CONVEYOR_OPERATIONAL_STATUS_LABELS[status] ?? status
}

export function isConveyorOperationalStatusDb(
  value: string,
): value is ConveyorOperationalStatusDb {
  return (CONVEYOR_OPERATIONAL_STATUSES as readonly string[]).includes(value)
}

export function canTransitionConveyorStatus(
  from: ConveyorOperationalStatusDb,
  to: ConveyorOperationalStatusDb,
): boolean {
  if (from === to) return false
  if (to === 'CANCELADA') return true
  return ALLOWED_STATUS_TRANSITIONS.has(`${from}|${to}`)
}

export function canConveyorAcceptTimeEntry(
  status: ConveyorOperationalStatusDb,
): boolean {
  return (CONVEYOR_TIME_ENTRY_ALLOWED_STATUSES as readonly string[]).includes(
    status,
  )
}

export function isConveyorVisibleToProduction(
  status: ConveyorOperationalStatusDb,
): boolean {
  return !(CONVEYOR_PRODUCTION_HIDDEN_STATUSES as readonly string[]).includes(
    status,
  )
}

export function resolveCompletedAtMode(
  current: ConveyorOperationalStatusDb,
  next: ConveyorOperationalStatusDb,
): 'now' | 'clear' | 'keep' {
  if (next === 'FINALIZADA') return 'now'
  if (current === 'FINALIZADA') return 'clear'
  return 'keep'
}

export function mapLegacyConveyorOperationalStatus(
  legacy: string,
): ConveyorOperationalStatusDb | null {
  return LEGACY_CONVEYOR_OPERATIONAL_STATUS_MAP[legacy] ?? null
}

export function timeEntryBlockedMessage(
  status: ConveyorOperationalStatusDb,
): string {
  switch (status) {
    case 'EM_ELABORACAO':
      return 'Esta esteira ainda não foi liberada para produção.'
    case 'AGUARDANDO_PLANEJAMENTO':
    case 'EM_PLANEJAMENTO':
      return 'Esta esteira está em planejamento e ainda não permite apontamento.'
    case 'FINALIZADA':
      return 'Esta esteira está finalizada e não permite novos apontamentos.'
    case 'CANCELADA':
      return 'Esta esteira está cancelada e não permite novos apontamentos.'
    default:
      return 'Esta esteira não permite apontamento no status atual.'
  }
}

export const CONVEYOR_DELETE_HAS_TIME_ENTRIES_MESSAGE =
  'Esta esteira já possui apontamentos e não pode ser excluída. Cancele ou finalize para preservar o histórico.'

export const CONVEYOR_FINISH_REQUIRES_MANAGER_MESSAGE =
  'Somente o gestor da fábrica pode finalizar esta esteira.'

/** Status de origem permitidos para voltar ao backlog operacional. */
export const CONVEYOR_RETURN_TO_BACKLOG_SOURCE_STATUSES: readonly ConveyorOperationalStatusDb[] =
  ['EM_PLANEJAMENTO', 'A_INICIAR', 'EM_ANDAMENTO']

/** Status de origem permitidos para voltar ao planejamento ativo. */
export const CONVEYOR_RETURN_TO_PLANNING_SOURCE_STATUSES: readonly ConveyorOperationalStatusDb[] =
  ['A_INICIAR', 'EM_ANDAMENTO']

export const CONVEYOR_RETURN_REASON_MIN = 3
export const CONVEYOR_RETURN_REASON_MAX = 500

export const CONVEYOR_RETURN_TO_BACKLOG_BLOCKED_MESSAGE =
  'Esta esteira não pode voltar para backlog a partir do status atual.'

export const CONVEYOR_RETURN_TO_PLANNING_BLOCKED_MESSAGE =
  'Esta esteira não pode voltar para planejamento a partir do status atual.'

export const CONVEYOR_RETURN_REASON_REQUIRED_MESSAGE =
  'Informe o motivo para continuar.'

export const CONVEYOR_STRUCTURE_REPLACE_STATUS_MESSAGE =
  'Substituição de estrutura só é permitida enquanto a esteira está em elaboração ou aguardando planejamento.'

export const CONVEYOR_STRUCTURE_REPLACE_HAS_DEPENDENCIES_MESSAGE =
  'Não é possível alterar a estrutura: existem itens de planejamento vinculados às atividades desta esteira. Remova o planejamento ou volte a esteira para elaboração antes de editar a estrutura.'

export function canReturnConveyorToBacklog(
  from: ConveyorOperationalStatusDb,
): boolean {
  return (CONVEYOR_RETURN_TO_BACKLOG_SOURCE_STATUSES as readonly string[]).includes(
    from,
  )
}

export function canReturnConveyorToPlanning(
  from: ConveyorOperationalStatusDb,
): boolean {
  return (
    CONVEYOR_RETURN_TO_PLANNING_SOURCE_STATUSES as readonly string[]
  ).includes(from)
}
