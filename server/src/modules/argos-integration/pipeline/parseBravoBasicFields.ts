import {
  extractBravoDocumentNumber,
  sanitizeDocumentNumberCandidate,
  sanitizeOperationalText,
} from './bravoOperationalSanitize.js'
import {
  normalizeDocumentText,
  normalizeLine,
  stripAccents,
} from './bravoTextNormalization.js'

export type BravoBasicFields = {
  documentNumber?: string
  /** Data do documento (`Data:`), ISO yyyy-mm-dd. */
  issuedAt?: string
  /** Entrada na oficina, ISO yyyy-mm-dd. */
  entryAt?: string
  clientName?: string
  licensePlate?: string
  vehicleModel?: string
  vehicleYear?: number
  vehicleColor?: string
}

/** Flags booleanas para TD10.2 — sem valores sensíveis. */
export type BravoBasicFieldsDiagnostics = {
  lineCount: number
  foundDocumentNumber: boolean
  foundIssuedAt: boolean
  foundEntryAt: boolean
  foundVehicleByCleanRegex: boolean
  foundVehicleByTabularScan: boolean
  foundClientByGrid: boolean
  foundLicensePlate: boolean
  foundVehicleModel: boolean
  foundVehicleYear: boolean
  foundVehicleColor: boolean
  foundClientName: boolean
}

function partialVehicleNonempty(p: Partial<BravoBasicFields>): boolean {
  return Boolean(
    p.licensePlate || p.vehicleModel || p.vehicleYear !== undefined || p.vehicleColor,
  )
}

function stripCpfCnpjFragments(value: string): string {
  let t = value
  t = t.replace(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g, '')
  t = t.replace(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, '')
  t = t.replace(/\b\d{11,14}\b/g, '')
  return t.replace(/\s+/g, ' ').trim()
}

/**
 * Somente para suggestedDados.clientName — não enviar a outros fluxos a partir daqui.
 * Corta texto antes do primeiro trecho que parece início de CPF colado (ddd.ddd).
 */
export function sanitizeBravoClientDisplayName(raw: string): string {
  let t = normalizeLine(raw).replace(/\s+/g, ' ')
  const cpfStart = t.search(/\d{3}\.\d{3}/)
  if (cpfStart >= 0) t = t.slice(0, cpfStart)
  t = stripCpfCnpjFragments(t)
  t = t.replace(/\S+@\S+\.\S+/g, ' ')
  t = t.replace(/\b(?:tel|cel)\.?\s*[\d().\s\-]{10,}\b/gi, ' ')
  t = t.replace(/\(\d{2}\)\s*\d{4,5}-?\d{4}\b/g, ' ')
  t = t.replace(/\b\d{5}-?\d{3}\b/g, ' ')
  t = t.replace(/\b\d{2}\.\d{3}-\d{3}\b/g, ' ')
  t = t.replace(/\s+/g, ' ').trim()
  t = t.replace(/[.,;:\-]+$/, '').trim()
  const out = sanitizeOperationalText(t).slice(0, 200).trim()
  return out
}

/** Exportado para normalizar datas lidas em `interpretBravoDeterministic` (fallback). */
export function bravoDdMmYyyyToIso(ddmmyyyy: string): string | undefined {
  const m = ddmmyyyy.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!m) return undefined
  const d = Number(m[1])
  const mo = Number(m[2])
  const y = Number(m[3])
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 1900 || y > 2100) return undefined
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function ddMmYyyyToIso(ddmmyyyy: string): string | undefined {
  return bravoDdMmYyyyToIso(ddmmyyyy)
}

/** Primeira data dd/mm/yyyy válida na linha (PDF cola dígitos antes da data, ex. `:026/01/2026`). */
function findFirstValidBrazilianDateIso(line: string): string | undefined {
  const re = /\d{2}\/\d{2}\/\d{4}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(line)) !== null) {
    const iso = ddMmYyyyToIso(m[0])
    if (iso) return iso
  }
  return undefined
}

function normKey(line: string): string {
  return stripAccents(normalizeLine(line)).toLowerCase()
}

/** Trecho entre cabeçalho de secção e a próxima secção conhecida. */
function sliceBetweenHeaders(
  lines: string[],
  startRe: RegExp,
  endRes: RegExp[],
): string[] {
  const start = lines.findIndex((l) => startRe.test(normKey(l)))
  if (start < 0) return []
  let end = lines.length
  for (let i = start + 1; i < lines.length; i++) {
    const nk = normKey(lines[i]!)
    for (const er of endRes) {
      if (er.test(nk)) {
        end = i
        break
      }
    }
    if (end < lines.length) break
  }
  return lines.slice(start + 1, end)
}

/** Mercosul LLLNLNN ou placa antiga LLL-NNNN. */
function normalizePlateToken(raw: string): string | undefined {
  const t = raw.replace(/\s/g, '').toUpperCase()
  if (t.length < 6 || t.length > 8) return undefined
  if (/^[A-Z]{3}\d[A-Z]\d{2}$/.test(t)) return t
  if (/^[A-Z]{3}\d{4}$/.test(t)) return `${t.slice(0, 3)}-${t.slice(3)}`
  if (/^[A-Z]{3}-\d{4}$/.test(t)) return t
  return undefined
}

/** PDF linearizado às vezes cola `PRETAAno:Cor:` na mesma linha do rótulo Cor. */
function normalizeBravoVehicleColor(raw: string): string | undefined {
  let v = raw.trim()
  if (!v) return undefined
  if (/^(placa|modelo|ano|cor|entrada|sa[ií]da|km|motor|comb)$/i.test(v)) return undefined
  const beforeAno = v.split(/\s*ano\s*:/i)[0]?.trim() ?? ''
  if (beforeAno.length < v.length) v = beforeAno
  v = v.replace(/\s*cor\s*:\s*$/i, '').trim()
  if (!v) return undefined
  const low = v.toLowerCase()
  if (/pretaano|ano\s*:\s*cor/.test(low)) return undefined
  if (/\b(modelo|placa)\s*:/i.test(v)) return undefined
  if (!/^[A-Za-zÀ-ÿ\s\-]{2,40}$/.test(v)) return undefined
  return v.toUpperCase()
}

function extractBravoDocumentNumberPrimary(lines: string[], compact: string): string | undefined {
  // Sem `\b` após Orçamento — PDF cola "OrçamentoData:" na mesma linha.
  const fromCompact = compact.match(/N[º°o\.]?\s*(\d{3,8})\s*\/\s*Orçamento/i)
  if (fromCompact?.[1]) {
    const s = sanitizeDocumentNumberCandidate(fromCompact[1])
    if (s) return s
  }
  for (const line of lines) {
    const m = line.trim().match(/N[º°o\.]?\s*(\d{3,8})\s*\/\s*Orçamento/i)
    if (m?.[1]) {
      const s = sanitizeDocumentNumberCandidate(m[1])
      if (s) return s
    }
  }
  const fromOs = compact.match(/\bOS\s*[Nº°#:.-]*\s*(\d{3,8})\b/i)
  if (fromOs?.[1]) {
    const s = sanitizeDocumentNumberCandidate(fromOs[1])
    if (s) return s
  }
  return extractBravoDocumentNumber(lines)
}

function extractIssuedAtIso(lines: string[], compact: string): string | undefined {
  for (const raw of lines) {
    const m = raw.match(/Data:\s*(\d{2}\/\d{2}\/\d{4})/i)
    if (m?.[1]) {
      const iso = ddMmYyyyToIso(m[1])
      if (iso) return iso
    }
  }
  const m = compact.match(/Data:\s*(\d{2}\/\d{2}\/\d{4})/i)
  if (!m?.[1]) return undefined
  return ddMmYyyyToIso(m[1])
}

function extractEntryAtIso(lines: string[], compact: string): string | undefined {
  const direct = compact.match(/\bEntrada\s*:\s*(\d{2}\/\d{2}\/\d{4})\b/i)
  if (direct?.[1]) {
    const iso = ddMmYyyyToIso(direct[1])
    if (iso) return iso
  }
  for (const raw of lines) {
    const L = normalizeLine(raw)
    if (!L) continue
    if (!/\b(km\s*ent|entrada)\b/i.test(L)) continue
    const iso = findFirstValidBrazilianDateIso(L)
    if (iso) return iso
  }
  return undefined
}

/**
 * Veículo em uma linha totalmente colada (PDF): ano+texto+placa+Modelo:cor+Ano:Cor:
 * — `Modelo:` traz a cor quando colunas deslocam.
 */
function extractVehicleCompactGluedLine(line: string): Partial<BravoBasicFields> {
  const acc: Partial<BravoBasicFields> = {}
  const L = normalizeLine(line)
  if (!L) return acc

  const m = L.match(
    /(19\d{2}|20\d{2})(.+?)([A-Z]{3}\d[A-Z0-9]\d{2})Modelo:\s*([A-Za-zÀ-ÿ]+)\s*Ano:\s*Cor:/i,
  )
  if (!m?.[1] || m[2] === undefined || !m[3] || !m[4]) return acc

  const y = Number(m[1])
  if (y < 1970 || y > 2035) return acc
  acc.vehicleYear = y

  const plate = normalizePlateToken(m[3])
  if (plate) acc.licensePlate = plate

  let model = m[2].trim()
  model = sanitizeOperationalText(model).slice(0, 200)
  if (model.length >= 2) acc.vehicleModel = model

  const c = normalizeBravoVehicleColor(m[4])
  if (c) acc.vehicleColor = c

  return acc
}

/**
 * Fallback para linha tabular achatada: ano + modelo + placa Mercosul na mesma linha;
 * `Modelo:` pode trazer a cor (PRETA) quando colunas desalinham.
 */
function extractVehicleTabularCorrupted(regionLines: string[]): Partial<BravoBasicFields> {
  const acc: Partial<BravoBasicFields> = {}
  const chunk = regionLines.join(' ').replace(/\s+/g, ' ')
  if (!chunk.trim()) return acc

  const tri = chunk.match(
    /\b(19\d{2}|20\d{2})\s+(.+?)\s+([A-Z]{3}\d[A-Z]\d{2})\b/i,
  )
  if (tri?.[1] && tri[2] && tri[3]) {
    const y = Number(tri[1])
    if (y >= 1970 && y <= 2035) {
      acc.vehicleYear = y
      const plate = normalizePlateToken(tri[3])
      if (plate) acc.licensePlate = plate
      let model = tri[2].trim()
      model = model.replace(/\s+Modelo:\s*\S+.*$/i, '').trim()
      const sanitized = sanitizeOperationalText(model).slice(0, 200)
      if (sanitized.length >= 3) acc.vehicleModel = sanitized
    }
  }

  const modeloLabel = chunk.match(/\bModelo:\s*(\S+)/i)
  if (modeloLabel?.[1]) {
    const asColor = normalizeBravoVehicleColor(modeloLabel[1])
    if (asColor) acc.vehicleColor = asColor
  }

  const corLabel = chunk.match(/\bCor:\s*([A-Za-zÀ-ÿ]{3,40})/i)
  if (corLabel?.[1]) {
    const c = normalizeBravoVehicleColor(corLabel[1])
    if (c) acc.vehicleColor = c
  }

  return acc
}

/**
 * Campos em linhas separadas (extrator PDF costuma não manter uma única linha tabular).
 */
function extractVehicleFromRegionLines(regionLines: string[]): Partial<BravoBasicFields> {
  const acc: Partial<BravoBasicFields> = {}
  const compactRegion = regionLines.join(' ').replace(/\s+/g, ' ')
  const compound = compactRegion.match(
    /\bPlaca\s*:\s*(\S+)\s+Modelo\s*:\s*(.+?)\s+Ano\s*:\s*(19\d{2}|20\d{2})\s+Cor\s*:\s*(\S+)/i,
  )
  if (compound) {
    const plate = normalizePlateToken(compound[1]!)
    if (plate) acc.licensePlate = plate
    const modelRaw = compound[2]?.trim()
    if (modelRaw) acc.vehicleModel = sanitizeOperationalText(modelRaw).slice(0, 200)
    const y = Number(compound[3])
    if (Number.isFinite(y)) acc.vehicleYear = y
    const cor = compound[4]?.trim()
    if (cor) {
      const c = normalizeBravoVehicleColor(cor)
      if (c) acc.vehicleColor = c
    }
    return acc
  }

  for (const raw of regionLines) {
    const L = normalizeLine(raw)
    if (!L) continue
    const lp = L.match(/^\s*placa\s*:\s*(.+)$/i)
    if (lp?.[1]) {
      const p = normalizePlateToken(lp[1].trim())
      if (p) acc.licensePlate = p
      continue
    }
    const lm = L.match(/^\s*modelo\s*:\s*(.+)$/i)
    if (lm?.[1]) {
      const v = sanitizeOperationalText(lm[1].trim()).slice(0, 200)
      if (v.length >= 2) acc.vehicleModel = v
      continue
    }
    const la = L.match(/^\s*ano\s*:\s*(19\d{2}|20\d{2})\b/i)
    if (la?.[1]) {
      acc.vehicleYear = Number(la[1])
      continue
    }
    const lc = L.match(/^\s*cor\s*:\s*(.+)$/i)
    if (lc?.[1]) {
      const c = normalizeBravoVehicleColor(lc[1])
      if (c) acc.vehicleColor = c
    }
  }
  return acc
}

function mergeVehicle(base: BravoBasicFields, extra: Partial<BravoBasicFields>): void {
  if (!base.licensePlate && extra.licensePlate) base.licensePlate = extra.licensePlate
  if (!base.vehicleModel && extra.vehicleModel) base.vehicleModel = extra.vehicleModel
  if (base.vehicleYear === undefined && extra.vehicleYear !== undefined)
    base.vehicleYear = extra.vehicleYear
  if (!base.vehicleColor && extra.vehicleColor) base.vehicleColor = extra.vehicleColor
}

/**
 * PDFs achatados podem colocar ano/modelo/placa **antes** do rótulo "Dados do Veículo".
 * Procura linha a linha por padrão tabular (ano + Mercosul).
 */
function extractVehicleTabularLineScan(lines: string[]): Partial<BravoBasicFields> {
  const acc: BravoBasicFields = {}
  for (const raw of lines) {
    const L = normalizeLine(raw)
    if (!L) continue
    if (!/[A-Z]{3}\d[A-Z]\d{2}/i.test(L)) continue
    if (!/\b(19\d{2}|20\d{2})\b/.test(L)) continue
    mergeVehicle(acc, extractVehicleTabularCorrupted([L]))
  }
  return acc
}

function parseBravoBasicFieldsCore(rawText: string): {
  fields: BravoBasicFields
  diagnostics: BravoBasicFieldsDiagnostics
} {
  const normalized = normalizeDocumentText(rawText)
  const lines = normalized
    .split('\n')
    .map((l) => normalizeLine(l))
    .filter(Boolean)

  const out: BravoBasicFields = {}

  const compact = normalized.replace(/\s+/g, ' ').trim()

  out.documentNumber = extractBravoDocumentNumberPrimary(lines, compact)

  out.issuedAt = extractIssuedAtIso(lines, compact)
  out.entryAt = extractEntryAtIso(lines, compact)

  const mVehicle = compact.match(
    /\bPlaca\s*:\s*(\S+)\s+Modelo\s*:\s*(.+?)\s+Ano\s*:\s*(19\d{2}|20\d{2})\s+Cor\s*:\s*(\S+)/i,
  )
  const foundVehicleByCleanRegex = Boolean(mVehicle)
  if (mVehicle) {
    out.licensePlate = normalizePlateToken(mVehicle[1]!)
    const modelRaw = mVehicle[2]?.trim()
    if (modelRaw) out.vehicleModel = sanitizeOperationalText(modelRaw).slice(0, 200)
    const y = Number(mVehicle[3])
    if (Number.isFinite(y)) out.vehicleYear = y
    const cor = mVehicle[4]?.trim()
    if (cor) {
      const c = normalizeBravoVehicleColor(cor)
      if (c) out.vehicleColor = c
    }
  }

  const vehicleRegion = sliceBetweenHeaders(lines, /^dados\s+do\s+veiculo\b/i, [
    /^pecas\s+do\s+pedido\b/,
    /^servicos?\s+do\s+pedido\b/,
    /^dados\s+do\s+cliente\b/,
    /^observacoes?\b/,
    /^valores$/,
  ])
  const partialRegionLines = extractVehicleFromRegionLines(vehicleRegion)
  const partialCorrupted = extractVehicleTabularCorrupted(vehicleRegion)
  mergeVehicle(out, partialRegionLines)
  mergeVehicle(out, partialCorrupted)
  let partialLineScan: Partial<BravoBasicFields> = {}
  if (!out.licensePlate || !out.vehicleModel) {
    partialLineScan = extractVehicleTabularLineScan(lines)
    mergeVehicle(out, partialLineScan)
  }

  const partialCompactGlued: Partial<BravoBasicFields> = {}
  for (const raw of lines) {
    const p = extractVehicleCompactGluedLine(raw)
    mergeVehicle(partialCompactGlued, p)
  }
  mergeVehicle(out, partialCompactGlued)

  const foundVehicleByTabularScan =
    partialVehicleNonempty(partialRegionLines) ||
    partialVehicleNonempty(partialCorrupted) ||
    partialVehicleNonempty(partialLineScan) ||
    partialVehicleNonempty(partialCompactGlued)

  const clientFromBlock = extractBravoClienteBlockLine(lines)
  const clientFromNear = extractBravoClienteNearLabelWindow(lines)
  const clientRaw =
    clientFromBlock ?? clientFromNear ?? extractBravoClienteSection(lines) ?? undefined
  const foundClientByGrid = Boolean(clientFromBlock || clientFromNear)
  if (clientRaw) {
    const cleaned = sanitizeBravoClientDisplayName(clientRaw)
    if (cleaned.length >= 2 && /[a-záéíóúãõç]/i.test(cleaned)) out.clientName = cleaned
  }

  const diagnostics: BravoBasicFieldsDiagnostics = {
    lineCount: lines.length,
    foundDocumentNumber: Boolean(out.documentNumber),
    foundIssuedAt: Boolean(out.issuedAt),
    foundEntryAt: Boolean(out.entryAt),
    foundVehicleByCleanRegex,
    foundVehicleByTabularScan,
    foundClientByGrid,
    foundLicensePlate: Boolean(out.licensePlate),
    foundVehicleModel: Boolean(out.vehicleModel),
    foundVehicleYear: out.vehicleYear !== undefined,
    foundVehicleColor: Boolean(out.vehicleColor),
    foundClientName: Boolean(out.clientName),
  }

  return { fields: out, diagnostics }
}

/**
 * Analisa o texto linearizado do PDF Bravo antes de filtros operacionais (serviços, matching).
 * Datas em ISO yyyy-mm-dd. Não modifica o texto de entrada.
 */
export function parseBravoBasicFields(rawText: string): BravoBasicFields {
  return parseBravoBasicFieldsCore(rawText).fields
}

/** Para diagnóstico TD10.2 — inclui flags sem valores sensíveis. */
export function parseBravoBasicFieldsWithDiagnostics(rawText: string): {
  fields: BravoBasicFields
  diagnostics: BravoBasicFieldsDiagnostics
} {
  return parseBravoBasicFieldsCore(rawText)
}

/**
 * Secção Dados do Cliente: Nome na mesma linha ou após cabeçalho colunar.
 */
function extractBravoClienteSection(lines: string[]): string | undefined {
  const region = sliceBetweenHeaders(lines, /^dados\s+do\s+cliente\b/i, [
    /^observacoes?\b/,
    /^pecas\s+do\s+pedido\b/,
    /^servicos?\s+do\s+pedido\b/,
    /^dados\s+do\s+veiculo\b/,
  ])
  for (const raw of region) {
    const L = normalizeLine(raw)
    const m = L.match(/^\s*nome\s*:\s*(.+)$/i)
    if (!m?.[1]) continue
    let rest = m[1].trim()
    if (rest.length < 3) continue
    if (/^rg\/i\.e\./i.test(rest)) continue
    const low = rest.toLowerCase()
    if (/^cpf\/cnpj|^cpf\b|^e-?mail|^tel\.?/i.test(rest)) continue
    if (/nome\s*:\s*rg/i.test(low) && rest.length < 25) continue

    rest = stripCpfCnpjFragments(rest)
    if (rest.length < 3) continue
    const cleaned = sanitizeOperationalText(rest).slice(0, 200)
    if (!cleaned || !/[a-záéíóúãõç]/i.test(cleaned)) continue
    return cleaned
  }
  return undefined
}

function isClienteColumnHeaderLine(line: string): boolean {
  const nk = normKey(line)
  const hasNome = /\bnome\b/.test(nk)
  const hasCpf = /cpf\/cnpj/.test(nk)
  const hasRg = /rg\/i\.e/.test(nk)
  return hasNome && (hasCpf || hasRg)
}

/** Rótulos de grade Bravo sem valor — não são nome de cliente (TD10.6). */
export function isBravoClientLabelOnlyLine(line: string): boolean {
  const L = normalizeLine(line)
  if (!L) return true
  if (isClienteColumnHeaderLine(L)) return true

  const singles = [
    /^uf\s*:?\s*$/i,
    /^n[º°o]\s*:?\s*$/i,
    /^cep\s*:?\s*$/i,
    /^cidade\s*:?\s*$/i,
    /^bairro\s*:?\s*$/i,
    /^endere[cç]o\s*:?\s*$/i,
    /^e-?mail\s*:?\s*$/i,
    /^nome\s*:?\s*$/i,
    /^placa\s*:?\s*$/i,
    /^rg\/i\.e\.?\s*:?\s*$/i,
    /^cpf\/cnpj\s*:?\s*$/i,
    /^tel\.?\s*\d*\s*:?\s*$/i,
    /^tel\.?\s*\d+\s*:?\s*$/i,
  ]
  if (singles.some((re) => re.test(L))) return true

  if (/e-?mail|tel\.?\s*\d*/i.test(L) && !/\d{3}\.\d{3}\.\d{3}-\d{2}/.test(L)) {
    const residual = L.replace(/\[[^\]]*\]/g, ' ')
      .replace(/\b(e-?mail|tel\.?\s*\d*)\s*:?/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    const wordish = residual.match(/[A-Za-zÀ-ÿ]{3,}/g) ?? []
    const substantive = wordish.filter((w) => !/^(email|mail|tel)$/i.test(w))
    if (substantive.length < 2) return true
  }

  return false
}

const ISOLATED_CLIENT_LABEL_TOKEN = new Set(
  [
    'uf',
    'cep',
    'cidade',
    'bairro',
    'endereco',
    'email',
    'e-mail',
    'tel',
    'nome',
    'rg',
    'cpf',
    'cnpj',
    'nº',
    'n°',
    'no',
    'nr',
    'placa',
    'crm',
  ].map((s) => stripAccents(s).toLowerCase()),
)

function looksLikeBravoStreetAddressLine(line: string): boolean {
  return /^(rua|av\.|avenida|estrada|rodovia|alameda|travessa|pra[cç]a)\s+/i.test(
    normalizeLine(line),
  )
}

/** Linha tabular de veículo — não confundir com cliente (TD10.6). */
function looksLikeBravoVehicleSpecificationLine(line: string): boolean {
  const L = normalizeLine(line)
  return /\bplaca\s*:/i.test(L) && /\bmodelo\s*:/i.test(L)
}

/** Cabeçalhos de secção — aparecem junto ao bloco cliente na importação. */
function looksLikeBravoSectionHeadingLine(line: string): boolean {
  const nk = normKey(line).trim()
  return /^(dados\s+do\s+cliente|dados\s+do\s+ve[ií]culo|observa[cç][oõ]es?|valores|pecas\s+do\s+pedido|servicos?\s+do\s+pedido|dados\s+adicionais)$/i.test(
    nk,
  )
}

function countUsefulWordsInClienteName(cleaned: string): number {
  const tokens = cleaned.split(/\s+/).filter(Boolean)
  let n = 0
  for (const tok of tokens) {
    const w = stripAccents(tok.replace(/^:+|:+$/g, '')).toLowerCase()
    if (w.length < 2) continue
    if (ISOLATED_CLIENT_LABEL_TOKEN.has(w)) continue
    if (!/[a-záéíóúãõç]/i.test(tok)) continue
    n++
  }
  return n
}

function clienteLineCandidateScore(raw: string): number {
  const L = normalizeLine(raw)
  if (
    !L ||
    isBravoClientLabelOnlyLine(L) ||
    looksLikeBravoVehicleSpecificationLine(L) ||
    looksLikeBravoSectionHeadingLine(L)
  )
    return -1000
  let s = 0
  if (/\d{3}\.\d{3}\.\d{3}-\d{2}/.test(L)) s += 220
  else {
    const digits = L.replace(/\D/g, '')
    if (digits.length >= 11) s += 180
  }
  const wc = countUsefulWordsInClienteName(
    sanitizeBravoClientDisplayName(stripCpfCnpjFragments(L)),
  )
  if (wc >= 4) s += 70
  else if (wc === 3) s += 45
  else if (wc === 2) s += 25
  return s
}

function collectClienteCandidatesAroundHeader(
  headerIdx: number,
  lines: string[],
): Array<{ j: number; score: number }> {
  const scored: Array<{ j: number; score: number }> = []
  for (let k = 1; k <= 8; k++) {
    const j = headerIdx + k
    if (j < lines.length) scored.push({ j, score: clienteLineCandidateScore(lines[j]!) })
  }
  for (let k = 1; k <= 3; k++) {
    const j = headerIdx - k
    if (j >= 0) scored.push({ j, score: clienteLineCandidateScore(lines[j]!) })
  }
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    const af = a.j > headerIdx ? 1 : 0
    const bf = b.j > headerIdx ? 1 : 0
    if (af !== bf) return bf - af
    const da = Math.abs(a.j - headerIdx)
    const db = Math.abs(b.j - headerIdx)
    if (da !== db) return da - db
    return a.j - b.j
  })
  return scored
}

function tryAcceptClienteContentLine(raw: string): string | undefined {
  const L = normalizeLine(raw)
  if (!L) return undefined
  if (isBravoClientLabelOnlyLine(L)) return undefined
  if (isClienteColumnHeaderLine(L)) return undefined
  if (/^nome\s*:\s*rg/i.test(L)) return undefined
  if (looksLikeBravoStreetAddressLine(L)) return undefined
  if (looksLikeBravoVehicleSpecificationLine(L)) return undefined
  if (looksLikeBravoSectionHeadingLine(L)) return undefined
  const nk = normKey(L)
  if (/^pecas?\s+do\s+pedido/.test(nk)) return undefined
  if (/^servicos?\s+do\s+pedido/.test(nk)) return undefined
  if (/\bR\$\s*[\d.,]+/i.test(L)) return undefined
  if (/\b(total|sub\s*total|desconto|pagamento|recebido|troco)\b/i.test(L)) return undefined
  if (/UN\s*@/i.test(L)) return undefined
  if (/^\S+@\S+\.\S+$/.test(L.trim())) return undefined

  const stripped = stripCpfCnpjFragments(L)
  const cleaned = sanitizeBravoClientDisplayName(stripped)
  if (cleaned.length < 2) return undefined
  if (!/[a-záéíóúãõç]/i.test(cleaned)) return undefined
  if (/:\s*$/.test(cleaned.trim())) return undefined

  const parts = cleaned.split(/\s+/).filter(Boolean)
  if (
    parts.length === 1 &&
    ISOLATED_CLIENT_LABEL_TOKEN.has(stripAccents(parts[0]!).toLowerCase())
  ) {
    return undefined
  }

  const useful = countUsefulWordsInClienteName(cleaned)
  if (useful < 2) return undefined

  return cleaned
}

/** Cabeçalho RG/Nome/CPF em qualquer ordem — nome útil nas linhas seguintes/anteriores. */
function extractBravoClienteNearLabelWindow(lines: string[]): string | undefined {
  for (let i = 0; i < lines.length; i++) {
    if (!isClienteColumnHeaderLine(lines[i]!)) continue
    for (const { j } of collectClienteCandidatesAroundHeader(i, lines)) {
      if (clienteLineCandidateScore(lines[j]!) < 0) continue
      const cand = tryAcceptClienteContentLine(lines[j]!)
      if (cand) return cand
    }
  }
  return undefined
}

/**
 * Linha única tipo cabeçalho colunar `Nome: RG/I.E.: CPF/CNPJ:` — nome nas linhas seguintes.
 */
function extractBravoClienteBlockLine(lines: string[]): string | undefined {
  for (let i = 0; i < lines.length; i++) {
    const L = lines[i]!
    const low = L.toLowerCase()
    const isHeaderRow =
      isClienteColumnHeaderLine(L) ||
      /^nome\s*:\s*rg/i.test(L) ||
      /nome\s*:\s*rg\/i\.e\.\s*:\s*cpf/i.test(low) ||
      /^nome\s*:\s*rg\/i\.e\.\s*:\s*cpf\/cnpj\s*:/i.test(L.trim())

    if (!isHeaderRow) continue

    for (const { j } of collectClienteCandidatesAroundHeader(i, lines)) {
      if (clienteLineCandidateScore(lines[j]!) < 0) continue
      const cand = tryAcceptClienteContentLine(lines[j]!)
      if (cand) return cand
    }
  }

  return undefined
}
