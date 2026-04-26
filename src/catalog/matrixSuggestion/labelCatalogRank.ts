import type { LabelCatalogEntry } from './types'

const PT = 'pt-BR'

/** Normaliza para comparação: minúsculas, sem acentos, trim. */
export function normalizeForLabelMatch(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
}

const MIN_QUERY_LEN = 2
const DEFAULT_MAX = 10

export type RankLabelSuggestionsOptions = {
  /** Entre 8 e 12 inclusive; default 10. */
  maxResults?: number
}

/**
 * Ranking: prefixo → contém → ordem alfabética (pt-BR) dentro de cada grupo.
 */
export function rankLabelSuggestions(
  entries: readonly LabelCatalogEntry[],
  rawQuery: string,
  opts?: RankLabelSuggestionsOptions,
): LabelCatalogEntry[] {
  const max =
    opts?.maxResults != null
      ? Math.min(12, Math.max(8, opts.maxResults))
      : DEFAULT_MAX
  const q = normalizeForLabelMatch(rawQuery)
  if (q.length < MIN_QUERY_LEN) return []

  const prefix: LabelCatalogEntry[] = []
  const contains: LabelCatalogEntry[] = []

  for (const e of entries) {
    const nl = normalizeForLabelMatch(e.label)
    if (nl.startsWith(q)) prefix.push(e)
    else if (nl.includes(q)) contains.push(e)
  }

  const sortByLabel = (a: LabelCatalogEntry, b: LabelCatalogEntry) =>
    a.label.localeCompare(b.label, PT)

  prefix.sort(sortByLabel)
  contains.sort(sortByLabel)

  return [...prefix, ...contains].slice(0, max)
}
