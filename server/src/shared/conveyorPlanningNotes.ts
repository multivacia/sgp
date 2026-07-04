const PLANEAMENTO_TEMPO_LINE_RE =
  /\[Planeamento\]\s*Tempo total previsto:\s*\d+\s*min/gi

/** Remove linha legada de tempo manual nas observações — o total vem da estrutura. */
export function stripConveyorPlanningTempoFromNotes(
  notes: string | null | undefined,
): string {
  return (notes ?? '')
    .replace(PLANEAMENTO_TEMPO_LINE_RE, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
