/**
 * Regras de conteúdo operacional seguro (LGPD + financeiro) — partilhadas pelo cliente.
 * Manter alinhado com `server/.../bravoOperationalSanitize.ts`.
 */

import type { ConveyorDraft } from './draft-v1.types'

const BR_MONEY_THOUSANDS = /^\d{1,3}(?:\.\d{3})*,\d{2}$/
const BR_MONEY_SIMPLE = /^\d+,\d{2}$/

/** Linha é apenas um valor monetário brasileiro (ex.: 16816,36 ou 92,40). */
export function isIsolatedBrazilianMoneyDecimal(text: string): boolean {
  const t = text.trim()
  if (!t) return false
  return BR_MONEY_THOUSANDS.test(t) || BR_MONEY_SIMPLE.test(t)
}

/**
 * Linha formada só por tokens monetários separados por espaços
 * (ex.: 825,00 5502,75 ou 16816,36 13681,15).
 */
export function isLineComposedOnlyOfMoneyTokens(text: string): boolean {
  const t = text.trim()
  if (!t) return false
  const token =
    /^(?:\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})$/
  const parts = t.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return false
  return parts.every((p) => token.test(p))
}

const SUBSTRING_FORBIDDEN = [
  /\bR\$\s*[\d.,]+/i,
  /\bUN\s*@/i,
  /\b(total|sub\s*total|subtotal|desconto|pagamento|recebido|troco|valor\s+unit|valor\s+total)\b/i,
  /\b(cpf|cnpj|e-?mail|tel\.|telefone|endere[cç]o|cep)\b/i,
  /\b\d{1,3}(?:\.\d{3})+,\d{2}\b/,
  /\b\d+,\d{2}\b/,
  /\b\d+,\d{2}\s+\d+,\d{2}\b/,
  /\b\d{5}-?\d{3}\b/,
  /\b\d{2}\.\d{3}-\d{3}\b/,
  /\b[A-HJ-NPR-Z0-9]{17}\b/i,
  /\S+@\S+\.\S+/,
  /\b1\d{10}\b/,
  /\b(?:\(?\d{2}\)?\s?)?9\d{4}-?\d{4}\b/,
]

/** Varredura para texto editável / payload — inclui decimais isolados no meio de frases curtas. */
export function containsForbiddenOperationalContent(text: string): boolean {
  const raw = text.trim()
  if (!raw || raw.length < 2) return true
  if (isIsolatedBrazilianMoneyDecimal(raw)) return true
  if (isLineComposedOnlyOfMoneyTokens(raw)) return true
  for (const re of SUBSTRING_FORBIDDEN) {
    if (re.test(raw)) return true
  }
  if (/^\d{3,8}$/.test(raw)) return true
  if (/\b(os\s+)?valores\b/i.test(raw)) return true
  /* Bravo rodapé / observação comercial — TD8 */
  if (/\bvalidade\s+(do\s+)?or[cç]amento\b/i.test(raw)) return true
  if (/\bor[cç]amento\s+(possui\s+)?validade\b/i.test(raw)) return true
  if (/valores?\s+poder[aã]o\s+sofrer\s+altera[cç]/i.test(raw)) return true
  if (/\batendente\b/i.test(raw)) return true
  if (/^\s*data\s+\d{2}\/\d{2}\/\d{4}\b/i.test(raw)) return true
  if (/\bimpresso\s+em\b/i.test(raw)) return true
  if (/\bforma(\s+de)?\s+pagamento\b/i.test(raw)) return true
  return false
}

export function isLikelyOsNumberReferenceToken(text: string): boolean {
  const t = text.trim()
  return /^\d{3,8}(?:-\d{2,8})?$/.test(t)
}

/** Varredura recursiva leve dos campos de texto editáveis do draft 1.1.0. */
export function conveyorDraftContainsForbiddenContent(draft: ConveyorDraft): boolean {
  const sd = draft.suggestedDados
  const chunks: string[] = []
  const push = (s: unknown) => {
    if (typeof s === 'string' && s.trim()) chunks.push(s)
  }
  /** Nome da esteira = só número OS (TD9 Bravo) — não tratar como código tabular proibido. */
  if (typeof sd?.title === 'string' && sd.title.trim()) {
    const t = sd.title.trim()
    if (!/^\d{3,8}$/.test(t)) push(sd.title)
  }
  push(sd?.notes)
  push(sd?.clientName)
  push(sd?.vehicleDescription)
  push(sd?.modelVersion)
  push(sd?.licensePlate)
  push(sd?.estimatedDeadline)
  const osRaw = (sd as { osNumber?: string }).osNumber
  if (typeof osRaw === 'string' && osRaw.trim()) {
    if (!isLikelyOsNumberReferenceToken(osRaw)) push(osRaw)
  }
  for (const opt of draft.options ?? []) {
    push(opt.title)
    for (const a of opt.areas ?? []) {
      push(a.title)
      for (const st of a.steps ?? []) {
        push(st.title)
      }
    }
  }
  return chunks.some((c) => containsForbiddenOperationalContent(c))
}

/** Remove padrões monetários tabulares para envio controlado. */
export function stripForbiddenOperationalSubstrings(text: string): string {
  let t = text
  for (const re of SUBSTRING_FORBIDDEN) {
    t = t.replace(re, ' ')
  }
  t = t.replace(/\b\d{1,3}(?:\.\d{3})*,\d{2}\b/g, ' ')
  t = t.replace(/\b\d+,\d{2}\b/g, ' ')
  return t.replace(/\s+/g, ' ').trim()
}
