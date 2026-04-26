import type {
  ConveyorListItem,
  ConveyorOperationalStatus,
  ConveyorOriginRegister,
} from '../../domain/conveyors/conveyor.types'
import type { BacklogOrigin, BacklogPriority, BacklogRow, BacklogStatus } from '../../mocks/backlog'

export function mapOperationalStatusToUi(s: ConveyorOperationalStatus): BacklogStatus {
  const m: Record<ConveyorOperationalStatus, BacklogStatus> = {
    NO_BACKLOG: 'no_backlog',
    EM_REVISAO: 'em_revisao',
    PRONTA_LIBERAR: 'pronta_liberar',
    EM_PRODUCAO: 'em_producao',
    CONCLUIDA: 'concluida',
  }
  return m[s]
}

function mapOriginRegisterToUi(o: ConveyorOriginRegister): BacklogOrigin {
  if (o === 'MANUAL') return 'manual'
  if (o === 'BASE') return 'base'
  return 'hybrid'
}

/** Monta linha de backlog a partir do GET /api/v1/conveyors. */
export function mapConveyorListItemToBacklogRow(item: ConveyorListItem): BacklogRow {
  const codeLine = item.code?.trim()
  const ref = codeLine && codeLine.length > 0 ? codeLine : item.name.trim() || item.id
  const clientName = item.clientName?.trim() ?? ''

  return {
    id: item.id,
    ref,
    name: item.name,
    origin: mapOriginRegisterToUi(item.originRegister),
    activities: item.totalSteps,
    responsible: item.responsible?.trim() || '—',
    priority: item.priority as BacklogPriority,
    status: mapOperationalStatusToUi(item.operationalStatus),
    enteredAt: item.createdAt,
    esteiraId: item.id,
    completedAt: item.completedAt,
    estimatedDeadline: item.estimatedDeadline ?? null,
    clientName: clientName.length > 0 ? clientName : undefined,
  }
}
