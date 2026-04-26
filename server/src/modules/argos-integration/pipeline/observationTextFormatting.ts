import {
  normalizeDocumentLine,
  splitGluedOrdinalPrefix,
  stripListPrefix,
} from './classifyDocumentLine.js'

/**
 * Normaliza fragmento para observações: colagem ordinal+texto, prefixo de lista, espaços.
 * Sem reescrita semântica — só legibilidade e segmentação mecânica.
 */
export function formatObservationFragment(raw: string): string {
  const n = normalizeDocumentLine(raw)
  const spaced = splitGluedOrdinalPrefix(n)
  return stripListPrefix(spaced).trim()
}

/** Une linhas já limpas; colapsa quebras excessivas sem reescrever o texto. */
export function normalizeObservationBlock(text: string): string {
  const lines = text
    .split(/\r?\n/)
    .map((l) => formatObservationFragment(l))
    .filter((l) => l.length > 0)
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}
