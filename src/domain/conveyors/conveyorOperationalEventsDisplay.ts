import type { ConveyorStructure } from './conveyor.types'
import type {
  ConveyorOperationalEvent,
  OperationalEventTimelineFilterCategory,
} from './conveyorOperationalEvents.types'
import { filterOperationalEventsByCategory } from './operationalEventTaxonomy'

export type { OperationalEventDateGroup } from './operationalEventTaxonomy'

export { groupOperationalEventsByLocalDate, localDayKeyFromIso } from './operationalEventTaxonomy'

export function buildConveyorStepDisplayNameById(structure: ConveyorStructure): Map<string, string> {
  const m = new Map<string, string>()
  for (const opt of structure.options) {
    for (const area of opt.areas) {
      for (const st of area.steps) {
        const name = st.name?.trim()
        m.set(st.id, name || `Etapa ${st.orderIndex}`)
      }
    }
  }
  return m
}

/** Linha “Atividade: …” ou “Atividade vinculada”; nunca UUID como foco. */
export function getOperationalActivityDisplayLine(
  event: ConveyorOperationalEvent,
  stepNameById: Map<string, string>,
): string | null {
  if (!event.nodeId?.trim()) return null
  const name = stepNameById.get(event.nodeId)?.trim()
  if (name) return `Atividade: ${name}`
  return 'Atividade vinculada'
}

export function filterOperationalEvents(
  events: ConveyorOperationalEvent[],
  filter: OperationalEventTimelineFilterCategory,
): ConveyorOperationalEvent[] {
  return filterOperationalEventsByCategory(events, filter)
}
