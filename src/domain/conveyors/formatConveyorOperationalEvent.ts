import type {
  ConveyorOperationalEvent,
  ConveyorOperationalEventDisplay,
} from './conveyorOperationalEvents.types'
import {
  formatOperationalEventReasonLine,
  getOperationalEventCategory,
  getOperationalEventCategoryChip,
  getOperationalEventDisplayLabel,
  getOperationalEventSeverity,
} from './operationalEventTaxonomy'

function mapSeverityToTone(
  severity: ReturnType<typeof getOperationalEventSeverity>,
): ConveyorOperationalEventDisplay['tone'] {
  if (severity === 'success') return 'success'
  if (severity === 'warning' || severity === 'critical') return 'warning'
  return 'neutral'
}

function stepCompletedDescription(event: ConveyorOperationalEvent): string {
  const r = (event.reason ?? '').trim().toUpperCase()
  const base =
    'A atividade foi concluída por ação explícita. O tempo apontado não conclui a etapa; o registro representa uma ação operacional explícita.'
  if (r === 'EXPLICITLY_COMPLETED') {
    return `${base} Conclusão registrada manualmente.`
  }
  if (event.reason?.trim()) return `${base} (${event.reason.trim()})`
  return base
}

function stepReopenedDescription(event: ConveyorOperationalEvent): string {
  const base = 'A atividade foi reaberta por ação explícita.'
  const r = (event.reason ?? '').trim().toUpperCase()
  if (r === 'EXPLICITLY_REOPENED') {
    return `${base} Reabertura registrada manualmente.`
  }
  const line = formatOperationalEventReasonLine(event)
  if (line) return `${base} ${line}`
  return base
}

function delayDescription(event: ConveyorOperationalEvent, entered: boolean): string {
  const friendly = formatOperationalEventReasonLine(event)
  if (friendly) return friendly
  return entered
    ? 'A esteira passou a ser considerada em atraso face ao prazo e à pendência registada.'
    : 'A esteira deixou de ser considerada em atraso face ao prazo e à pendência registada.'
}

function baseDisplay(
  event: ConveyorOperationalEvent,
  description: string,
): ConveyorOperationalEventDisplay {
  const category = getOperationalEventCategory(event.eventType)
  const label = getOperationalEventDisplayLabel(event.eventType)
  const chipLabel = getOperationalEventCategoryChip(category)
  const severity = getOperationalEventSeverity(event.eventType)
  return {
    label,
    description,
    tone: mapSeverityToTone(severity),
    chipLabel,
    category,
    severity,
  }
}

export function formatConveyorOperationalEvent(
  event: ConveyorOperationalEvent,
): ConveyorOperationalEventDisplay {
  switch (event.eventType) {
    case 'CONVEYOR_ENTERED_DELAY':
      return baseDisplay(event, delayDescription(event, true))
    case 'CONVEYOR_LEFT_DELAY':
      return baseDisplay(event, delayDescription(event, false))
    case 'CONVEYOR_STEP_COMPLETED':
      return baseDisplay(event, stepCompletedDescription(event))
    case 'CONVEYOR_STEP_REOPENED':
      return baseDisplay(event, stepReopenedDescription(event))
    case 'CONVEYOR_STEP_ABORTED': {
      const abortReason = formatOperationalEventReasonLine(event)
      return baseDisplay(
        event,
        abortReason
          ? `Atividade dispensada. ${abortReason}`
          : 'A atividade foi dispensada e não entra mais na sequência nem nas filas apontáveis.',
      )
    }
    case 'CONVEYOR_STEP_RESTORED': {
      const prevLine = formatOperationalEventReasonLine(event)
      return baseDisplay(
        event,
        prevLine
          ? `A dispensa foi restaurada. ${prevLine}. A atividade volta elegível a novo planejamento, sem reativar itens cancelados.`
          : 'A dispensa foi restaurada. A atividade volta elegível a novo planejamento, sem reativar itens cancelados.',
      )
    }
    case 'CONVEYOR_STRUCTURE_ITEM_ADDED': {
      const reasonLine = formatOperationalEventReasonLine(event)
      return baseDisplay(
        event,
        reasonLine
          ? `Novo item incluído na estrutura em andamento. ${reasonLine}`
          : 'Novo item incluído na estrutura em andamento. As novas atividades ficam disponíveis no Backlog do Planejamento Semanal.',
      )
    }
    case 'CONVEYOR_STEP_BLOCKED':
      return baseDisplay(
        event,
        formatOperationalEventReasonLine(event) ?? 'A atividade foi marcada como bloqueada.',
      )
    case 'CONVEYOR_STEP_UNBLOCKED':
      return baseDisplay(
        event,
        formatOperationalEventReasonLine(event) ?? 'O bloqueio da atividade foi levantado.',
      )
    case 'CONVEYOR_STEP_PAUSED':
      return baseDisplay(
        event,
        formatOperationalEventReasonLine(event) ?? 'A atividade foi pausada.',
      )
    case 'CONVEYOR_STEP_RESUMED':
      return baseDisplay(
        event,
        formatOperationalEventReasonLine(event) ?? 'A atividade foi retomada.',
      )
    case 'CONVEYOR_RETURNED_TO_BACKLOG':
      return baseDisplay(
        event,
        event.reason?.trim() ||
          'A esteira saiu da produção ou do planejamento ativo e voltou para a fila de planejamento.',
      )
    case 'CONVEYOR_RETURNED_TO_PLANNING':
      return baseDisplay(
        event,
        event.reason?.trim() ||
          'A esteira saiu da fila de produção para ajuste de planejamento.',
      )
    case 'MANUAL_NOTE':
      return baseDisplay(event, event.reason?.trim() || 'Observação operacional registrada.')
    default:
      return baseDisplay(event, event.reason?.trim() || 'Evento operacional registrado.')
  }
}
