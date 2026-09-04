/**
 * Export Excel "Visão semanal" — matriz de atividades planejadas (colaborador × dia) do
 * planejamento semanal. Módulo puro — sem acesso a banco.
 *
 * Isolamento deliberado da primeira exportação (`operational-planning.export.ts`): nenhum
 * import cruzado com aquele arquivo. Helpers pequenos e puros (sanitização de fórmula, parse
 * de data local, formatação de timestamp/valores) são duplicados aqui propositalmente — ver
 * `docs/ai` / spec da tarefa: preferir isolamento a acoplamento.
 *
 * Modelo estrutural: **grade por posição**.
 * Quantidade de linhas do colaborador = maior quantidade de atividades em um único dia.
 * Cada célula de dia contém no máximo uma atividade; dias sem item naquela posição ficam vazios.
 * Nome do colaborador mesclado verticalmente no bloco.
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

/** Item do plano semanal. Na planilha, o colaborador ocupa um bloco de linhas alinhadas por posição. */
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
  /** Total apontado do STEP (`SUM(conveyor_time_entries.minutes)` com `deleted_at IS NULL`). */
  realizedMinutes: number
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

/** Rótulos curtos para observações por posição. */
const WEEKDAY_SHORT_LABELS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'] as const

const COLUMN_WIDTHS = [26, 32, 32, 32, 32, 32, 36]

/** Altura aproximada por linha de texto (fonte 11pt) — ExcelJS não autoajusta wrapText. */
const DATA_ROW_LINE_HEIGHT_PT = 15
const DATA_ROW_HEIGHT_PADDING_PT = 4
const DATA_CELL_FONT_SIZE = 11

/** Limite nativo do Excel para altura de linha (pontos). Texto nunca é truncado. */
export const EXCEL_MAX_ROW_HEIGHT_PT = 409

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

/** Preenchimento discreto por colaborador (bloco inteiro). */
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
 * Texto legado (esteira — atividade). Preferir `formatWeeklyViewActivityCellContent`
 * para a célula da Visão Semanal.
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

/**
 * Apresentação textual do tempo planejado a partir do mesmo valor em minutos usado em HH:mm.
 * Exemplos: 0→`0 min`, 30→`30 min`, 60→`1h`, 65→`1h05 min`, 90→`1h30 min`.
 */
export function formatWeeklyViewPlannedDurationLabel(
  minutes: number | null | undefined,
): string {
  const min =
    typeof minutes === 'number' && Number.isFinite(minutes) && minutes > 0
      ? Math.floor(minutes)
      : 0
  if (min === 0) return '0 min'
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h}h`
  return `${h}h${String(m).padStart(2, '0')} min`
}

/**
 * Rótulo do tempo apontado: valores positivos usam o mesmo formatador do planejado;
 * zero/nulo/inválido → `---` (nunca `0 min`).
 */
export function formatWeeklyViewApontadoDurationLabel(
  minutes: number | null | undefined,
): string {
  const min =
    typeof minutes === 'number' && Number.isFinite(minutes) && minutes > 0
      ? Math.floor(minutes)
      : 0
  if (min === 0) return '---'
  return formatWeeklyViewPlannedDurationLabel(min)
}

/**
 * Conteúdo multilinha de **uma** atividade na célula do dia.
 *
 * Com esteira:
 * `1º Nome da esteira\nNome da atividade\nTempo planejado: 1h30 min\nTempo apontado: 45 min`
 *
 * Sem esteira / sem apontamento:
 * `1º Nome da atividade\nTempo planejado: 1h30 min\nTempo apontado: ---`
 */
export function formatWeeklyViewActivityCellContent(
  plannedOrder: number,
  conveyorTitle: string | null | undefined,
  activityTitle: string | null | undefined,
  plannedMinutes: number | null | undefined,
  realizedMinutes: number | null | undefined = 0,
): string {
  const orderPrefix = `${plannedOrder + 1}º`
  const description = (conveyorTitle ?? '').trim()
  const activity = (activityTitle ?? '').trim()
  const plannedLine = `Tempo planejado: ${formatWeeklyViewPlannedDurationLabel(plannedMinutes)}`
  const apontadoLine = `Tempo apontado: ${formatWeeklyViewApontadoDurationLabel(realizedMinutes)}`

  if (description && activity) {
    return `${orderPrefix} ${description}\n${activity}\n${plannedLine}\n${apontadoLine}`
  }
  const title = activity || description
  if (title) {
    return `${orderPrefix} ${title}\n${plannedLine}\n${apontadoLine}`
  }
  return `${orderPrefix}\n${plannedLine}\n${apontadoLine}`
}

/**
 * Agrupa itens já ordenados por `collaboratorId` (chave consecutiva), preservando a ordem.
 * Itens sem colaborador usam a chave `__unassigned__`.
 */
export function groupWeeklyViewRowsByCollaborator(
  sortedRows: readonly OperationalPlanningWeeklyViewExportRow[],
): OperationalPlanningWeeklyViewExportRow[][] {
  const groups: OperationalPlanningWeeklyViewExportRow[][] = []
  let currentKey: string | null = null
  let current: OperationalPlanningWeeklyViewExportRow[] = []

  for (const row of sortedRows) {
    const key = row.collaboratorId ?? '__unassigned__'
    if (currentKey === null || key !== currentKey) {
      if (current.length > 0) groups.push(current)
      current = [row]
      currentKey = key
    } else {
      current.push(row)
    }
  }
  if (current.length > 0) groups.push(current)
  return groups
}

/** Índice do dia (0=segunda … 4=sexta) da semana para `plannedDate`, ou `null` se fora da semana. */
function dayIndexInWeek(plannedDateIso: string, weekStartDateIso: string): number | null {
  const diffDays = Math.round(
    (excelDateFromIso(plannedDateIso).getTime() - excelDateFromIso(weekStartDateIso).getTime()) /
      86_400_000,
  )
  return diffDays >= 0 && diffDays <= 4 ? diffDays : null
}

/**
 * Separa o grupo do colaborador em cinco listas (seg–sex), preservando a ordem já ordenada.
 */
export function splitWeeklyViewGroupByWeekday(
  group: readonly OperationalPlanningWeeklyViewExportRow[],
  weekStartDate: string,
): OperationalPlanningWeeklyViewExportRow[][] {
  const days: OperationalPlanningWeeklyViewExportRow[][] = [[], [], [], [], []]
  for (const item of group) {
    const idx = dayIndexInWeek(item.plannedDate, weekStartDate)
    if (idx == null) continue
    days[idx]!.push(item)
  }
  return days
}

/** Quantidade de linhas físicas do bloco = máximo diário (0 se o grupo não tiver itens na semana). */
export function weeklyViewCollaboratorBlockRowCount(
  daysByWeekday: readonly OperationalPlanningWeeklyViewExportRow[][],
): number {
  return Math.max(0, ...daysByWeekday.map((day) => day.length))
}

/**
 * Observações das atividades presentes **nesta linha de posição** (até 5 dias).
 * Formato: `Segunda 1º — texto`. `—` se nenhuma observação preenchida.
 */
export function formatWeeklyViewPositionNotes(
  dayItemsByWeekday: readonly (OperationalPlanningWeeklyViewExportRow | null | undefined)[],
): string {
  const lines: string[] = []
  for (let dayIndex = 0; dayIndex < 5; dayIndex += 1) {
    const item = dayItemsByWeekday[dayIndex]
    if (!item) continue
    const note = item.notes?.trim()
    if (!note) continue
    lines.push(`${WEEKDAY_SHORT_LABELS[dayIndex]} ${item.plannedOrder + 1}º — ${note}`)
  }
  return lines.length > 0 ? lines.join('\n') : '—'
}

export function countCellTextLines(value: unknown): number {
  if (value == null || value === '') return 1
  return String(value).split('\n').length
}

/** Conta ocorrências de “Tempo planejado:” em uma célula (deve ser 0 ou 1). */
export function countTempoPlanejadoOccurrences(cellText: string): number {
  const matches = cellText.match(/Tempo planejado:/g)
  return matches?.length ?? 0
}

/** Conta blocos de atividade (`Nº `) em uma célula — na grade por posição deve ser 0 ou 1. */
export function countWeeklyViewActivityBlocksInCell(cellText: string): number {
  const matches = cellText.match(/(^|\n)\d+º /g)
  return matches?.length ?? 0
}

function applyDataRowHeightFromWrappedContent(excelRow: ExcelJS.Row): void {
  let maxLines = 1
  for (let col = 1; col <= COLUMN_COUNT; col += 1) {
    maxLines = Math.max(maxLines, countCellTextLines(excelRow.getCell(col).value))
  }
  const rawHeight = Math.max(
    DATA_ROW_LINE_HEIGHT_PT,
    maxLines * DATA_ROW_LINE_HEIGHT_PT + DATA_ROW_HEIGHT_PADDING_PT,
  )
  excelRow.height = Math.min(EXCEL_MAX_ROW_HEIGHT_PT, rawHeight)
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

/**
 * Ordenação de negócio: colaborador (nominal, pt-BR) → data planejada → `plannedOrder` → id
 * (desempate técnico, não exibido). Itens sem colaborador (`collaboratorId === null`) sempre
 * ao final. IDs distintos com o mesmo nome ficam em blocos consecutivos estáveis.
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
      return a.collaboratorId!.localeCompare(b.collaboratorId!)
    }
    const dateCmp = a.plannedDate.localeCompare(b.plannedDate)
    if (dateCmp !== 0) return dateCmp
    const orderCmp = a.plannedOrder - b.plannedOrder
    if (orderCmp !== 0) return orderCmp
    return a.id.localeCompare(b.id)
  })
}

function applyPositionRowStyle(
  excelRow: ExcelJS.Row,
  opts: { isFirstInBlock: boolean; altShade: boolean },
): void {
  const border = opts.isFirstInBlock ? BORDER_BLOCK_START : BORDER_THIN
  for (let col = 1; col <= COLUMN_COUNT; col += 1) {
    const cell = excelRow.getCell(col)
    cell.border = border
    cell.alignment =
      col === 1
        ? { vertical: 'middle', horizontal: 'left', wrapText: true }
        : { vertical: 'top', wrapText: true }
    cell.font = { size: DATA_CELL_FONT_SIZE }
    if (opts.altShade) cell.fill = FILL_BLOCK_ALT
  }
  applyDataRowHeightFromWrappedContent(excelRow)
}

export async function buildOperationalPlanningWeeklyViewExportWorkbookBuffer(input: {
  meta: OperationalPlanningWeeklyViewExportMeta
  rows: readonly OperationalPlanningWeeklyViewExportRow[]
}): Promise<Buffer> {
  const { meta } = input
  const sortedRows = sortOperationalPlanningWeeklyViewRows(input.rows)
  const collaboratorGroups = groupWeeklyViewRowsByCollaborator(sortedRows)

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
  collaboratorGroups.forEach((group, blockIndex) => {
    const daysByWeekday = splitWeeklyViewGroupByWeekday(group, meta.weekStartDate)
    const blockRowCount = weeklyViewCollaboratorBlockRowCount(daysByWeekday)
    if (blockRowCount === 0) return

    const firstRowNumber = rowNumber
    const lastRowNumber = rowNumber + blockRowCount - 1
    const altShade = blockIndex % 2 === 1
    const displayName = sanitizeExcelText(resolveCollaboratorDisplayName(group[0]!))

    for (let position = 0; position < blockRowCount; position += 1) {
      const excelRow = sheet.getRow(rowNumber)
      const dayItemsForRow: Array<OperationalPlanningWeeklyViewExportRow | null> = []

      if (position === 0) {
        excelRow.getCell(1).value = displayName
      }

      for (let dayIndex = 0; dayIndex < 5; dayIndex += 1) {
        const item = daysByWeekday[dayIndex]![position] ?? null
        dayItemsForRow.push(item)
        if (!item) continue
        excelRow.getCell(2 + dayIndex).value = sanitizeExcelText(
          formatWeeklyViewActivityCellContent(
            item.plannedOrder,
            item.conveyorTitle,
            item.activityTitle,
            item.plannedMinutes,
            item.realizedMinutes,
          ),
        )
      }

      excelRow.getCell(COLUMN_COUNT).value = sanitizeExcelText(
        formatWeeklyViewPositionNotes(dayItemsForRow),
      )

      applyPositionRowStyle(excelRow, {
        isFirstInBlock: position === 0,
        altShade,
      })
      rowNumber += 1
    }

    if (blockRowCount > 1) {
      sheet.mergeCells(firstRowNumber, 1, lastRowNumber, 1)
      const merged = sheet.getCell(firstRowNumber, 1)
      merged.value = displayName
      merged.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true }
      merged.font = { size: DATA_CELL_FONT_SIZE }
      merged.border = BORDER_BLOCK_START
      if (altShade) merged.fill = FILL_BLOCK_ALT
    }
  })

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
