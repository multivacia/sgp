const RE_JUNK_TOKEN = /^(n\/?a|s\/?n|nan|null|-{2,}|\.{2,})$/i
const RE_CURRENCY_OR_UNIT_ALONE =
  /^(r\$|real\.?|reais\.?|km|km\/h|cv|hp|v\d{1,2}\.?\d*)$/i

/** Pelo menos uma letra (nome ou descrição legítimos). */
function hasLetter(s: string): boolean {
  return /[a-záéíóúãõç]/i.test(s)
}

/**
 * Validação mínima para promover cliente ao draft — evita label/fragmento de parsing.
 */
export function isPlausibleClientName(s: string): boolean {
  const t = s.trim()
  if (t.length < 2) return false
  if (!hasLetter(t)) return false
  if (RE_JUNK_TOKEN.test(t)) return false
  if (t.length <= 6 && RE_CURRENCY_OR_UNIT_ALONE.test(t)) return false
  if (/^cliente\s*:?\s*$/i.test(t)) return false
  return true
}

/**
 * Validação mínima para descrição de veículo — evita "real.", só pontuação, etc.
 */
export function isPlausibleVehicleDescription(s: string): boolean {
  const t = s.trim()
  if (t.length < 3) return false
  if (!hasLetter(t)) return false
  if (RE_JUNK_TOKEN.test(t)) return false
  if (/^real\.?\s*$/i.test(t)) return false
  if (/^r\$\s*[\d.,]+\s*$/i.test(t)) return false
  if (RE_CURRENCY_OR_UNIT_ALONE.test(t)) return false
  /** Linha só com marca de moeda ou “código” curto demais sem letras suficientes */
  if (t.length <= 8 && /^[\d.,\sR$r€£]+$/i.test(t)) return false
  return true
}

const RE_MODEL_STRONG =
  /\b(?:modelo|vers[aã]o|vers\.)\s*[:.\-]?\s*([^\n]{2,100})/i

/**
 * Só preenche modelVersion quando há rótulo explícito (modelo/versão) e texto plausível.
 */
export function extractModelVersionStrongSignal(text: string): string | undefined {
  const m = text.match(RE_MODEL_STRONG)
  const raw = m?.[1]?.trim()
  if (!raw) return undefined
  const cut = raw.split(/\s{2,}|\n|;|(?=\bR\$)/)[0]?.trim()
  if (!cut || cut.length < 2) return undefined
  if (!hasLetter(cut)) return undefined
  if (RE_JUNK_TOKEN.test(cut)) return undefined
  if (cut.length > 120) return cut.slice(0, 120).trim()
  return cut
}
