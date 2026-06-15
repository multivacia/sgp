import type { ConveyorOperationalStatus } from './conveyor.types'

export const CONVEYOR_OPERATIONAL_STATUS_LABELS: Record<
  ConveyorOperationalStatus,
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

export type ConveyorStatusTransitionAction = {
  target: ConveyorOperationalStatus
  label: string
}

export const CONVEYOR_STATUS_TRANSITION_ACTIONS: Record<
  ConveyorOperationalStatus,
  ConveyorStatusTransitionAction[]
> = {
  EM_ELABORACAO: [
    { target: 'AGUARDANDO_PLANEJAMENTO', label: 'Enviar para planejamento' },
    { target: 'CANCELADA', label: 'Cancelar esteira' },
  ],
  AGUARDANDO_PLANEJAMENTO: [
    { target: 'EM_PLANEJAMENTO', label: 'Aceitar e iniciar planejamento' },
    { target: 'CANCELADA', label: 'Cancelar esteira' },
  ],
  EM_PLANEJAMENTO: [
    { target: 'A_INICIAR', label: 'Liberar para produção' },
    { target: 'CANCELADA', label: 'Cancelar esteira' },
  ],
  A_INICIAR: [{ target: 'CANCELADA', label: 'Cancelar esteira' }],
  EM_ANDAMENTO: [
    { target: 'FINALIZADA', label: 'Finalizar esteira' },
    { target: 'CANCELADA', label: 'Cancelar esteira' },
  ],
  FINALIZADA: [],
  CANCELADA: [],
}

export function labelConveyorOperationalStatus(
  status: ConveyorOperationalStatus,
): string {
  return CONVEYOR_OPERATIONAL_STATUS_LABELS[status] ?? status
}

export function canShowConveyorStatusTransition(
  status: ConveyorOperationalStatus,
): boolean {
  return CONVEYOR_STATUS_TRANSITION_ACTIONS[status].length > 0
}

export function isConveyorOperationalStatusForProduction(
  status: ConveyorOperationalStatus,
): boolean {
  return status !== 'EM_ELABORACAO'
}

export function canConveyorAcceptTimeEntry(
  status: ConveyorOperationalStatus,
): boolean {
  return status === 'A_INICIAR' || status === 'EM_ANDAMENTO'
}
