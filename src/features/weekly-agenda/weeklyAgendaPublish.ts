export type WeeklyAgendaPublishGateInput = {
  busy: boolean
  dirty: boolean
  draftItemsCount: number
  hasPlan: boolean
  planStatus: 'DRAFT' | 'PUBLISHED' | null | undefined
}

/** Espelha a regra de `disabled` do botão Publicar em OperationalPlanningPage. */
export function isWeeklyAgendaPublishDisabled(input: WeeklyAgendaPublishGateInput): boolean {
  return (
    input.busy ||
    input.dirty ||
    input.draftItemsCount === 0 ||
    !input.hasPlan ||
    input.planStatus === 'PUBLISHED'
  )
}

export function canPublishWeeklyAgendaPlan(input: WeeklyAgendaPublishGateInput): boolean {
  return !isWeeklyAgendaPublishDisabled(input)
}
