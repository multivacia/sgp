import { normalizeDocumentText, normalizeLine } from './bravoTextNormalization.js'
import { stripAccents } from './bravoOperationalSanitize.js'

function nk(line: string): string {
  return stripAccents(normalizeLine(line)).toLowerCase()
}

/**
 * Linhas relevantes para ver a estrutura tabular do PDF Bravo no extrator (sem PII na saída — usar `sanitizeBravoDebugLine`).
 */
export function collectBravoCandidateDebugLines(rawText: string): string[] {
  const normalized = normalizeDocumentText(rawText)
  const lines = normalized
    .split('\n')
    .map((l) => normalizeLine(l))
    .filter(Boolean)
  const n = lines.length
  const idxSet = new Set<number>()

  const keywordRes = [
    /dados\s+do\s+cliente/i,
    /dados\s+do\s+ve[ií]culo/i,
    /\bplaca\b/i,
    /\bmodelo\b/i,
    /\bano\b/i,
    /\bcor\b/i,
    /\bentrada\b/i,
    /km\s*ent/i,
    /\bnome\b/i,
    /rg\/i\.e/i,
    /cpf\/cnpj/i,
    /\bn[º°o\.]?\s*\d+/i,
    /or[cç]amento/i,
    /\bdata\b/i,
  ]

  for (let i = 0; i < n; i++) {
    const L = lines[i]!
    if (keywordRes.some((re) => re.test(L))) idxSet.add(i)
    if (/\b(19|20)\d{2}\b/.test(L)) idxSet.add(i)
    if (/\b[A-Z]{3}\d[A-Z]\d{2}\b/i.test(L)) idxSet.add(i)
    if (/\b[A-Z]{3}-?\d{4}\b/i.test(L)) idxSet.add(i)
  }

  const addWindow = (center: number, before: number, after: number) => {
    for (let j = Math.max(0, center - before); j <= Math.min(n - 1, center + after); j++) {
      idxSet.add(j)
    }
  }

  for (let i = 0; i < n; i++) {
    if (/^dados\s+do\s+ve[ií]culo$/i.test(nk(lines[i]!))) addWindow(i, 3, 5)
  }
  for (let i = 0; i < n; i++) {
    if (/^dados\s+do\s+cliente$/i.test(nk(lines[i]!))) addWindow(i, 3, 8)
  }
  for (let i = 0; i < n; i++) {
    if (/\bn[º°o\.]?\s*\d{3,8}\s*\/\s*or[cç]amento\b/i.test(lines[i]!)) addWindow(i, 3, 5)
  }

  return [...idxSet].sort((a, b) => a - b).map((i) => lines[i]!)
}
