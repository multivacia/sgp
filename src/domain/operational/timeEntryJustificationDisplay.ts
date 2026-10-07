/**
 * Linhas de justificativa visíveis de um apontamento de esteira.
 *
 * Exceção de alocação e fora de sequência já trazem o texto efetivo (texto livre ou
 * "rótulo — complemento" do catálogo). A justificativa padronizada voluntária só existe
 * no snapshot do catálogo, por isso aparece apenas quando não há justificativa contextual.
 */
export type TimeEntryJustificationSource = {
  entryOrigin?: 'ASSIGNED' | 'UNASSIGNED_EXCEPTION'
  exceptionJustification?: string | null
  isOutOfSequence?: boolean
  outOfSequenceJustification?: string | null
  standardJustificationLabel?: string | null
  standardJustificationComplement?: string | null
}

export type TimeEntryJustificationLine = {
  kind: 'exception' | 'out_of_sequence' | 'standard'
  label: string
  text: string
}

export function formatStandardJustificationText(
  label: string | null | undefined,
  complement: string | null | undefined,
): string | null {
  const l = label?.trim()
  if (!l) return null
  const c = complement?.trim()
  return c ? `${l} — ${c}` : l
}

export function resolveTimeEntryJustificationLines(
  entry: TimeEntryJustificationSource,
): TimeEntryJustificationLine[] {
  const lines: TimeEntryJustificationLine[] = []
  const exception = entry.exceptionJustification?.trim()
  if (exception) {
    lines.push({ kind: 'exception', label: 'Justificativa (exceção)', text: exception })
  }
  const oos = entry.outOfSequenceJustification?.trim()
  if (oos) {
    lines.push({
      kind: 'out_of_sequence',
      label: 'Justificativa (fora de sequência)',
      text: oos,
    })
  }
  if (lines.length === 0) {
    const standard = formatStandardJustificationText(
      entry.standardJustificationLabel,
      entry.standardJustificationComplement,
    )
    if (standard) lines.push({ kind: 'standard', label: 'Justificativa', text: standard })
  }
  return lines
}
