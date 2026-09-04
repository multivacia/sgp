/**
 * Export Excel "Visão semanal" — matriz de atividades planejadas (colaborador × dia) do
 * planejamento semanal. Módulo puro — sem acesso a banco.
 *
 * Isolamento deliberado da primeira exportação (`operational-planning.export.ts`): nenhum
 * import cruzado com aquele arquivo. Helpers pequenos e puros (sanitização de fórmula, parse
 * de data local, formatação de timestamp/valores) são duplicados aqui propositalmente — ver
 * `docs/ai` / spec da tarefa: preferir isolamento a acoplamento.
 */
import ExcelJS from 'exceljs'

export type OperationalPlanningWeeklyViewExportSituation =
  | 'PUBLICADO'
  | 'RASCUNHO'
  | 'REVISAO_NAO_PUBLICADA'

export type OperationalPlanningWeeklyViewExportMeta = {
  weekStartDate: string
  weekEndDate: string
  situation: OperationalPlanningWeeklyViewExportSituation
  generatedAt: Date
  totalActivities: number
  totalPlannedMinutes: number
  collaboratorsWithActivityCount: number
}

/** Uma linha física = um item do plano semanal (nunca agrupado/concatenado em uma célula). */
export type OperationalPlanningWeeklyViewExportRow = {
  id: string
  collaboratorId: string | null
  collaboratorName: string | null
  plannedDate: string
  plannedOrder: number
  plannedMinutes: number | null
  /** Nome/descrição da esteira (`conveyors.name`). */
  conveyorTitle: string | null
  activityTitle: string
  notes: string | null
}

const SHEET_NAME = 'Visão semanal'
const TITLE_TEXT = 'SGP+ — Planejamento semanal'

const TITLE_ROW = 1
const PERIOD_ROW = 2
const SITUATION_ROW = 3
const GENERATED_ROW = 4
const TOTALS_ROW = 5
const HEADER_ROW = 7
const COLUMN_COUNT = 7
const FIRST_DATA_ROW = HEADER_ROW + 1

const WEEKDAY_LABELS = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
] as const

const COLUMN_WIDTHS = [26, 30, 30, 30, 30, 30, 34]

const FILL_HEADER: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF1F2933' },
}
const FONT_HEADER: Partial<ExcelJS.Font> = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }

const FILL_GREEN: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFD9EAD3' },
}
const FONT_GREEN: Partial<ExcelJS.Font> = { color: { argb: 'FF274E13' } }

const FILL_AMBER: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFFFF2CC' },
}
const FONT_AMBER: Partial<ExcelJS.Font> = { color: { argb: 'FF7F6000' } }

/** Preenchimento discreto por BLOCO de colaborador (não por linha individual). */
const FILL_BLOCK_ALT: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFF3F4F6' },
}

const BORDER_THIN: Partial<ExcelJS.Borders> = {
  top: { style: 'thin' },
  left: { style: 'thin' },
  bottom: { style: 'thin' },
  right: { style: 'thin' },
}

/** Borda superior mais forte ao iniciar um novo bloco de colaborador. */
const BORDER_BLOCK_START: Partial<ExcelJS.Borders> = {
  top: { style: 'medium' },
  left: { style: 'thin' },
  bottom: { style: 'thin' },
  right: { style: 'thin' },
}

/** Parse `YYYY-MM-DD` em componentes locais — nunca `new Date('YYYY-MM-DD')` (evita deslocamento de fuso). */
export function excelDateFromIso(dateIso: string): Date {
  const [y, m, d] = dateIso.split('-').map(Number)
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1)
}

function addLocalDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

function isoFromLocalDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Datas civis de segunda a sexta a partir de `weekStartDate` — sem deslocamento de fuso. */
export function weeklyViewWeekdayDates(weekStartDate: string): string[] {
  const monday = excelDateFromIso(weekStartDate)
  return [0, 1, 2, 3, 4].map((i) => isoFromLocalDate(addLocalDays(monday, i)))
}

/** Protege células de texto livre contra reinterpretação como fórmula por leitores externos. */
export function sanitizeExcelText(value: string): string {
  if (/^[=+\-@]/.test(value)) return `'${value}`
  return value
}

/**
 * Texto da atividade na célula do dia: `descrição da esteira — atividade`.
 * Sem descrição (nula/vazia/só espaços): somente a atividade. Sem separador solto.
 */
export function formatWeeklyViewActivityCellLabel(
  conveyorDescription: string | null | undefined,
  activityTitle: string | null | undefined,
): string {
  const description = (conveyorDescription ?? '').trim()
  const activity = (activityTitle ?? '').trim()
  if (description && activity) return `${description} — ${activity}`
  if (activity) return activity
  return description
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

function formatSituationLabel(situation: OperationalPlanningWeeklyViewExportSituation): string {
  if (situation === 'PUBLICADO') return 'PUBLICADO'
  if (situation === 'RASCUNHO') return 'RASCUNHO'
  return 'REVISÃO NÃO PUBLICADA'
}

/**
 * `hh:mm` a partir de minutos totais — aceita > 24h (ex.: 1500 → "25:00"). Minutos nulo,
 * inválido (NaN/Infinity) ou negativo é tratado defensivamente como 0 (nunca gera NaN/texto
 * quebrado).
 */
export function formatDurationHhMm(minutes: number | null | undefined): string {
  const min =
    typeof minutes === 'number' && Number.isFinite(minutes) && minutes > 0
      ? Math.floor(minutes)
      : 0
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${h}:${String(m).padStart(2, '0')}`
}

export function buildOperationalPlanningWeeklyViewExportFilename(
  weekStartDate: string,
  weekEndDate: string,
  situation: OperationalPlanningWeeklyViewExportSituation,
): string {
  const slug =
    situation === 'PUBLICADO'
      ? 'publicado'
      : situation === 'RASCUNHO'
        ? 'rascunho'
        : 'revisao-nao-publicada'
  return `planejamento-semanal-visao-${weekStartDate}-a-${weekEndDate}-${slug}.xlsx`
}

function buildHeaders(weekStartDate: string): string[] {
  const weekdayIsoDates = weeklyViewWeekdayDates(weekStartDate)
  const dayHeaders = WEEKDAY_LABELS.map(
    (label, idx) => `${label}\n${formatDateBrPt(excelDateFromIso(weekdayIsoDates[idx]!))}`,
  )
  return ['Colaborador', ...dayHeaders, 'Observações']
}

function resolveCollaboratorDisplayName(row: OperationalPlanningWeeklyViewExportRow): string {
  if (row.collaboratorId == null) return 'Não atribuído'
  return row.collaboratorName?.trim() ? row.collaboratorName : '—'
}

function resolveNotesText(row: OperationalPlanningWeeklyViewExportRow): string {
  return row.notes?.trim() ? row.notes : '—'
}

/**
 * Ordenação de negócio: colaborador (nominal, pt-BR) → data planejada → `plannedOrder` → id
 * (desempate técnico, não exibido). Itens sem colaborador (`collaboratorId === null`) sempre
 * ao final, independentemente do texto de exibição ("Não atribuído").
 */
export function sortOperationalPlanningWeeklyViewRows(
  rows: readonly OperationalPlanningWeeklyViewExportRow[],
): OperationalPlanningWeeklyViewExportRow[] {
  return [...rows].sort((a, b) => {
    const aUnassigned = a.collaboratorId == null
    const bUnassigned = b.collaboratorId == null
    if (aUnassigned !== bUnassigned) return aUnassigned ? 1 : -1
    if (!aUnassigned && !bUnassigned && a.collaboratorId !== b.collaboratorId) {
      const nameCmp = (a.collaboratorName ?? '').localeCompare(b.collaboratorName ?? '', 'pt-BR')
      if (nameCmp !== 0) return nameCmp
    }
    const dateCmp = a.plannedDate.localeCompare(b.plannedDate)
    if (dateCmp !== 0) return dateCmp
    const orderCmp = a.plannedOrder - b.plannedOrder
    if (orderCmp !== 0) return orderCmp
    return a.id.localeCompare(b.id)
  })
}

/** Índice do dia (0=segunda … 4=sexta) da semana para `plannedDate`, ou `null` se fora da semana. */
function dayIndexInWeek(plannedDateIso: string, weekStartDateIso: string): number | null {
  const diffDays = Math.round(
    (excelDateFromIso(plannedDateIso).getTime() - excelDateFromIso(weekStartDateIso).getTime()) /
      86_400_000,
  )
  return diffDays >= 0 && diffDays <= 4 ? diffDays : null
}

export async function buildOperationalPlanningWeeklyViewExportWorkbookBuffer(input: {
  meta: OperationalPlanningWeeklyViewExportMeta
  rows: readonly OperationalPlanningWeeklyViewExportRow[]
}): Promise<Buffer> {
  const { meta } = input
  const sortedRows = sortOperationalPlanningWeeklyViewRows(input.rows)

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet(SHEET_NAME)

  COLUMN_WIDTHS.forEach((width, idx) => {
    sheet.getColumn(idx + 1).width = width
  })

  sheet.mergeCells(TITLE_ROW, 1, TITLE_ROW, COLUMN_COUNT)
  sheet.getCell(TITLE_ROW, 1).value = TITLE_TEXT
  sheet.getRow(TITLE_ROW).font = { bold: true, size: 14 }

  sheet.mergeCells(PERIOD_ROW, 1, PERIOD_ROW, COLUMN_COUNT)
  sheet.getCell(PERIOD_ROW, 1).value =
    `Período: ${formatDateBrPt(excelDateFromIso(meta.weekStartDate))} a ${formatDateBrPt(excelDateFromIso(meta.weekEndDate))}`
  sheet.getRow(PERIOD_ROW).font = { bold: true, size: 11 }

  sheet.mergeCells(SITUATION_ROW, 1, SITUATION_ROW, COLUMN_COUNT)
  const situationCell = sheet.getCell(SITUATION_ROW, 1)
  situationCell.value = `Situação: ${formatSituationLabel(meta.situation)}`
  situationCell.font = { bold: true, size: 11 }
  if (meta.situation === 'PUBLICADO') {
    situationCell.fill = FILL_GREEN
    situationCell.font = { ...situationCell.font, ...FONT_GREEN }
  } else if (meta.situation === 'REVISAO_NAO_PUBLICADA') {
    situationCell.fill = FILL_AMBER
    situationCell.font = { ...situationCell.font, ...FONT_AMBER }
  }

  sheet.mergeCells(GENERATED_ROW, 1, GENERATED_ROW, COLUMN_COUNT)
  sheet.getCell(GENERATED_ROW, 1).value = `Gerado em: ${formatTimestampBrPt(meta.generatedAt)}`

  sheet.mergeCells(TOTALS_ROW, 1, TOTALS_ROW, COLUMN_COUNT)
  sheet.getCell(TOTALS_ROW, 1).value =
    `Total de atividades: ${meta.totalActivities}   |   Tempo planejado total: ${formatMinutesLabel(meta.totalPlannedMinutes)}   |   Colaboradores com atividade: ${meta.collaboratorsWithActivityCount}`

  const headers = buildHeaders(meta.weekStartDate)
  const headerRow = sheet.getRow(HEADER_ROW)
  headers.forEach((label, idx) => {
    const cell = headerRow.getCell(idx + 1)
    cell.value = label
    cell.fill = FILL_HEADER
    cell.font = FONT_HEADER
    cell.border = BORDER_THIN
    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true }
  })
  headerRow.height = 30

  let rowNumber = FIRST_DATA_ROW
  let previousGroupKey: string | null = null
  let blockIndex = -1
  for (const row of sortedRows) {
    const groupKey = row.collaboratorId ?? '__unassigned__'
    const isNewBlock = groupKey !== previousGroupKey
    if (isNewBlock) blockIndex += 1
    previousGroupKey = groupKey

    const excelRow = sheet.getRow(rowNumber)
    excelRow.getCell(1).value = sanitizeExcelText(resolveCollaboratorDisplayName(row))

    const dayIndex = dayIndexInWeek(row.plannedDate, meta.weekStartDate)
    if (dayIndex != null) {
      const activityLabel = formatWeeklyViewActivityCellLabel(
        row.conveyorTitle,
        row.activityTitle,
      )
      const content = sanitizeExcelText(
        `${row.plannedOrder + 1}º ${activityLabel} — ${formatDurationHhMm(row.plannedMinutes)}`,
      )
      excelRow.getCell(2 + dayIndex).value = content
    }

    excelRow.getCell(COLUMN_COUNT).value = sanitizeExcelText(resolveNotesText(row))

    const altShade = blockIndex % 2 === 1
    for (let col = 1; col <= COLUMN_COUNT; col += 1) {
      const cell = excelRow.getCell(col)
      cell.border = isNewBlock ? BORDER_BLOCK_START : BORDER_THIN
      cell.alignment = { vertical: 'top', wrapText: true }
      if (!cell.font) cell.font = { size: 11 }
      if (altShade) cell.fill = FILL_BLOCK_ALT
    }

    rowNumber += 1
  }

  sheet.autoFilter = {
    from: { row: HEADER_ROW, column: 1 },
    to: { row: HEADER_ROW, column: COLUMN_COUNT },
  }
  sheet.views = [{ state: 'frozen', ySplit: HEADER_ROW }]
  sheet.pageSetup = {
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
  }

  const raw = await workbook.xlsx.writeBuffer()
  return Buffer.isBuffer(raw) ? raw : Buffer.from(raw)
}
