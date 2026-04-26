/** Prioridade do backlog — extraído para evitar ciclo backlog ↔ esteira-detalhe. */

export type BacklogPriority = 'alta' | 'media' | 'baixa'

/** Garante prioridade válida para a grade do backlog (evita string vazia do formulário). */
export function normalizeBacklogPriority(
  p: BacklogPriority | '' | undefined,
): BacklogPriority {
  if (p === 'alta' || p === 'media' || p === 'baixa') return p
  return 'media'
}
