import { parseConveyorActivitySearch } from '../../shared/accentInsensitiveSearch.js'

/**
 * `q` com `&` → pesquisa "Esteira & atividade" (esquerda = esteira/OS, direita = nome da
 * atividade). Sem `&`, `q` segue como pesquisa livre atual. `conveyorQ`/`activityQ`
 * explícitos continuam aceitos (mesma semântica).
 *
 * Compartilhado por `GET /me/time-entry-candidates` (Apontar horas) e
 * `GET /production/me/time-entry-candidates` (Kiosk — "Outra atividade").
 */
export function resolveCandidateSearchTerms(parsed: {
  q?: string
  conveyorQ?: string
  activityQ?: string
}): { q: string | null; conveyorQ: string | null; activityQ: string | null } {
  const pair = parseConveyorActivitySearch(parsed.q)
  if (pair) {
    return { q: null, conveyorQ: pair.conveyorTerm, activityQ: pair.activityTerm }
  }
  return {
    q: parsed.q?.trim() ? parsed.q.trim() : null,
    conveyorQ: parsed.conveyorQ?.trim() ? parsed.conveyorQ.trim() : null,
    activityQ: parsed.activityQ?.trim() ? parsed.activityQ.trim() : null,
  }
}
