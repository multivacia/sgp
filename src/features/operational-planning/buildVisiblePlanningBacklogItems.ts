/** Referência mínima de item planejado para ocultar do backlog. */
export type PlanningBacklogPlanRef = {
  activityNodeId: string
  removed?: boolean
  cancelled?: boolean
}

/**
 * Itens do backlog visíveis na semana: exclui atividades já presentes no plano
 * (qualquer dia), exceto itens marcados como removidos/cancelados localmente.
 */
export function buildVisiblePlanningBacklogItems<
  TBacklog extends { activityNodeId: string },
  TPlanned extends PlanningBacklogPlanRef,
>(backlogItems: readonly TBacklog[], plannedItems: readonly TPlanned[]): TBacklog[] {
  const plannedActivityNodeIds = new Set(
    plannedItems
      .filter((item) => !item.removed && !item.cancelled)
      .map((item) => item.activityNodeId),
  )
  return backlogItems.filter((item) => !plannedActivityNodeIds.has(item.activityNodeId))
}
