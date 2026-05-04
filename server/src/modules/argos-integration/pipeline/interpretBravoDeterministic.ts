import type {
  HeuristicInterpretation,
  PartLineGuess,
  ServiceLineGuess,
} from './interpretHeuristicBr.js'
import {
  extractBravoDocumentNumber,
  isForbiddenOperationalContent,
  isTabularPricingLine,
  sanitizeOperationalText,
} from './bravoOperationalSanitize.js'
import {
  detectSectionHeader,
  isDocumentNoiseLine,
  isFinancialLine,
  isLgpdLine,
  normalizeDocumentText,
  normalizeLine,
  type BravoSection,
} from './bravoTextNormalization.js'
import {
  bravoDdMmYyyyToIso,
  parseBravoBasicFields,
} from './parseBravoBasicFields.js'

const RE_YEAR = /\b(19\d{2}|20\d{2}|21\d{2})\b/
const RE_COLOR =
  /\b(branco|preta|preto|prata|cinza|vermelho|azul|verde|amarelo|marrom)\b/i
const RE_DATE = /\b(\d{2}[\/-]\d{2}[\/-]\d{4})\b/
const RE_PLATE_MERCOSUL = /\b([A-Z]{3}\d[A-Z]\d{2})\b/i
const RE_PLATE_OLD = /\b([A-Z]{3})[\s-]?(\d{4})\b/i

const VEHICLE_META_NOISE_RE =
  /\b(km\s+ent|km\s+sai\.?|entrada|sa[ií]da|entrada\/sa[ií]da|n[ií]vel\s+comb|comb\.?:|motor:|gasolina|\bg[aá]s\b|chassi|nome\s*:|n[º°]\s*nome)\b/i

function parsePlate(value: string): string | undefined {
  const merc = value.match(RE_PLATE_MERCOSUL)?.[1]
  if (merc) return merc.toUpperCase()
  const old = value.match(RE_PLATE_OLD)
  if (old?.[1] && old[2]) return `${old[1].toUpperCase()}-${old[2]}`
  return undefined
}

function partitionBySection(lines: string[]): Record<BravoSection, string[]> {
  const buckets: Record<BravoSection, string[]> = {
    none: [],
    vehicle: [],
    parts: [],
    services: [],
    additional: [],
    observations: [],
  }
  let cur: BravoSection = 'none'
  for (const line of lines) {
    const det = detectSectionHeader(line)
    if (det !== 'none') {
      cur = det
      continue
    }
    buckets[cur].push(line)
  }
  return buckets
}

/** `Nome:` ou `Cliente:` na mesma linha (fallback quando não há bloco colunar). */
function extractBravoClienteNome(additionalLines: string[]): string | undefined {
  const tryPattern = (re: RegExp) => {
    for (const raw of additionalLines) {
      const line = normalizeLine(raw)
      const m = line.match(re)
      if (!m?.[1]) continue
      const rest = m[1].trim()
      if (rest.length < 2) continue
      const cleaned = sanitizeOperationalText(rest).slice(0, 200)
      if (!cleaned || isForbiddenOperationalContent(cleaned)) continue
      return cleaned
    }
    return undefined
  }
  return tryPattern(/^nome\s*:\s*(.+)$/i) ?? tryPattern(/^cliente\s*:\s*(.+)$/i)
}

function extractExplicitPlacaFromVehicleLines(lines: string[]): string | undefined {
  for (const raw of lines) {
    const line = normalizeLine(raw)
    if (!/^\s*placa\s*:/i.test(line)) continue
    const after = line.replace(/^\s*placa\s*:/i, '').trim()
    const p = parsePlate(after.length >= 4 ? after : line)
    if (p) return p
  }
  return undefined
}

function parsePossibleQuantity(value: string): number | undefined {
  const m = value.match(/\b(?:qtd|qtde|quantidade)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\b/i)
  if (!m?.[1]) return undefined
  const n = Number.parseFloat(m[1].replace(',', '.'))
  return Number.isFinite(n) ? n : undefined
}

/**
 * Acumula linhas textuais até código isolado, linha UN @ ou financeira — extração tabular Bravo.
 */
function parseTabularOperationalBlock(
  rawLines: string[],
  mode: 'service' | 'part',
): Array<{ text: string; confidence: number }> {
  const out: Array<{ text: string; confidence: number }> = []
  const buf: string[] = []

  const flush = () => {
    if (buf.length === 0) return
    const merged = buf.join(' ')
    buf.length = 0
    const s = sanitizeOperationalText(merged)
    if (!s || s.length < 4) return
    if (isForbiddenOperationalContent(s)) return
    out.push({
      text: s.slice(0, 500),
      confidence: mode === 'service' ? 0.88 : 0.84,
    })
  }

  for (const raw of rawLines) {
    const line = normalizeLine(raw)
    if (!line) continue

    if (
      isFinancialLine(line) ||
      isLgpdLine(line) ||
      isTabularPricingLine(line) ||
      isDocumentNoiseLine(line) ||
      VEHICLE_META_NOISE_RE.test(line)
    ) {
      flush()
      continue
    }

    if (/^\d{3,8}$/.test(line.trim())) {
      flush()
      continue
    }

    if (/^\d+[\).]\s/.test(line) && buf.length > 0) {
      flush()
    }

    buf.push(line)
  }
  flush()
  return out
}

export function interpretBravoDeterministic(params: {
  text: string
  fileName: string
}): HeuristicInterpretation {
  const normalizedText = normalizeDocumentText(params.text)
  const basic = parseBravoBasicFields(params.text)
  const lines = normalizedText
    .split('\n')
    .map((line) => normalizeLine(line))
    .filter(Boolean)

  const buckets = partitionBySection(lines)

  const documentNumber = basic.documentNumber ?? extractBravoDocumentNumber(lines)
  const osNumber = documentNumber

  const removedCategories = new Set<string>()
  let financialDataDetected = false
  let personalDataDetected = false

  for (const line of lines) {
    if (isFinancialLine(line)) {
      financialDataDetected = true
      removedCategories.add('pricing')
      removedCategories.add('payment_terms')
      removedCategories.add('discount')
      removedCategories.add('totals')
    }
    if (isLgpdLine(line)) {
      personalDataDetected = true
      if (/cpf|cnpj/i.test(line)) removedCategories.add('cpf_cnpj')
      if (/rg|i\.?e\.?|inscri[cç][aã]o\s+estadual/i.test(line)) removedCategories.add('rg_ie')
      if (/endere[cç]o|bairro|cep|cidade|uf/i.test(line)) removedCategories.add('address')
      if (/telefone|celular|tel\.|cel/i.test(line)) removedCategories.add('phone')
      if (/e-?mail/i.test(line)) removedCategories.add('email')
      if (/cliente|nome/i.test(line)) removedCategories.add('customer_name')
    }
  }

  const clientName =
    basic.clientName ?? extractBravoClienteNome(buckets.additional)

  let licensePlate = basic.licensePlate
  let vehicleDescription = basic.vehicleModel
  let vehicleYear = basic.vehicleYear
  let vehicleColor = basic.vehicleColor

  if (!licensePlate) {
    licensePlate = extractExplicitPlacaFromVehicleLines(buckets.vehicle)
    if (!licensePlate) licensePlate = extractExplicitPlacaFromVehicleLines(buckets.none)
  }

  let issuedAt = basic.issuedAt
  let entryAt = basic.entryAt
  let receivedAt: string | undefined = basic.entryAt

  const vehicleScan = [...buckets.none, ...buckets.vehicle]
  for (const line of vehicleScan) {
    if (!licensePlate) {
      licensePlate = parsePlate(line)
    }
    if (!issuedAt && /\bemiss[aã]o\b/i.test(line)) {
      const raw = line.match(RE_DATE)?.[1]
      if (raw) issuedAt = bravoDdMmYyyyToIso(raw) ?? raw
    }
    if (!receivedAt && /\bentrada\b|\brecebimento\b/i.test(line)) {
      const raw = line.match(RE_DATE)?.[1]
      if (raw) receivedAt = bravoDdMmYyyyToIso(raw) ?? raw
    }
  }

  for (const line of buckets.vehicle) {
    if (/ano\s*:\s*cor\s*:|preta\s*ano\s*:\s*cor\s*:/i.test(line)) {
      continue
    }
    if (vehicleYear === undefined && /\bano\s*:/i.test(line)) {
      const afterAno = line.replace(/^.*?\bano\s*:/i, '').trim()
      const yearRaw = afterAno.match(RE_YEAR)?.[1]
      if (yearRaw) vehicleYear = Number(yearRaw)
    }
    if (!vehicleColor && /\bcor\s*:/i.test(line)) {
      const afterCor = line.replace(/^.*?\bcor\s*:/i, '').trim()
      const col = afterCor.match(RE_COLOR)?.[1]
      if (col) vehicleColor = col?.toUpperCase()
    }
    if (!vehicleColor) {
      const colFallback = line.match(RE_COLOR)?.[1]
      if (colFallback && !/\b(modelo|marca|ve[ií]culo)\s*:/i.test(line)) {
        vehicleColor = colFallback.toUpperCase()
      }
    }
    if (!vehicleDescription && /(modelo|veiculo|veículo|marca)\s*:/i.test(line)) {
      if (/\b[A-Z]{3}\d[A-Z]\d{2}\b/.test(line) && /\b(19|20)\d{2}\s+/.test(line)) {
        continue
      }
      let rest = line.split(':').slice(1).join(':').trim()
      rest = rest.split(/\bAno\s*:/i)[0]?.trim() ?? ''
      rest = rest.split(/\bCor\s*:/i)[0]?.trim() ?? ''
      rest = rest.replace(/\bPRETA\s*Ano\s*:/gi, ' ')
      rest = rest.replace(/\s+/g, ' ').trim()
      if (rest.length >= 3 && !isForbiddenOperationalContent(rest) && !/\b(ano|cor)\s*:/i.test(rest)) {
        const cleaned = sanitizeOperationalText(rest).slice(0, 200)
        if (cleaned.length >= 3 && /^[a-zà-ú0-9\s\-\/+.]+$/i.test(cleaned)) {
          vehicleDescription = cleaned
        }
      }
    }
  }

  const fieldConfidence: Record<string, number> = {}
  if (documentNumber) fieldConfidence.osNumber = 0.92
  if (basic.licensePlate ?? licensePlate) fieldConfidence.licensePlate = 0.88
  if (((basic.vehicleModel ?? vehicleDescription)?.length ?? 0) >= 3)
    fieldConfidence.vehicleDescription = 0.72
  if (basic.clientName ?? clientName) fieldConfidence.clientName = 0.7
  if (osNumber) fieldConfidence.suggestedEsteiraTitle = 0.9

  const serviceParsed = parseTabularOperationalBlock(buckets.services, 'service')
  const serviceLines: ServiceLineGuess[] = serviceParsed.map((s, i) => ({
    orderIndex: i + 1,
    title: s.text,
    confidence: s.confidence,
  }))

  const partParsed = parseTabularOperationalBlock(buckets.parts, 'part')
  const partLines: PartLineGuess[] = partParsed.map((p, i) => ({
    orderIndex: i + 1,
    description: p.text,
    quantity: parsePossibleQuantity(p.text),
    confidence: p.confidence,
  }))

  /** TD9: não promover Observações/Dados adicionais Bravo para o draft. */
  const operationalNotes: string[] = []

  const suggestedTitle =
    osNumber ?? params.fileName.replace(/\.[^.]+$/, '')

  /** TD10.1: dados de `parseBravoBasicFields` prevalecem sobre heurísticas de secção. */
  const licensePlateOut = basic.licensePlate ?? licensePlate
  const vehicleDescriptionOut = basic.vehicleModel ?? vehicleDescription
  const vehicleYearOut = basic.vehicleYear ?? vehicleYear
  const vehicleColorOut = basic.vehicleColor ?? vehicleColor
  const clientNameOut = basic.clientName ?? clientName
  const issuedAtOut = basic.issuedAt ?? issuedAt
  const entryAtOut = basic.entryAt ?? entryAt
  const receivedAtOut = basic.entryAt ?? receivedAt ?? entryAtOut

  return {
    osNumber,
    documentNumber,
    licensePlate: licensePlateOut,
    clientName: clientNameOut,
    modelVersion: undefined,
    vehicleDescription: vehicleDescriptionOut,
    vehicleYear: vehicleYearOut,
    vehicleColor: vehicleColorOut,
    issuedAt: issuedAtOut,
    entryAt: entryAtOut,
    receivedAt: receivedAtOut,
    notes: undefined,
    operationalNotes,
    serviceLines: serviceLines.slice(0, 40),
    partLines: partLines.slice(0, 40),
    suggestedEsteiraTitle: suggestedTitle,
    suggestedEsteiraDescription: undefined,
    heuristicSource: 'bravo_deterministic',
    fieldConfidence,
    personalDataDetected,
    financialDataDetected,
    removedCategories: Array.from(removedCategories),
  }
}
