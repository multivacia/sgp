import type {
  ConveyorOperationalEvent,
  OperationalEventCategory,
  OperationalEventSeverity,
  OperationalEventTimelineFilterCategory,
} from './conveyorOperationalEvents.types'

export type {
  OperationalEventCategory,
  OperationalEventSeverity,
  OperationalEventTimelineFilterCategory,
} from './conveyorOperationalEvents.types'

export function getOperationalEventDisplayLabel(eventType: string): string {
  switch (eventType) {
    case 'CONVEYOR_ENTERED_DELAY':
      return 'Esteira entrou em atraso'
    case 'CONVEYOR_LEFT_DELAY':
      return 'Esteira saiu do atraso'
    case 'CONVEYOR_STEP_COMPLETED':
      return 'Atividade concluída'
    case 'CONVEYOR_STEP_REOPENED':
      return 'Atividade reaberta'
    case 'CONVEYOR_STEP_ABORTED':
      return 'Atividade dispensada'
    case 'CONVEYOR_STEP_RESTORED':
      return 'Dispensa restaurada'
    case 'CONVEYOR_STRUCTURE_ITEM_ADDED':
      return 'Item incluído na esteira'
    case 'CONVEYOR_STEP_BLOCKED':
      return 'Atividade bloqueada'
    case 'CONVEYOR_STEP_UNBLOCKED':
      return 'Atividade desbloqueada'
    case 'CONVEYOR_STEP_PAUSED':
      return 'Atividade pausada'
    case 'CONVEYOR_STEP_RESUMED':
      return 'Atividade retomada'
    case 'CONVEYOR_RETURNED_TO_BACKLOG':
      return 'Esteira retornada para backlog'
    case 'CONVEYOR_RETURNED_TO_PLANNING':
      return 'Esteira retornada para planejamento'
    case 'MANUAL_NOTE':
      return 'Observação operacional'
    default:
      return 'Evento operacional'
  }
}

export function getOperationalEventCategory(eventType: string): OperationalEventCategory {
  switch (eventType) {
    case 'CONVEYOR_ENTERED_DELAY':
    case 'CONVEYOR_LEFT_DELAY':
      return 'delay'
    case 'CONVEYOR_STEP_COMPLETED':
      return 'completion'
    case 'CONVEYOR_STEP_REOPENED':
    case 'CONVEYOR_STEP_RESTORED':
      return 'reopen'
    case 'CONVEYOR_STEP_ABORTED':
      return 'other'
    case 'CONVEYOR_STRUCTURE_ITEM_ADDED':
      return 'other'
    case 'CONVEYOR_STEP_BLOCKED':
    case 'CONVEYOR_STEP_UNBLOCKED':
      return 'block'
    case 'CONVEYOR_STEP_PAUSED':
    case 'CONVEYOR_STEP_RESUMED':
      return 'pause'
    case 'MANUAL_NOTE':
      return 'note'
    default:
      return 'other'
  }
}

export function getOperationalEventCategoryLabel(category: string): string {
  switch (category) {
    case 'all':
      return 'Todos'
    case 'delay':
      return 'Atrasos'
    case 'completion':
      return 'Conclusões'
    case 'reopen':
      return 'Reaberturas'
    case 'block':
      return 'Bloqueios'
    case 'pause':
      return 'Paradas'
    case 'note':
      return 'Observações'
    case 'system':
      return 'Sistema'
    case 'other':
      return 'Outros'
    default:
      return category
  }
}

/** Chip curto por categoria (linha do evento). */
export function getOperationalEventCategoryChip(category: OperationalEventCategory): string {
  switch (category) {
    case 'delay':
      return 'Atraso'
    case 'completion':
      return 'Conclusão'
    case 'reopen':
      return 'Reabertura'
    case 'block':
      return 'Bloqueio'
    case 'pause':
      return 'Parada'
    case 'note':
      return 'Observação'
    case 'system':
      return 'Sistema'
    case 'other':
      return 'Outro'
    default:
      return 'Outro'
  }
}

export function getOperationalEventSeverity(eventType: string): OperationalEventSeverity {
  switch (eventType) {
    case 'CONVEYOR_ENTERED_DELAY':
      return 'warning'
    case 'CONVEYOR_LEFT_DELAY':
      return 'success'
    case 'CONVEYOR_STEP_COMPLETED':
      return 'success'
    case 'CONVEYOR_STEP_REOPENED':
    case 'CONVEYOR_STEP_RESTORED':
      return 'warning'
    case 'CONVEYOR_STEP_ABORTED':
      return 'warning'
    case 'CONVEYOR_STRUCTURE_ITEM_ADDED':
      return 'info'
    case 'CONVEYOR_STEP_BLOCKED':
      return 'critical'
    case 'CONVEYOR_STEP_UNBLOCKED':
      return 'success'
    case 'CONVEYOR_STEP_PAUSED':
      return 'warning'
    case 'CONVEYOR_STEP_RESUMED':
      return 'success'
    case 'MANUAL_NOTE':
      return 'info'
    default:
      return 'info'
  }
}

export function filterOperationalEventsByCategory(
  events: ConveyorOperationalEvent[],
  selectedCategory: OperationalEventTimelineFilterCategory,
): ConveyorOperationalEvent[] {
  if (selectedCategory === 'all') return events
  return events.filter((e) => getOperationalEventCategory(e.eventType) === selectedCategory)
}

export type OperationalEventDateGroup = {
  dateKey: string
  label: string
  events: ConveyorOperationalEvent[]
}

function localDayKeyFromDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Chave yyyy-mm-dd no calendário local do instante ISO (sem dependências externas). */
export function localDayKeyFromIso(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'invalid'
  return localDayKeyFromDate(d)
}

function dateLabelForGroup(dayKey: string, now: Date): string {
  if (dayKey === 'invalid') return 'Data desconhecida'
  const todayKey = localDayKeyFromDate(now)
  const y = new Date(now)
  y.setDate(y.getDate() - 1)
  const yesterdayKey = localDayKeyFromDate(y)
  if (dayKey === todayKey) return 'Hoje'
  if (dayKey === yesterdayKey) return 'Ontem'
  const [ys, ms, ds] = dayKey.split('-')
  const yn = Number(ys)
  const mn = Number(ms)
  const dn = Number(ds)
  if (!Number.isFinite(yn) || !Number.isFinite(mn) || !Number.isFinite(dn)) return dayKey
  const local = new Date(yn, mn - 1, dn)
  return local.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function compareOccurredDesc(a: ConveyorOperationalEvent, b: ConveyorOperationalEvent): number {
  return new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
}

/**
 * Agrupa por data local. Eventos dentro de cada grupo: mais recentes primeiro.
 */
export function groupOperationalEventsByLocalDate(
  events: ConveyorOperationalEvent[],
  now: Date = new Date(),
): OperationalEventDateGroup[] {
  const sorted = [...events].sort(compareOccurredDesc)
  const byDay = new Map<string, ConveyorOperationalEvent[]>()
  for (const ev of sorted) {
    const key = localDayKeyFromIso(ev.occurredAt)
    const list = byDay.get(key)
    if (list) list.push(ev)
    else byDay.set(key, [ev])
  }
  const keys = [...byDay.keys()].sort((a, b) => {
    if (a === 'invalid') return 1
    if (b === 'invalid') return -1
    return a < b ? 1 : a > b ? -1 : 0
  })
  return keys.map((dateKey) => ({
    dateKey,
    label: dateLabelForGroup(dateKey, now),
    events: byDay.get(dateKey) ?? [],
  }))
}

/** Texto seguro a partir de metadata (ex.: nota de conclusão), sem JSON bruto. */
export function getSafeOperationalEventNotePreview(event: ConveyorOperationalEvent): string | null {
  const meta = event.metadataJson
  if (!meta || typeof meta !== 'object') return null
  const note = (meta as { note?: unknown }).note
  if (typeof note === 'string' && note.trim()) return note.trim().slice(0, 500)
  return null
}

/** Motivo técnico curto para exibição amigável (evita mostrar códigos crus como única linha). */
export function formatOperationalEventReasonLine(event: ConveyorOperationalEvent): string | null {
  const meta = event.metadataJson
  if (meta && typeof meta === 'object') {
    const m = meta as {
      reasonLabelSnapshot?: unknown
      reasonLabel?: unknown
      reasonText?: unknown
      lateAddReason?: unknown
      reason?: unknown
      previousAbort?: {
        abortReasonLabelSnapshot?: unknown
        abortReasonCode?: unknown
        abortReasonText?: unknown
      }
    }
    const lateReason =
      (typeof m.lateAddReason === 'string' && m.lateAddReason.trim()) ||
      (typeof m.reason === 'string' && m.reason.trim()) ||
      null
    if (event.eventType === 'CONVEYOR_STRUCTURE_ITEM_ADDED' && lateReason) {
      return lateReason.length > 160 ? `${lateReason.slice(0, 157)}…` : lateReason
    }
    const snap =
      (typeof m.reasonLabelSnapshot === 'string' && m.reasonLabelSnapshot.trim()) ||
      (typeof m.reasonLabel === 'string' && m.reasonLabel.trim()) ||
      null
    if (snap) {
      const text =
        typeof m.reasonText === 'string' && m.reasonText.trim() ? m.reasonText.trim() : null
      return text ? `${snap} — ${text}` : snap
    }
    const prev = m.previousAbort
    if (prev && typeof prev === 'object') {
      const prevSnap =
        (typeof prev.abortReasonLabelSnapshot === 'string' &&
          prev.abortReasonLabelSnapshot.trim()) ||
        (typeof prev.abortReasonCode === 'string' && prev.abortReasonCode.trim()) ||
        null
      if (prevSnap) {
        const text =
          typeof prev.abortReasonText === 'string' && prev.abortReasonText.trim()
            ? prev.abortReasonText.trim()
            : null
        return text ? `Dispensa anterior: ${prevSnap} — ${text}` : `Dispensa anterior: ${prevSnap}`
      }
    }
  }

  const r = (event.reason ?? '').trim()
  if (!r) return null
  const u = r.toUpperCase()
  if (u === 'LATE_STRUCTURE_APPEND') return 'Inclusão tardia de item na estrutura.'
  if (u === 'EXPLICITLY_COMPLETED') return 'Conclusão registrada manualmente.'
  if (u === 'EXPLICITLY_REOPENED') return 'Reabertura registrada manualmente.'
  if (u === 'EXPLICITLY_RESTORED_FROM_ABORTED') return 'Restauração explícita de dispensa.'
  if (u === 'DEADLINE_EXCEEDED_WITH_PENDING_WORK') return 'Prazo estimado ultrapassado com trabalho pendente.'
  if (u === 'ON_TIME') return 'Dentro do prazo.'
  if (u === 'NO_PENDING_WORK') return 'Sem trabalho pendente.'
  if (u === 'NO_DEADLINE') return 'Sem prazo estimado definido.'
  if (u === 'COMPLETED') return 'Esteira concluída.'
  if (r.length > 160) return `${r.slice(0, 157)}…`
  return r
}
