import type {
  ConveyorOperationalEvent,
  ConveyorOperationalEventDisplay,
} from './conveyorOperationalEvents.types'

export function formatConveyorOperationalEvent(
  event: ConveyorOperationalEvent,
): ConveyorOperationalEventDisplay {
  switch (event.eventType) {
    case 'CONVEYOR_ENTERED_DELAY':
      return {
        label: 'Esteira entrou em atraso',
        description: event.reason ?? 'A esteira passou para estado de atraso.',
        tone: 'warning',
      }
    case 'CONVEYOR_LEFT_DELAY':
      return {
        label: 'Esteira saiu de atraso',
        description: event.reason ?? 'A esteira deixou o estado de atraso.',
        tone: 'success',
      }
    case 'CONVEYOR_STEP_COMPLETED':
      return {
        label: 'Atividade concluída',
        description: event.reason ?? 'Uma atividade atingiu o planejado.',
        tone: 'success',
      }
    case 'MANUAL_NOTE':
      return {
        label: 'Nota operacional',
        description: event.reason ?? 'Nota operacional registrada.',
        tone: 'neutral',
      }
    default:
      return {
        label: event.eventType,
        description: event.reason ?? 'Evento operacional registrado.',
        tone: 'neutral',
      }
  }
}

