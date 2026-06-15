import type { ConveyorOperationalStatus } from './conveyor.types'

export type ConveyorLifecycleReturnAction =
  | 'RETURN_TO_BACKLOG'
  | 'RETURN_TO_PLANNING'

export type ConveyorLifecycleReturnActionConfig = {
  action: ConveyorLifecycleReturnAction
  label: string
}

const RETURN_TO_BACKLOG_SOURCES: readonly ConveyorOperationalStatus[] = [
  'EM_PLANEJAMENTO',
  'A_INICIAR',
  'EM_ANDAMENTO',
]

const RETURN_TO_PLANNING_SOURCES: readonly ConveyorOperationalStatus[] = [
  'A_INICIAR',
  'EM_ANDAMENTO',
]

export const CONVEYOR_RETURN_REASON_MIN = 3
export const CONVEYOR_RETURN_REASON_MAX = 500

export type ConveyorReturnModalCopy = {
  title: string
  description: string
  confirmLabel: string
  successToast: string
}

export const CONVEYOR_RETURN_TO_BACKLOG_MODAL: ConveyorReturnModalCopy = {
  title: 'Voltar esteira para backlog?',
  description:
    'Esta ação remove a esteira da produção ou do planejamento ativo e retorna para a fila de planejamento da fábrica.\n\nO histórico, os apontamentos e a estrutura da esteira serão preservados.',
  confirmLabel: 'Voltar para backlog',
  successToast: 'Esteira retornada para backlog.',
}

export const CONVEYOR_RETURN_TO_PLANNING_MODAL: ConveyorReturnModalCopy = {
  title: 'Voltar esteira para planejamento?',
  description:
    'Esta ação remove a esteira da fila de produção e permite ajustar responsáveis, sequência, datas ou estrutura planejada.\n\nO histórico e os apontamentos já registrados serão preservados.',
  confirmLabel: 'Voltar para planejamento',
  successToast: 'Esteira retornada para planejamento.',
}

export function getConveyorLifecycleReturnActions(
  status: ConveyorOperationalStatus,
): ConveyorLifecycleReturnActionConfig[] {
  const actions: ConveyorLifecycleReturnActionConfig[] = []
  if ((RETURN_TO_PLANNING_SOURCES as readonly string[]).includes(status)) {
    actions.push({
      action: 'RETURN_TO_PLANNING',
      label: 'Voltar para planejamento',
    })
  }
  if ((RETURN_TO_BACKLOG_SOURCES as readonly string[]).includes(status)) {
    actions.push({
      action: 'RETURN_TO_BACKLOG',
      label: 'Voltar para backlog',
    })
  }
  return actions
}

export function validateConveyorReturnReason(reason: string): string | null {
  const trimmed = reason.trim()
  if (!trimmed.length || trimmed.length < CONVEYOR_RETURN_REASON_MIN) {
    return 'Informe o motivo para continuar.'
  }
  if (trimmed.length > CONVEYOR_RETURN_REASON_MAX) {
    return `O motivo deve ter no máximo ${CONVEYOR_RETURN_REASON_MAX} caracteres.`
  }
  return null
}

export function getConveyorReturnModalCopy(
  action: ConveyorLifecycleReturnAction,
): ConveyorReturnModalCopy {
  return action === 'RETURN_TO_BACKLOG'
    ? CONVEYOR_RETURN_TO_BACKLOG_MODAL
    : CONVEYOR_RETURN_TO_PLANNING_MODAL
}

export function getConveyorReturnApiEndpoint(
  conveyorId: string,
  action: ConveyorLifecycleReturnAction,
): string {
  const path =
    action === 'RETURN_TO_BACKLOG'
      ? 'return-to-backlog'
      : 'return-to-planning'
  return `/api/v1/conveyors/${encodeURIComponent(conveyorId)}/${path}`
}
