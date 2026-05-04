import { normalizeLine } from './bravoTextNormalization.js'

const MAX_DEBUG_LINE_LEN = 220

/**
 * Sanitiza uma linha para logs/debug TD10.3 — permite financeiro e rótulos;
 * remove ou mascara LGPD (sem valores sensíveis na saída).
 */
export function sanitizeBravoDebugLine(line: string): string {
  let s = normalizeLine(line).replace(/\s+/g, ' ').trim()
  if (!s) return ''

  // Chassi / VIN (17 caracteres alfanuméricos isolados)
  s = s.replace(/\b[A-HJ-NPR-Z0-9]{17}\b/gi, '[VIN]')

  s = s.replace(/\S+@\S+\.\S+/gi, '[EMAIL]')

  // Telefone antes de blocos numéricos genéricos (11 dígitos = celular ou CPF)
  s = s.replace(/\(\d{2}\)\s*\d{4,5}-?\d{4}\b/g, '[PHONE]')
  s = s.replace(/\b(?:tel|cel)\.?\s*[\d().\s\-]{10,}\b/gi, '[PHONE]')
  s = s.replace(/\b1\d{10,11}\b/g, '[PHONE]')
  s = s.replace(/\b(?:\(?\d{2}\)?\s?)?9\d{4}-?\d{4}\b/g, '[PHONE]')

  s = s.replace(/\b\d{5}-?\d{3}\b/g, '[CEP]')

  // CNPJ / CPF formatados e sequências longas de dígitos (documentos)
  s = s.replace(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g, '[CPF_CNPJ]')
  s = s.replace(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, '[CPF_CNPJ]')
  s = s.replace(/\b\d{11,14}\b/g, '[CPF_CNPJ]')

  // Placa Mercosul e formato antigo (depois de VIN para não colidir com 17 chars)
  s = s.replace(/\b[A-Z]{3}\d[A-Z]\d{2}\b/gi, '[PLATE]')
  s = s.replace(/\b[A-Z]{3}-\d{4}\b/gi, '[PLATE]')
  s = s.replace(/\b[A-Z]{3}\d{4}\b/gi, '[PLATE]')

  // Linha só com nome próprio (ex.: linha de cliente isolada após cabeçalhos)
  if (
    /^[A-ZÀ-Ú][A-Za-zÀ-ÿ\s]{12,120}$/.test(s) &&
    (s.match(/\s+/g)?.length ?? 0) >= 2 &&
    !/\d/.test(s) &&
    !/\b(os|km|gti|gol|vw)\b/i.test(s)
  ) {
    s = '[CLIENT_NAME]'
  }

  return s.slice(0, MAX_DEBUG_LINE_LEN)
}
