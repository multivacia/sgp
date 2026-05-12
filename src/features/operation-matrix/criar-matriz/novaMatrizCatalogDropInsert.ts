/**
 * Calcula o índice de inserção (0…n) ao soltar uma opção do catálogo sobre a lista
 * de opções do rascunho, usando o eixo Y do ponteiro e os retângulos das linhas.
 *
 * - Metade superior da linha i → inserir antes do card i (índice i).
 * - Metade inferior da linha i → inserir depois do card i (índice i + 1).
 * - Acima da primeira linha → 0.
 * - Abaixo da última linha → n.
 */
export function computeInsertIndexFromPointerAndRows(
  clientY: number,
  orderedInstanceIds: readonly string[],
  getRowElement: (instanceId: string) => HTMLElement | null | undefined,
): number {
  if (orderedInstanceIds.length === 0) return 0

  for (let i = 0; i < orderedInstanceIds.length; i++) {
    const el = getRowElement(orderedInstanceIds[i]!)
    if (!el) continue
    const rect = el.getBoundingClientRect()
    if (clientY < rect.top) return i
    if (clientY <= rect.bottom) {
      const mid = rect.top + rect.height / 2
      return clientY < mid ? i : i + 1
    }
  }

  return orderedInstanceIds.length
}

export function clampInsertIndex(index: number, listLength: number): number {
  if (listLength < 0) return 0
  if (Number.isNaN(index)) return listLength
  return Math.max(0, Math.min(Math.trunc(index), listLength))
}
