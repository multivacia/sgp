/**
 * Sanitização defensiva para conteúdo operacional Bravo — LGPD e financeiro.
 * Mantido independente de `bravoTextNormalization` para evitar importações circulares.
 */

export function stripAccents(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

/** Linha típica de grade comercial: UN @ qtde valor unit total */
const TABULAR_UN_AT_RE = /\bUN\s*@/i
/** Vários números monetários brasileiros na mesma linha */
const TABULAR_MONEY_ROW_RE =
  /\d{1,3}(?:\.\d{3})+,\d{2}|\d+,\d{2}\s+\d+,\d{2}\s+\d+,\d{2}|\d+,\d{3}\s+\d+,\d{3}\s+\d+,\d{2}/

/**
 * Linha de preço/tabulação que deve ser ignorada — não vira serviço/peça.
 */
export function isTabularPricingLine(line: string): boolean {
  const t = line.trim()
  if (!t) return false
  if (TABULAR_UN_AT_RE.test(t)) return true
  if (TABULAR_MONEY_ROW_RE.test(t)) return true
  if (/\bR\$\s*[\d.,]+/i.test(t)) return true
  if (/^\d{1,3}(?:\.\d{3})*,\d{2}\s*$/.test(t.trim())) return true
  return false
}

const FORBIDDEN_CONTENT_RES = [
  /\bR\$\s*[\d.,]+/i,
  /\br\s*$/i,
  /\b(total|sub\s*total|subtotal|desconto|pagamento|recebido|troco|valor\s+unit|valor\s+total)\b/i,
  /\bUN\s*@/i,
  /\b(cpf|cnpj|rg|i\.?\s*e\.?|e-?mail|tel\.|telefone|endere[cç]o|cep)\b/i,
  /\b\d{1,3}(?:\.\d{3})+,\d{2}\b/,
  /\b\d+,\d{2}\b/,
  /\b\d+,\d{3}\s+\d+,\d{3}\s+\d+,\d{2}\b/,
  /\b\d{5}-?\d{3}\b/,
  /\b\d{2}\.\d{3}-\d{3}\b/,
  /\b[A-HJ-NPR-Z0-9]{17}\b/i,
  /\S+@\S+\.\S+/,
  /\b1\d{10}\b/,
  /\b(?:\(?\d{2}\)?\s?)?9\d{4}-?\d{4}\b/,
]

/**
 * Apenas um valor monetário BR (ex.: 16816,36, 0,00, 92,40) — nunca operacional.
 */
export function isIsolatedBrazilianMoneyDecimal(text: string): boolean {
  const t = text.trim()
  if (!t) return false
  if (/^\d{1,3}(?:\.\d{3})*,\d{2}$/.test(t)) return true
  if (/^\d+,\d{2}$/.test(t)) return true
  return false
}

/**
 * Linha só com um ou mais tokens monetários separados por espaços.
 */
export function isLineComposedOnlyOfMoneyTokens(text: string): boolean {
  const t = text.trim()
  if (!t) return false
  const token = /^(?:\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})$/
  const parts = t.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return false
  return parts.every((p) => token.test(p))
}

/**
 * Texto que não pode aparecer em campos operacionais (UI/draft).
 */
export function isForbiddenOperationalContent(text: string): boolean {
  const raw = text.trim()
  if (!raw || raw.length < 2) return true
  const low = stripAccents(raw).toLowerCase()
  if (isIsolatedBrazilianMoneyDecimal(raw)) return true
  if (isLineComposedOnlyOfMoneyTokens(raw)) return true
  if (/\bd\s*:\s*\d{14}\b/i.test(raw)) return true
  for (const re of FORBIDDEN_CONTENT_RES) {
    if (re.test(raw)) return true
  }
  if (/\bcliente\s*:/i.test(low)) return true
  /** Códigos de item isolados (ex.: 342, 341) — não são descrição operacional. */
  if (/^\d{3,8}$/.test(raw.trim())) return true
  return false
}

/**
 * Remove código inicial de item, cauda tabular e valores monetários.
 */
export function sanitizeOperationalText(raw: string): string {
  let t = raw.replace(/\s+/g, ' ').trim()
  if (!t) return ''
  t = t.replace(/^\d+\s*[\)\.-]\s*/, '')
  t = t.replace(/^\d{2,6}\s+(?=[A-Za-zÀ-ÿ])/u, '')
  t = t.replace(/\s+UN\s*@[\s\S]*$/i, '')
  t = t.replace(/\bR\$\s*[\d.,]+\b/gi, '')
  t = t.replace(/\b\d{1,3}(?:\.\d{3})+,\d{2}\b/g, '')
  t = t.replace(/\b\d+,\d{2}\s+\d+,\d{2}\s+\d+,\d{2}\b/g, '')
  t = t.replace(/\b\d+,\d{2}\b/g, '')
  t = t.replace(/\b(?:qtd|qtde|quantidade)\s*[:.]?\s*\d+(?:[.,]\d+)?\s*$/i, '')
  t = t.replace(/\b(?:u\.?\s*m\.?|func\.?)\s*[:.]?\s*\S+\s*$/i, '')
  return t.replace(/\s+/g, ' ').trim()
}

export function sanitizeDocumentNumberCandidate(raw: string | undefined): string | undefined {
  if (!raw) return undefined
  const t = raw.trim()
  if (!/^[\d-]+$/.test(t)) return undefined
  if (!/^\d{3,8}(?:-\d{2,8})?$/.test(t)) return undefined
  const alphaProbe = t.replace(/[\d-]/g, '')
  if (alphaProbe.length > 0) return undefined
  return t
}

export function extractBravoDocumentNumber(lines: string[]): string | undefined {
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    const patterns: RegExp[] = [
      /\bN[º°o\.]?\s*(\d{3,8})\s*\/\s*Orçamento\b/i,
      /\bn[º°o\.]?\s*:?\s*(\d{3,8})\s*(?:\/|\(|\s+or|\s|$)/i,
      /\bN[°º]\s*(\d{3,8})\b/i,
      /\b(?:OS|Ordem\s+de\s+Servi[cç]o)\s*[Nº°#:.-]*\s*(\d{4}-\d{4})\b/i,
      /\b(?:OS|Ordem\s+de\s+Servi[cç]o)\s*[Nº°#:.-]*\s*(\d{3,8})\b/i,
      /\bOr[cç]amento\s+[Nº°#:.-]*\s*(\d{3,8})\b/i,
    ]

    for (const re of patterns) {
      const m = trimmed.match(re)
      if (!m?.[1]) continue
      const cand = m[1].trim()
      const sanitized = sanitizeDocumentNumberCandidate(cand)
      if (sanitized) return sanitized
    }
  }
  return undefined
}
