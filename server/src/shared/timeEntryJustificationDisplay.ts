/**
 * Texto de exibição das justificativas de um apontamento de esteira.
 *
 * - Exceção de alocação e fora de sequência gravam o texto efetivo (legado ou
 *   "rótulo — complemento" do catálogo) em colunas próprias.
 * - Justificativa voluntária (apontamento normal) fica somente no snapshot do
 *   catálogo (`standard_justification_*`), por isso entra como fallback.
 */
export function formatStandardJustification(
  label: string | null | undefined,
  complement: string | null | undefined,
): string | null {
  const l = label?.trim()
  if (!l) return null
  const c = complement?.trim()
  return c ? `${l} — ${c}` : l
}

export function resolveTimeEntryJustificationText(input: {
  exceptionJustification: string | null | undefined
  outOfSequenceJustification: string | null | undefined
  standardJustificationLabel: string | null | undefined
  standardJustificationComplement: string | null | undefined
}): string | null {
  const contextual = [input.exceptionJustification, input.outOfSequenceJustification]
    .map((j) => j?.trim())
    .filter((j): j is string => Boolean(j))
  if (contextual.length > 0) return contextual.join(' · ')
  return formatStandardJustification(
    input.standardJustificationLabel,
    input.standardJustificationComplement,
  )
}
