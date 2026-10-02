/** Mesmo teto do backend (`MAX_JOURNEY_COLLABORATORS`) para a jornada consolidada. */
export const MAX_JORNADA_COLABORADORES = 20

/** `colaboradorIds=a,b` (ou o legado `colaboradorId=a`) → ids únicos, na ordem recebida. */
export function parseColaboradorIdsParam(
  colaboradorIds: string | null,
  legacyColaboradorId: string | null,
): string[] {
  const raw = colaboradorIds?.trim() ? colaboradorIds : (legacyColaboradorId ?? '')
  const out: string[] = []
  const seen = new Set<string>()
  for (const part of raw.split(',')) {
    const id = part.trim()
    if (id === '' || seen.has(id)) continue
    seen.add(id)
    out.push(id)
  }
  return out.slice(0, MAX_JORNADA_COLABORADORES)
}
