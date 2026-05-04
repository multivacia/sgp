import {
  isIsolatedBrazilianMoneyDecimal,
  isLineComposedOnlyOfMoneyTokens,
  isTabularPricingLine,
} from './bravoOperationalSanitize.js'

const FINANCIAL_RE =
  /\b(valor\s+unit[aá]rio|valor\s+total|subtotal|total|desconto|recebido|troco|pagamento)\b|R\$\s*[\d.,]+/i
/** `tel.` não usa `\b` no fim: o ponto quebra o word-boundary padrão. */
const LGPD_RE =
  /(?:\b(cpf|cnpj|rg|i\.?e\.?|inscri[cç][aã]o\s+estadual|endere[cç]o|bairro|cep|cidade|uf|telefone|celular|e-?mail|cliente|nome)\b|tel\.)/i

export type BravoSection =
  | 'vehicle'
  | 'parts'
  | 'services'
  | 'additional'
  | 'observations'
  | 'none'

export function stripAccents(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

export function normalizeDocumentText(value: string): string {
  return value
    .replace(/\u00a0/g, ' ')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function normalizeLine(value: string): string {
  return value.replace(/[ \t]+/g, ' ').trim()
}

export function detectSectionHeader(value: string): BravoSection {
  const normalized = stripAccents(normalizeLine(value).toLowerCase())
  if (/^dados\s+do\s+veiculo\b/.test(normalized)) return 'vehicle'
  if (/^dados\s+do\s+cliente\b/.test(normalized)) return 'additional'
  if (/^pecas\s+do\s+pedido\b/.test(normalized)) return 'parts'
  if (/^servicos?\s+do\s+pedido\b/.test(normalized)) return 'services'
  if (/^dados\s+adicionais\b/.test(normalized)) return 'additional'
  if (/^observacoes?\b/.test(normalized)) return 'observations'
  return 'none'
}

export function isFinancialLine(value: string): boolean {
  const t = value.trim()
  return (
    FINANCIAL_RE.test(value) ||
    isTabularPricingLine(value) ||
    isIsolatedBrazilianMoneyDecimal(t) ||
    isLineComposedOnlyOfMoneyTokens(t)
  )
}

export function isLgpdLine(value: string): boolean {
  return LGPD_RE.test(stripAccents(value))
}

/** Texto típico de rodapé / observação comercial Bravo — não é instrução operacional de chão. */
export function isCommercialNonOperationalBravoLine(value: string): boolean {
  const raw = normalizeLine(value)
  if (!raw) return true
  const low = stripAccents(raw).toLowerCase()
  if (
    /\bvalidade\s+(do\s+)?or[cç]amento|or[cç]amento\s+(possui\s+)?validade/i.test(low)
  )
    return true
  if (/valores?\s+poder[aã]o\s+sofrer\s+altera[cç]/i.test(low)) return true
  if (/\b(desconto|pagamento|recebido|troco)\b/i.test(low)) return true
  if (/\batendente\b/i.test(low)) return true
  if (/^\s*data\s+\d{2}\/\d{2}\/\d{4}\b/i.test(raw.trim())) return true
  if (/\bdata\s+(de\s+)?\d{2}\/\d{2}\/\d{4}\b/i.test(low)) return true
  if (/\bimpresso\s+em\b/i.test(low)) return true
  if (/\b(valor\s+)?total\b|\bsub\s*total\b/i.test(low)) return true
  if (/\bforma(\s+de)?\s+pagamento\b/i.test(low)) return true
  return false
}

/**
 * Observações Bravo: por defeito não são operacionais; só passam linhas com sinais explícitos
 * de execução no chão (whitelist).
 */
export function isLikelyBravoOperationalObservationLine(value: string): boolean {
  const raw = normalizeLine(value)
  if (raw.length < 6) return false
  return /\b(executar|priorizar|prioridade|validar|verificar|cuidado|acabamento|montagem|instala[cç][aã]o|revis[aã]o\s+t[eé]cnica|checar|calibrar|testar\s+funcionamento)\b/i.test(
    raw,
  )
}

const PDF_METADATA_KEY_RE =
  /^(producer|creationdate|moddate|creator|author|title|subject|trapped|pdfversion)\s*[:=]?/i
const SECTION_LABEL_RE =
  /^(dados\s+do\s+cliente|dados\s+do\s+veiculo|pecas\s+do\s+pedido|servicos?\s+do\s+pedido|dados\s+adicionais|observacoes?)$/i
const CONTACT_OR_HEADER_RE =
  /\b(bravo\s+tape[cç]aria|fone|cel|contato@|e-?mail|rua|av\.?|avenida|bairro|cep)\b/i
const PAGINATION_RE =
  /^(p[aá]gina\s*\d+(\s*de\s*\d+)?|page\s*\d+(\s*of\s*\d+)?|impresso\s+em|data\s+de\s+impress[aã]o)\b/i

/**
 * Filtra ruído documental que não deve virar item operacional.
 */
export function isDocumentNoiseLine(value: string): boolean {
  const raw = normalizeLine(value)
  if (!raw) return true
  const normalized = stripAccents(raw).toLowerCase()
  if (normalized.length < 3) return true
  if (/^valores$/i.test(normalized)) return true
  if (PDF_METADATA_KEY_RE.test(normalized)) return true
  if (SECTION_LABEL_RE.test(normalized)) return true
  if (PAGINATION_RE.test(normalized)) return true
  if (CONTACT_OR_HEADER_RE.test(normalized)) return true
  if (/^\d+\s*\/\s*\d+$/.test(normalized)) return true
  return false
}

