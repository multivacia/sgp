/**
 * Export Excel da Jornada por colaborador (um ou vários colaboradores). Módulo puro — sem I/O.
 *
 * Segue o padrão das exportações do planejamento semanal (ExcelJS, cabeçalho escuro,
 * duração em `[h]:mm`, sanitização de texto livre). Helpers pequenos são duplicados
 * propositalmente para manter o isolamento entre módulos de exportação.
 *
 * Totais do "Resumo" vêm do mesmo serviço da tela (`serviceGetOperationalJourney`);
 * subtotais das abas de detalhe são somas das linhas exportadas (mesmo universo SQL).
 */
import ExcelJS from 'exceljs'

export type OperationalJourneyExportPeriodPreset = '7d' | '15d' | '30d' | 'month' | 'custom'

export type OperationalJourneyExportMeta = {
  /** Dia operacional (America/Sao_Paulo) de início — `YYYY-MM-DD`. */
  periodFromDate: string
  /** Dia operacional (America/Sao_Paulo) de fim — `YYYY-MM-DD`. */
  periodToDate: string
  periodPreset: OperationalJourneyExportPeriodPreset
  /** Nome da esteira filtrada (null = todas). */
  conveyorFilterLabel: string | null
  generatedAt: Date
}

export type OperationalJourneyExportTotals = {
  assignmentCount: number
  plannedMinutesOnStepsSum: number
  realizedMinutesInPeriod: number
  realizedMinutesTotal: number
  /** Numerador/denominador da cobertura (escopo) — razão recalculada no total geral. */
  coberturaRealizadoMinutos: number
  coberturaPrevistoMinutos: number
  extraMinutesInPeriod: number
  extraEntriesCount: number
  overdueCount: number
  pendenciaTempoCount: number
}

export type OperationalJourneyExportTimeEntry = {
  /** Dia operacional do apontamento — `YYYY-MM-DD`. */
  workDate: string
  conveyorCode: string | null
  conveyorName: string
  optionName: string | null
  areaName: string | null
  stepName: string
  minutes: number
  executedQuantity: number | null
  entryOrigin: 'ASSIGNED' | 'UNASSIGNED_EXCEPTION'
  isOutOfSequence: boolean
  justification: string | null
  notes: string | null
}

export type OperationalJourneyExportExtraEntry = {
  entryDate: string
  description: string
  minutes: number
  notes: string | null
}

export type OperationalJourneyExportCollaborator = {
  collaboratorId: string
  fullName: string
  code: string | null
  registrationCode: string | null
  totals: OperationalJourneyExportTotals
  timeEntries: OperationalJourneyExportTimeEntry[]
  extraEntries: OperationalJourneyExportExtraEntry[]
}

const PERIOD_PRESET_LABELS: Record<OperationalJourneyExportPeriodPreset, string> = {
  '7d': 'Últimos 7 dias',
  '15d': 'Últimos 15 dias',
  '30d': 'Últimos 30 dias',
  month: 'Mês atual (UTC)',
  custom: 'Intervalo personalizado',
}

const FILL_HEADER: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF1F2933' },
}
const FONT_HEADER: Partial<ExcelJS.Font> = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }

const FILL_SUBTOTAL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFE8EEF4' },
}
const FILL_TOTAL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFFFF2CC' },
}

const TABLE_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin' },
  left: { style: 'thin' },
  bottom: { style: 'thin' },
  right: { style: 'thin' },
}

const SUMMARY_HEADERS = [
  'Colaborador',
  'Código',
  'Matrícula',
  'Apontamentos no período',
  'Minutos apontados (período)',
  'Extra esteira (período)',
  'Lançamentos extra esteira',
  'Alocações (escopo)',
  'Previsto estrutural (escopo)',
  'Minutos apontados (acumulado)',
  'Cobertura de tempo',
  'Alocações em atraso',
  'Pendências de tempo',
] as const
const SUMMARY_COLUMN_WIDTHS = [30, 12, 14, 14, 18, 16, 14, 12, 18, 18, 14, 12, 14]

const ENTRY_HEADERS = [
  'Colaborador',
  'Código',
  'Data',
  'Código/OS',
  'Esteira',
  'Tarefa',
  'Setor',
  'Atividade',
  'Tempo',
  'Minutos',
  'Qtd executada',
  'Origem',
  'Fora de sequência',
  'Justificativa',
  'Observações',
] as const
const ENTRY_COLUMN_WIDTHS = [28, 12, 12, 14, 26, 20, 20, 26, 10, 10, 12, 16, 12, 32, 32]

const EXTRA_HEADERS = ['Colaborador', 'Código', 'Data', 'Descrição', 'Tempo', 'Minutos', 'Observações'] as const
const EXTRA_COLUMN_WIDTHS = [28, 12, 12, 34, 10, 10, 40]

const HEADER_ROW_SUMMARY = 8
const HEADER_ROW_DETAIL = 3

/** Protege células de texto livre contra reinterpretação como fórmula por leitores externos. */
export function sanitizeExcelText(value: string): string {
  if (/^[=+\-@]/.test(value)) return `'${value}`
  return value
}

/** Parse `YYYY-MM-DD` em componentes locais — nunca `new Date('YYYY-MM-DD')` (evita deslocamento de fuso). */
function excelDateFromIso(dateIso: string): Date {
  const [y, m, d] = dateIso.split('-').map(Number)
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1)
}

function formatDateIsoBr(dateIso: string): string {
  const [y, m, d] = dateIso.split('-')
  return `${d}/${m}/${y}`
}

function formatTimestampBrPt(date: Date): string {
  return date.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Cobertura = realizado / previsto; null quando previsto ≤ 0 (mesma regra de `computeCoberturaTempo`). */
export function journeyExportCoberturaRatio(realizado: number, previsto: number): number | null {
  if (!Number.isFinite(previsto) || previsto <= 0 || !Number.isFinite(realizado)) return null
  return realizado / previsto
}

/** Soma os totais de vários colaboradores; a cobertura é recalculada sobre as somas. */
export function sumJourneyExportTotals(
  items: readonly OperationalJourneyExportTotals[],
): OperationalJourneyExportTotals {
  const acc: OperationalJourneyExportTotals = {
    assignmentCount: 0,
    plannedMinutesOnStepsSum: 0,
    realizedMinutesInPeriod: 0,
    realizedMinutesTotal: 0,
    coberturaRealizadoMinutos: 0,
    coberturaPrevistoMinutos: 0,
    extraMinutesInPeriod: 0,
    extraEntriesCount: 0,
    overdueCount: 0,
    pendenciaTempoCount: 0,
  }
  for (const t of items) {
    acc.assignmentCount += t.assignmentCount
    acc.plannedMinutesOnStepsSum += t.plannedMinutesOnStepsSum
    acc.realizedMinutesInPeriod += t.realizedMinutesInPeriod
    acc.realizedMinutesTotal += t.realizedMinutesTotal
    acc.coberturaRealizadoMinutos += t.coberturaRealizadoMinutos
    acc.coberturaPrevistoMinutos += t.coberturaPrevistoMinutos
    acc.extraMinutesInPeriod += t.extraMinutesInPeriod
    acc.extraEntriesCount += t.extraEntriesCount
    acc.overdueCount += t.overdueCount
    acc.pendenciaTempoCount += t.pendenciaTempoCount
  }
  return acc
}

export function buildOperationalJourneyExportFilename(
  meta: Pick<OperationalJourneyExportMeta, 'periodFromDate' | 'periodToDate'>,
  collaboratorCount: number,
): string {
  const who = collaboratorCount === 1 ? 'colaborador' : `${collaboratorCount}-colaboradores`
  return `jornada-${who}-${meta.periodFromDate}-a-${meta.periodToDate}.xlsx`
}

function writeHeaderRow(sheet: ExcelJS.Worksheet, rowNumber: number, headers: readonly string[]): void {
  const row = sheet.getRow(rowNumber)
  headers.forEach((label, idx) => {
    const cell = row.getCell(idx + 1)
    cell.value = label
    cell.fill = FILL_HEADER
    cell.font = FONT_HEADER
    cell.border = TABLE_BORDER
    cell.alignment = { vertical: 'middle', wrapText: true }
  })
}

function setTextCell(cell: ExcelJS.Cell, value: string | null | undefined): void {
  const v = value?.trim() ?? ''
  cell.value = v ? sanitizeExcelText(v) : ''
}

function setDurationCell(cell: ExcelJS.Cell, minutes: number): void {
  cell.value = Math.max(0, minutes) / 1440
  cell.numFmt = '[h]:mm'
}

function setDateCell(cell: ExcelJS.Cell, dateIso: string): void {
  cell.value = excelDateFromIso(dateIso)
  cell.numFmt = 'dd/mm/yyyy'
}

function setRatioCell(cell: ExcelJS.Cell, ratio: number | null): void {
  if (ratio == null) {
    cell.value = 'Não aplicável'
    return
  }
  cell.value = ratio
  cell.numFmt = '0.0%'
}

function styleRow(row: ExcelJS.Row, columnCount: number, fill?: ExcelJS.Fill, bold = false): void {
  for (let col = 1; col <= columnCount; col += 1) {
    const cell = row.getCell(col)
    cell.border = TABLE_BORDER
    cell.alignment = { vertical: 'top', wrapText: true }
    cell.font = { size: 11, bold }
    if (fill) cell.fill = fill
  }
}

function finishTable(sheet: ExcelJS.Worksheet, headerRow: number, columnCount: number): void {
  sheet.autoFilter = {
    from: { row: headerRow, column: 1 },
    to: { row: headerRow, column: columnCount },
  }
  sheet.views = [{ state: 'frozen', ySplit: headerRow }]
  sheet.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
}

function writeSummaryTotalsCells(row: ExcelJS.Row, t: OperationalJourneyExportTotals, entriesCount: number): void {
  row.getCell(4).value = entriesCount
  setDurationCell(row.getCell(5), t.realizedMinutesInPeriod)
  setDurationCell(row.getCell(6), t.extraMinutesInPeriod)
  row.getCell(7).value = t.extraEntriesCount
  row.getCell(8).value = t.assignmentCount
  setDurationCell(row.getCell(9), t.plannedMinutesOnStepsSum)
  setDurationCell(row.getCell(10), t.realizedMinutesTotal)
  setRatioCell(
    row.getCell(11),
    journeyExportCoberturaRatio(t.coberturaRealizadoMinutos, t.coberturaPrevistoMinutos),
  )
  row.getCell(12).value = t.overdueCount
  row.getCell(13).value = t.pendenciaTempoCount
}

function addSummarySheet(
  workbook: ExcelJS.Workbook,
  meta: OperationalJourneyExportMeta,
  collaborators: readonly OperationalJourneyExportCollaborator[],
): void {
  const sheet = workbook.addWorksheet('Resumo')
  const cols = SUMMARY_HEADERS.length
  SUMMARY_COLUMN_WIDTHS.forEach((w, i) => {
    sheet.getColumn(i + 1).width = w
  })
  const lines = [
    'SGP+ — Jornada por colaborador',
    `Período: ${formatDateIsoBr(meta.periodFromDate)} a ${formatDateIsoBr(meta.periodToDate)} (${PERIOD_PRESET_LABELS[meta.periodPreset]})`,
    `Esteira: ${meta.conveyorFilterLabel?.trim() || 'Todas'}`,
    `Colaboradores: ${collaborators.length}`,
    `Gerado em: ${formatTimestampBrPt(meta.generatedAt)}`,
    'Período = apontamentos com data no intervalo. Escopo/acumulado = alocações e apontamentos de todo o histórico (mesma regra da tela).',
  ]
  lines.forEach((text, i) => {
    const r = i + 1
    sheet.mergeCells(r, 1, r, cols)
    sheet.getCell(r, 1).value = text
    sheet.getRow(r).font = i === 0 ? { bold: true, size: 14 } : { bold: i < 5, size: i < 5 ? 11 : 10 }
  })

  writeHeaderRow(sheet, HEADER_ROW_SUMMARY, SUMMARY_HEADERS)
  let rowNumber = HEADER_ROW_SUMMARY + 1
  for (const c of collaborators) {
    const row = sheet.getRow(rowNumber)
    setTextCell(row.getCell(1), c.fullName)
    setTextCell(row.getCell(2), c.code)
    setTextCell(row.getCell(3), c.registrationCode)
    writeSummaryTotalsCells(row, c.totals, c.timeEntries.length)
    styleRow(row, cols)
    rowNumber += 1
  }
  if (collaborators.length > 1) {
    const row = sheet.getRow(rowNumber)
    row.getCell(1).value = 'Total geral'
    writeSummaryTotalsCells(
      row,
      sumJourneyExportTotals(collaborators.map((c) => c.totals)),
      collaborators.reduce((s, c) => s + c.timeEntries.length, 0),
    )
    styleRow(row, cols, FILL_TOTAL, true)
  }
  finishTable(sheet, HEADER_ROW_SUMMARY, cols)
}

function originLabel(origin: OperationalJourneyExportTimeEntry['entryOrigin']): string {
  return origin === 'UNASSIGNED_EXCEPTION' ? 'Exceção (sem alocação)' : 'Alocado'
}

function addEntriesSheet(
  workbook: ExcelJS.Workbook,
  meta: OperationalJourneyExportMeta,
  collaborators: readonly OperationalJourneyExportCollaborator[],
): void {
  const sheet = workbook.addWorksheet('Apontamentos')
  const cols = ENTRY_HEADERS.length
  ENTRY_COLUMN_WIDTHS.forEach((w, i) => {
    sheet.getColumn(i + 1).width = w
  })
  sheet.mergeCells(1, 1, 1, cols)
  sheet.getCell(1, 1).value =
    `Apontamentos em esteira — ${formatDateIsoBr(meta.periodFromDate)} a ${formatDateIsoBr(meta.periodToDate)}`
  sheet.getRow(1).font = { bold: true, size: 14 }
  writeHeaderRow(sheet, HEADER_ROW_DETAIL, ENTRY_HEADERS)

  let rowNumber = HEADER_ROW_DETAIL + 1
  let grandMinutes = 0
  let grandCount = 0
  for (const c of collaborators) {
    let subtotal = 0
    for (const e of c.timeEntries) {
      const row = sheet.getRow(rowNumber)
      setTextCell(row.getCell(1), c.fullName)
      setTextCell(row.getCell(2), c.code)
      setDateCell(row.getCell(3), e.workDate)
      setTextCell(row.getCell(4), e.conveyorCode)
      setTextCell(row.getCell(5), e.conveyorName)
      setTextCell(row.getCell(6), e.optionName)
      setTextCell(row.getCell(7), e.areaName)
      setTextCell(row.getCell(8), e.stepName)
      setDurationCell(row.getCell(9), e.minutes)
      row.getCell(10).value = e.minutes
      row.getCell(11).value = e.executedQuantity
      row.getCell(12).value = originLabel(e.entryOrigin)
      row.getCell(13).value = e.isOutOfSequence ? 'Sim' : 'Não'
      setTextCell(row.getCell(14), e.justification)
      setTextCell(row.getCell(15), e.notes)
      styleRow(row, cols)
      subtotal += e.minutes
      rowNumber += 1
    }
    const sub = sheet.getRow(rowNumber)
    sub.getCell(1).value = sanitizeExcelText(`Subtotal — ${c.fullName}`)
    sub.getCell(8).value = `${c.timeEntries.length} apontamento(s)`
    setDurationCell(sub.getCell(9), subtotal)
    sub.getCell(10).value = subtotal
    styleRow(sub, cols, FILL_SUBTOTAL, true)
    rowNumber += 1
    grandMinutes += subtotal
    grandCount += c.timeEntries.length
  }
  if (collaborators.length > 1) {
    const total = sheet.getRow(rowNumber)
    total.getCell(1).value = 'Total geral'
    total.getCell(8).value = `${grandCount} apontamento(s)`
    setDurationCell(total.getCell(9), grandMinutes)
    total.getCell(10).value = grandMinutes
    styleRow(total, cols, FILL_TOTAL, true)
  }
  finishTable(sheet, HEADER_ROW_DETAIL, cols)
}

function addExtraSheet(
  workbook: ExcelJS.Workbook,
  meta: OperationalJourneyExportMeta,
  collaborators: readonly OperationalJourneyExportCollaborator[],
): void {
  const sheet = workbook.addWorksheet('Extra esteira')
  const cols = EXTRA_HEADERS.length
  EXTRA_COLUMN_WIDTHS.forEach((w, i) => {
    sheet.getColumn(i + 1).width = w
  })
  sheet.mergeCells(1, 1, 1, cols)
  sheet.getCell(1, 1).value =
    `Apontamentos fora de esteira — ${formatDateIsoBr(meta.periodFromDate)} a ${formatDateIsoBr(meta.periodToDate)} (não dependem do filtro de esteira)`
  sheet.getRow(1).font = { bold: true, size: 14 }
  writeHeaderRow(sheet, HEADER_ROW_DETAIL, EXTRA_HEADERS)

  let rowNumber = HEADER_ROW_DETAIL + 1
  let grand = 0
  for (const c of collaborators) {
    let subtotal = 0
    for (const e of c.extraEntries) {
      const row = sheet.getRow(rowNumber)
      setTextCell(row.getCell(1), c.fullName)
      setTextCell(row.getCell(2), c.code)
      setDateCell(row.getCell(3), e.entryDate)
      setTextCell(row.getCell(4), e.description)
      setDurationCell(row.getCell(5), e.minutes)
      row.getCell(6).value = e.minutes
      setTextCell(row.getCell(7), e.notes)
      styleRow(row, cols)
      subtotal += e.minutes
      rowNumber += 1
    }
    const sub = sheet.getRow(rowNumber)
    sub.getCell(1).value = sanitizeExcelText(`Subtotal — ${c.fullName}`)
    sub.getCell(4).value = `${c.extraEntries.length} lançamento(s)`
    setDurationCell(sub.getCell(5), subtotal)
    sub.getCell(6).value = subtotal
    styleRow(sub, cols, FILL_SUBTOTAL, true)
    rowNumber += 1
    grand += subtotal
  }
  if (collaborators.length > 1) {
    const total = sheet.getRow(rowNumber)
    total.getCell(1).value = 'Total geral'
    setDurationCell(total.getCell(5), grand)
    total.getCell(6).value = grand
    styleRow(total, cols, FILL_TOTAL, true)
  }
  finishTable(sheet, HEADER_ROW_DETAIL, cols)
}

export async function buildOperationalJourneyExportWorkbookBuffer(input: {
  meta: OperationalJourneyExportMeta
  collaborators: OperationalJourneyExportCollaborator[]
}): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  addSummarySheet(workbook, input.meta, input.collaborators)
  addEntriesSheet(workbook, input.meta, input.collaborators)
  addExtraSheet(workbook, input.meta, input.collaborators)
  const raw = await workbook.xlsx.writeBuffer()
  return Buffer.isBuffer(raw) ? raw : Buffer.from(raw)
}
