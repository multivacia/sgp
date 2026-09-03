/**
 * Export Excel do planejamento semanal (draft ?? published). Módulo puro — sem I/O.
 * Não reaproveita `operation-matrix.export.ts` além do estilo/estrutura de referência.
 */
import ExcelJS from 'exceljs'

export type OperationalPlanningExportSituation =
  | 'PUBLICADO'
  | 'RASCUNHO'
  | 'REVISAO_NAO_PUBLICADA'

export type OperationalPlanningExportMeta = {
  weekStartDate: string
  weekEndDate: string
  situation: OperationalPlanningExportSituation
  generatedAt: Date
  totalActivities: number
  totalPlannedMinutes: number
  collaboratorsWithActivityCount: number
}

export type OperationalPlanningExportPlanningRow = {
  plannedDate: string
  collaboratorName: string
  teamName: string
  conveyorCode: string
  conveyorTitle: string
  clientName: string
  vehicle: string
  plate: string
  /**
   * Texto livre (`conveyors.estimated_deadline` é VARCHAR, não DATE — pode conter
   * "15 dias", "Início previsto: ... · Fim previsto: ...", ISO ou vazio). NUNCA
   * tratado como data (ver `setTextCell` abaixo) — evita parse incorreto/quebra.
   */
  estimatedDeadline: string
  taskTitle: string
  sectorTitle: string
  activityTitle: string
  plannedOrderDisplay: number
  plannedMinutes: number | null
  statusLabel: string
  notes: string
  reviewRequiredLabel: string
}

export type OperationalPlanningExportCapacityRow = {
  date: string
  collaboratorName: string
  capacityMinutes: number | null
  plannedMinutes: number
  balanceMinutes: number | null
  occupancyRatio: number | null
  statusLabel: 'Capacidade não cadastrada' | 'Sobrecarregado' | 'No limite' | 'Disponível'
}

const WEEKDAY_LABELS_PT = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
] as const

const FILL_HEADER: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF1F2933' },
}
const FONT_HEADER: Partial<ExcelJS.Font> = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }

const FILL_RED: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFF4CCCC' },
}
const FONT_RED: Partial<ExcelJS.Font> = { color: { argb: 'FFCC0000' } }

const FILL_AMBER: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFFFF2CC' },
}
const FONT_AMBER: Partial<ExcelJS.Font> = { color: { argb: 'FF7F6000' } }

const FILL_GREEN: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFD9EAD3' },
}
const FONT_GREEN: Partial<ExcelJS.Font> = { color: { argb: 'FF274E13' } }

const TABLE_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin' },
  left: { style: 'thin' },
  bottom: { style: 'thin' },
  right: { style: 'thin' },
}

const PLANNING_HEADERS = [
  'Data',
  'Dia da semana',
  'Colaborador',
  'Equipe',
  'Código/OS',
  'Esteira',
  'Cliente',
  'Veículo',
  'Placa',
  'Prazo da esteira',
  'Tarefa',
  'Setor',
  'Atividade',
  'Ordem no planejamento',
  'Tempo planejado',
  'Situação',
  'Observações',
  'Revisão necessária',
] as const

const PLANNING_COLUMN_WIDTHS = [
  14, 16, 24, 20, 14, 26, 20, 18, 12, 16, 22, 20, 26, 9, 16, 16, 32, 40,
]

const PLANNING_TITLE_TEXT = 'SGP+ — Planejamento semanal'

const PLANNING_TITLE_ROW = 1
const PLANNING_PERIOD_ROW = 2
const PLANNING_SITUATION_ROW = 3
const PLANNING_GENERATED_ROW = 4
const PLANNING_TOTALS_ROW = 5
const PLANNING_HEADER_ROW = 7
const PLANNING_COLUMN_COUNT = PLANNING_HEADERS.length

const CAPACITY_HEADERS = [
  'Data',
  'Dia da semana',
  'Colaborador',
  'Capacidade disponível',
  'Tempo planejado',
  'Saldo',
  'Ocupação',
  'Situação',
] as const

const CAPACITY_COLUMN_WIDTHS = [14, 16, 24, 20, 18, 14, 12, 22]

const CAPACITY_TITLE_ROW = 1
const CAPACITY_HEADER_ROW = 3
const CAPACITY_COLUMN_COUNT = CAPACITY_HEADERS.length

export function buildOperationalPlanningExportFilename(
  weekStartDate: string,
  weekEndDate: string,
  situation: OperationalPlanningExportSituation,
): string {
  const slug =
    situation === 'PUBLICADO'
      ? 'publicado'
      : situation === 'RASCUNHO'
        ? 'rascunho'
        : 'revisao-nao-publicada'
  return `planejamento-semanal-${weekStartDate}-a-${weekEndDate}-${slug}.xlsx`
}

/** Parse `YYYY-MM-DD` em componentes locais — nunca `new Date('YYYY-MM-DD')` (evita deslocamento de fuso). */
export function excelDateFromIso(dateIso: string): Date {
  const [y, m, d] = dateIso.split('-').map(Number)
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1)
}

export function weekdayLabelPt(dateIso: string): string {
  const date = excelDateFromIso(dateIso)
  return WEEKDAY_LABELS_PT[date.getDay()] ?? ''
}

/** Protege células de texto livre contra reinterpretação como fórmula por leitores externos. */
export function sanitizeExcelText(value: string): string {
  if (/^[=+\-@]/.test(value)) return `'${value}`
  return value
}

function formatSituationLabel(situation: OperationalPlanningExportSituation): string {
  if (situation === 'PUBLICADO') return 'PUBLICADO'
  if (situation === 'RASCUNHO') return 'RASCUNHO'
  return 'REVISÃO NÃO PUBLICADA'
}

function formatDateBrPt(date: Date): string {
  return date.toLocaleDateString('pt-BR')
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

function formatMinutesLabel(minutes: number): string {
  const min = Math.max(0, Math.floor(minutes))
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h} h ${m} min` : `${h} h`
}

function applyTableCellStyle(cell: ExcelJS.Cell): void {
  cell.border = TABLE_BORDER
  cell.alignment = { vertical: 'top', wrapText: true }
  if (!cell.font) cell.font = { size: 11 }
}

function writeHeaderRow(
  sheet: ExcelJS.Worksheet,
  rowNumber: number,
  headers: readonly string[],
): void {
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

function setDateCell(cell: ExcelJS.Cell, dateIso: string | null): void {
  if (!dateIso) {
    cell.value = '—'
    return
  }
  cell.value = excelDateFromIso(dateIso)
  cell.numFmt = 'dd/mm/yyyy'
}

function setDurationCell(cell: ExcelJS.Cell, minutes: number | null): void {
  if (minutes == null) {
    cell.value = null
    return
  }
  cell.value = Math.max(0, minutes) / 1440
  cell.numFmt = '[h]:mm'
}

function setTextCell(cell: ExcelJS.Cell, value: string): void {
  cell.value = sanitizeExcelText(value)
}

function addPlanningSheet(
  workbook: ExcelJS.Workbook,
  meta: OperationalPlanningExportMeta,
  rows: readonly OperationalPlanningExportPlanningRow[],
): void {
  const sheet = workbook.addWorksheet('Planejamento')
  PLANNING_COLUMN_WIDTHS.forEach((width, idx) => {
    sheet.getColumn(idx + 1).width = width
  })

  sheet.mergeCells(PLANNING_TITLE_ROW, 1, PLANNING_TITLE_ROW, PLANNING_COLUMN_COUNT)
  sheet.getCell(PLANNING_TITLE_ROW, 1).value = PLANNING_TITLE_TEXT
  sheet.getRow(PLANNING_TITLE_ROW).font = { bold: true, size: 14 }

  sheet.mergeCells(PLANNING_PERIOD_ROW, 1, PLANNING_PERIOD_ROW, PLANNING_COLUMN_COUNT)
  sheet.getCell(PLANNING_PERIOD_ROW, 1).value =
    `Período: ${formatDateBrPt(excelDateFromIso(meta.weekStartDate))} a ${formatDateBrPt(excelDateFromIso(meta.weekEndDate))}`
  sheet.getRow(PLANNING_PERIOD_ROW).font = { bold: true, size: 11 }

  sheet.mergeCells(PLANNING_SITUATION_ROW, 1, PLANNING_SITUATION_ROW, PLANNING_COLUMN_COUNT)
  const situationCell = sheet.getCell(PLANNING_SITUATION_ROW, 1)
  situationCell.value = `Situação: ${formatSituationLabel(meta.situation)}`
  situationCell.font = { bold: true, size: 11 }
  if (meta.situation === 'PUBLICADO') {
    situationCell.fill = FILL_GREEN
    situationCell.font = { ...situationCell.font, ...FONT_GREEN }
  } else if (meta.situation === 'REVISAO_NAO_PUBLICADA') {
    situationCell.fill = FILL_AMBER
    situationCell.font = { ...situationCell.font, ...FONT_AMBER }
  }

  sheet.mergeCells(PLANNING_GENERATED_ROW, 1, PLANNING_GENERATED_ROW, PLANNING_COLUMN_COUNT)
  sheet.getCell(PLANNING_GENERATED_ROW, 1).value =
    `Gerado em: ${formatTimestampBrPt(meta.generatedAt)}`

  sheet.mergeCells(PLANNING_TOTALS_ROW, 1, PLANNING_TOTALS_ROW, PLANNING_COLUMN_COUNT)
  sheet.getCell(PLANNING_TOTALS_ROW, 1).value =
    `Total de atividades: ${meta.totalActivities}   |   Tempo planejado total: ${formatMinutesLabel(meta.totalPlannedMinutes)}   |   Colaboradores com atividade: ${meta.collaboratorsWithActivityCount}`

  writeHeaderRow(sheet, PLANNING_HEADER_ROW, PLANNING_HEADERS)

  let rowNumber = PLANNING_HEADER_ROW + 1
  for (const row of rows) {
    const excelRow = sheet.getRow(rowNumber)
    setDateCell(excelRow.getCell(1), row.plannedDate)
    excelRow.getCell(2).value = weekdayLabelPt(row.plannedDate)
    setTextCell(excelRow.getCell(3), row.collaboratorName)
    setTextCell(excelRow.getCell(4), row.teamName)
    setTextCell(excelRow.getCell(5), row.conveyorCode)
    setTextCell(excelRow.getCell(6), row.conveyorTitle)
    setTextCell(excelRow.getCell(7), row.clientName)
    setTextCell(excelRow.getCell(8), row.vehicle)
    setTextCell(excelRow.getCell(9), row.plate)
    setTextCell(excelRow.getCell(10), row.estimatedDeadline)
    setTextCell(excelRow.getCell(11), row.taskTitle)
    setTextCell(excelRow.getCell(12), row.sectorTitle)
    setTextCell(excelRow.getCell(13), row.activityTitle)
    excelRow.getCell(14).value = row.plannedOrderDisplay
    setDurationCell(excelRow.getCell(15), row.plannedMinutes)
    setTextCell(excelRow.getCell(16), row.statusLabel)
    setTextCell(excelRow.getCell(17), row.notes)
    setTextCell(excelRow.getCell(18), row.reviewRequiredLabel)

    for (let col = 1; col <= PLANNING_COLUMN_COUNT; col += 1) {
      applyTableCellStyle(excelRow.getCell(col))
    }

    if (row.statusLabel === 'Concluída') {
      for (let col = 1; col <= PLANNING_COLUMN_COUNT; col += 1) {
        const cell = excelRow.getCell(col)
        cell.fill = FILL_GREEN
        cell.font = { ...(cell.font ?? {}), ...FONT_GREEN }
      }
    }

    rowNumber += 1
  }

  sheet.autoFilter = {
    from: { row: PLANNING_HEADER_ROW, column: 1 },
    to: { row: PLANNING_HEADER_ROW, column: PLANNING_COLUMN_COUNT },
  }
  sheet.views = [{ state: 'frozen', ySplit: PLANNING_HEADER_ROW }]
  sheet.pageSetup = {
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
  }
}

function addCapacitySheet(
  workbook: ExcelJS.Workbook,
  meta: OperationalPlanningExportMeta,
  rows: readonly OperationalPlanningExportCapacityRow[],
): void {
  const sheet = workbook.addWorksheet('Capacidade')
  CAPACITY_COLUMN_WIDTHS.forEach((width, idx) => {
    sheet.getColumn(idx + 1).width = width
  })

  sheet.mergeCells(CAPACITY_TITLE_ROW, 1, CAPACITY_TITLE_ROW, CAPACITY_COLUMN_COUNT)
  sheet.getCell(CAPACITY_TITLE_ROW, 1).value =
    `Capacidade — ${formatDateBrPt(excelDateFromIso(meta.weekStartDate))} a ${formatDateBrPt(excelDateFromIso(meta.weekEndDate))}`
  sheet.getRow(CAPACITY_TITLE_ROW).font = { bold: true, size: 14 }

  writeHeaderRow(sheet, CAPACITY_HEADER_ROW, CAPACITY_HEADERS)

  let rowNumber = CAPACITY_HEADER_ROW + 1
  for (const row of rows) {
    const excelRow = sheet.getRow(rowNumber)
    setDateCell(excelRow.getCell(1), row.date)
    excelRow.getCell(2).value = weekdayLabelPt(row.date)
    setTextCell(excelRow.getCell(3), row.collaboratorName)
    setDurationCell(excelRow.getCell(4), row.capacityMinutes)
    setDurationCell(excelRow.getCell(5), row.plannedMinutes)
    if (row.balanceMinutes == null) {
      excelRow.getCell(6).value = null
    } else {
      // Saldo (min) = (Capacidade disponível - Tempo planejado) * 1440 — fórmula auditável no Excel.
      excelRow.getCell(6).value = {
        formula: `(D${rowNumber}-E${rowNumber})*1440`,
        result: row.balanceMinutes,
      }
      excelRow.getCell(6).numFmt = '0" min";-0" min"'
    }
    if (row.occupancyRatio == null) {
      excelRow.getCell(7).value = null
    } else {
      // Ocupação = Tempo planejado / Capacidade disponível — fórmula auditável no Excel.
      excelRow.getCell(7).value = {
        formula: `E${rowNumber}/D${rowNumber}`,
        result: row.occupancyRatio,
      }
      excelRow.getCell(7).numFmt = '0.0%'
    }
    setTextCell(excelRow.getCell(8), row.statusLabel)

    for (let col = 1; col <= CAPACITY_COLUMN_COUNT; col += 1) {
      applyTableCellStyle(excelRow.getCell(col))
    }

    if (row.statusLabel === 'Sobrecarregado' || row.statusLabel === 'No limite') {
      const fill = row.statusLabel === 'Sobrecarregado' ? FILL_RED : FILL_AMBER
      const font = row.statusLabel === 'Sobrecarregado' ? FONT_RED : FONT_AMBER
      for (let col = 1; col <= CAPACITY_COLUMN_COUNT; col += 1) {
        const cell = excelRow.getCell(col)
        cell.fill = fill
        cell.font = { ...(cell.font ?? {}), ...font }
      }
    }

    rowNumber += 1
  }

  sheet.autoFilter = {
    from: { row: CAPACITY_HEADER_ROW, column: 1 },
    to: { row: CAPACITY_HEADER_ROW, column: CAPACITY_COLUMN_COUNT },
  }
  sheet.views = [{ state: 'frozen', ySplit: CAPACITY_HEADER_ROW }]
  sheet.pageSetup = {
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
  }
}

export async function buildOperationalPlanningExportWorkbookBuffer(input: {
  meta: OperationalPlanningExportMeta
  planningRows: OperationalPlanningExportPlanningRow[]
  capacityRows: OperationalPlanningExportCapacityRow[]
}): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  addPlanningSheet(workbook, input.meta, input.planningRows)
  addCapacitySheet(workbook, input.meta, input.capacityRows)
  const raw = await workbook.xlsx.writeBuffer()
  return Buffer.isBuffer(raw) ? raw : Buffer.from(raw)
}
