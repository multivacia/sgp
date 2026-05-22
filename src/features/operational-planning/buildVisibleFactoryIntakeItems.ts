/** Referência mínima de item no rascunho semanal com vínculo ao plano da esteira. */
export type FactoryIntakeDraftRef = {
  conveyorOperationalPlanItemId?: string | null
}

/**
 * Itens aguardando encaixe visíveis: exclui os já presentes no rascunho da semana.
 */
export function buildVisibleFactoryIntakeItems<
  TItem extends { conveyorOperationalPlanItemId: string },
  TDraft extends FactoryIntakeDraftRef,
>(intakeItems: readonly TItem[], draftItems: readonly TDraft[]): TItem[] {
  const inDraft = new Set(
    draftItems
      .map((item) => item.conveyorOperationalPlanItemId)
      .filter((id): id is string => Boolean(id)),
  )
  return intakeItems.filter((item) => !inDraft.has(item.conveyorOperationalPlanItemId))
}
