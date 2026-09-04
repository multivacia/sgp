/** Referência mínima de item planejado para ocultar do backlog. */
export type PlanningBacklogPlanRef = {
  activityNodeId: string
  removed?: boolean
  cancelled?: boolean
}

/**
 * Une backlog remoto com devoluções locais ainda não persistidas.
 * Remotos prevalecem; locais só entram se o activityNodeId ainda não existir.
 */
export function mergeRemoteAndLocalPlanningBacklogItems<T extends { activityNodeId: string }>(
  remoteBacklog: readonly T[],
  localReturns: readonly T[],
): T[] {
  const byId = new Map<string, T>()
  for (const item of remoteBacklog) {
    const id = item.activityNodeId?.trim()
    if (!id) continue
    byId.set(id, item)
  }
  for (const item of localReturns) {
    const id = item.activityNodeId?.trim()
    if (!id || byId.has(id)) continue
    byId.set(id, item)
  }
  return [...byId.values()]
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
