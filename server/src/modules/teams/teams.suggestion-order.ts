/** Próxima ordem de sugestão: maior valor atual + 1 (mínimo 1). */
export function nextTeamMemberSuggestionOrder(
  currentMax: number | null | undefined,
): number {
  if (currentMax == null || !Number.isFinite(currentMax)) return 1
  const n = Math.floor(currentMax)
  return Math.max(1, n + 1)
}
