import { isPlanningPublishDisabled } from '../operational-planning/operationalPlanningPlanStatusCopy'

export type WeeklyAgendaPublishGateInput = {
  busy: boolean
  dirty: boolean
  draftItemsCount: number
  hasPlan: boolean
  planStatus: 'DRAFT' | 'PUBLISHED' | null | undefined
}

/** Espelha a regra de `disabled` do botão Publicar em OperationalPlanningPage. */
export function isWeeklyAgendaPublishDisabled(input: WeeklyAgendaPublishGateInput): boolean {
  return isPlanningPublishDisabled(input)
}

export function canPublishWeeklyAgendaPlan(input: WeeklyAgendaPublishGateInput): boolean {
  return !isWeeklyAgendaPublishDisabled(input)
}
