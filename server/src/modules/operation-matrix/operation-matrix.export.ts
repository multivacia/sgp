import ExcelJS from 'exceljs'
import type { MatrixNodeTreeApi } from './operation-matrix.dto.js'

export type MatrixStructureExportRow = {
  taskOrder: number
  taskName: string
  sectorOrder: number
  sectorName: string
  activityOrder: number
  activityName: string
  plannedMinutes: number | null
  plannedFormatted: string
  teamName: string
  status: string
}

export type MatrixOperationalExportRow = {
  path: string
  activityName: string
  plannedMinutes: number | null
  plannedFormatted: string
  teamName: string
  status: string
}

export type MatrixValidationExportRow = {
  taskOrder: number
  seq: string
  taskName: string
  sectorName: string
  activityName: string
  plannedTime: string
  teamName: string
}

const VALIDATION_MANUAL_CHECKBOX = '☐'
const VALIDATION_HEADER_ROW = 5
const VALIDATION_COLUMN_COUNT = 9
const STRUCTURE_COLUMN_COUNT = 10
const TASK_SEPARATOR_FILL = 'FFE3F2FD'

const TABLE_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin' },
  left: { style: 'thin' },
  bottom: { style: 'thin' },
  right: { style: 'thin' },
}

export function formatPlannedMinutesLabel(
  minutes: number | null | undefined,
): string {
  if (minutes == null || Number.isNaN(minutes)) return '—'
  const min = Math.max(0, Math.floor(minutes))
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h} h ${m} min` : `${h} h`
}

export function matrixActiveStatusLabel(isActive: boolean): string {
  return isActive ? 'Ativo' : 'Inativo'
}

export function displayMatrixOrder(orderIndex: number): number {
  return orderIndex + 1
}

export function buildValidationSequence(
  taskOrderIndex: number,
  sectorOrderIndex: number,
  activityOrderIndex: number,
): string {
  return `${displayMatrixOrder(taskOrderIndex)}.${displayMatrixOrder(sectorOrderIndex)}.${displayMatrixOrder(activityOrderIndex)}`
}

export function sanitizeMatrixExportFilenamePart(value: string): string {
  const trimmed = value.trim()
  const sanitized = trimmed
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
  return sanitized || 'matriz'
}

export function formatMatrixExportDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function buildMatrixExportFilename(
  id: string,
  code: string | null,
  name: string,
  exportedAt = new Date(),
): string {
  const primary = name.trim() || code?.trim() || id.trim()
  const part = sanitizeMatrixExportFilenamePart(primary)
  const datePart = formatMatrixExportDate(exportedAt)
  return `matriz-${part}-${datePart}.xlsx`
}

export function buildTaskSeparatorLabel(
  taskOrderIndex: number,
  taskName: string,
): string {
  return `TAREFA ${displayMatrixOrder(taskOrderIndex)} — ${taskName}`
}

function resolveTeamName(
  teamIds: readonly string[],
  teamNamesById: ReadonlyMap<string, string>,
): string {
  for (const id of teamIds) {
    const name = teamNamesById.get(id)
    if (name) return name
  }
  return '—'
}

export function flattenMatrixTreeForExport(
  tree: MatrixNodeTreeApi,
  teamNamesById: ReadonlyMap<string, string>,
): {
  structureRows: MatrixStructureExportRow[]
  operationalRows: MatrixOperationalExportRow[]
  validationRows: MatrixValidationExportRow[]
} {
  const structureRows: MatrixStructureExportRow[] = []
  const operationalRows: MatrixOperationalExportRow[] = []
  const validationRows: MatrixValidationExportRow[] = []

  const tasks = [...tree.children]
    .filter((node) => node.node_type === 'TASK')
    .sort(
      (a, b) =>
        a.order_index - b.order_index || a.name.localeCompare(b.name, 'pt-BR'),
    )

  for (const task of tasks) {
    const sectors = [...task.children]
      .filter((node) => node.node_type === 'SECTOR')
      .sort(
        (a, b) =>
          a.order_index - b.order_index || a.name.localeCompare(b.name, 'pt-BR'),
      )

    for (const sector of sectors) {
      const activities = [...sector.children]
        .filter((node) => node.node_type === 'ACTIVITY')
        .sort(
          (a, b) =>
            a.order_index - b.order_index ||
            a.name.localeCompare(b.name, 'pt-BR'),
        )

      for (const activity of activities) {
        const plannedMinutes = activity.planned_minutes
        const plannedFormatted = formatPlannedMinutesLabel(plannedMinutes)
        const teamName = resolveTeamName(activity.team_ids, teamNamesById)
        const status = matrixActiveStatusLabel(activity.is_active)

        structureRows.push({
          taskOrder: task.order_index,
          taskName: task.name,
          sectorOrder: sector.order_index,
          sectorName: sector.name,
          activityOrder: activity.order_index,
          activityName: activity.name,
          plannedMinutes,
          plannedFormatted,
          teamName,
          status,
        })

        operationalRows.push({
          path: `${task.name} > ${sector.name} > ${activity.name}`,
          activityName: activity.name,
          plannedMinutes,
          plannedFormatted,
          teamName,
          status,
        })

        validationRows.push({
          taskOrder: task.order_index,
          seq: buildValidationSequence(
            task.order_index,
            sector.order_index,
            activity.order_index,
          ),
          taskName: task.name,
          sectorName: sector.name,
          activityName: activity.name,
          plannedTime: plannedFormatted,
          teamName,
        })
      }
    }
  }

  return { structureRows, operationalRows, validationRows }
}

function formatExportTimestamp(date: Date): string {
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function applyPrintableTableCellStyle(cell: ExcelJS.Cell, wrapText = true): void {
  cell.alignment = { wrapText, vertical: 'top' }
  cell.border = TABLE_BORDER
  if (!cell.font) {
    cell.font = { size: 11 }
  } else if (!cell.font.size) {
    cell.font = { ...cell.font, size: 11 }
  }
}

function applyTaskSeparatorRowStyle(
  sheet: ExcelJS.Worksheet,
  rowNumber: number,
  columnCount: number,
): void {
  sheet.mergeCells(rowNumber, 1, rowNumber, columnCount)
  for (let col = 1; col <= columnCount; col += 1) {
    const cell = sheet.getRow(rowNumber).getCell(col)
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: TASK_SEPARATOR_FILL },
    }
    cell.border = TABLE_BORDER
    cell.alignment = { vertical: 'middle', wrapText: true }
    cell.font = { bold: true, size: 11 }
  }
}

function writeTaskSeparatorRow(
  sheet: ExcelJS.Worksheet,
  rowNumber: number,
  taskOrderIndex: number,
  taskName: string,
  columnCount: number,
): void {
  sheet.getRow(rowNumber).getCell(1).value = buildTaskSeparatorLabel(
    taskOrderIndex,
    taskName,
  )
  applyTaskSeparatorRowStyle(sheet, rowNumber, columnCount)
}

function addSummarySheet(
  workbook: ExcelJS.Workbook,
  tree: MatrixNodeTreeApi,
  exportedAt: Date,
): void {
  const sheet = workbook.addWorksheet('Resumo')
  sheet.columns = [
    { header: 'Campo', key: 'field', width: 28 },
    { header: 'Valor', key: 'value', width: 64 },
  ]
  sheet.addRows([
    { field: 'Nome da Matriz', value: tree.name },
    { field: 'Código', value: tree.code ?? '—' },
    { field: 'Descrição', value: tree.description ?? '—' },
    { field: 'Status', value: matrixActiveStatusLabel(tree.is_active) },
    { field: 'Data/hora da exportação', value: formatExportTimestamp(exportedAt) },
  ])
  sheet.getRow(1).font = { bold: true }
}

function addStructureSheet(
  workbook: ExcelJS.Workbook,
  rows: readonly MatrixStructureExportRow[],
): void {
  const sheet = workbook.addWorksheet('Estrutura')
  sheet.columns = [
    { header: 'Ordem Tarefa', key: 'taskOrder', width: 14 },
    { header: 'Tarefa', key: 'taskName', width: 28 },
    { header: 'Ordem Setor', key: 'sectorOrder', width: 14 },
    { header: 'Setor', key: 'sectorName', width: 28 },
    { header: 'Ordem Atividade', key: 'activityOrder', width: 16 },
    { header: 'Atividade', key: 'activityName', width: 32 },
    { header: 'Tempo planejado em minutos', key: 'plannedMinutes', width: 24 },
    { header: 'Tempo planejado formatado', key: 'plannedFormatted', width: 24 },
    { header: 'Equipe', key: 'teamName', width: 24 },
    { header: 'Status', key: 'status', width: 12 },
  ]
  sheet.getRow(1).font = { bold: true }

  let rowNumber = 2
  let lastTaskKey: string | null = null
  for (const row of rows) {
    const taskKey = `${row.taskOrder}:${row.taskName}`
    if (taskKey !== lastTaskKey) {
      lastTaskKey = taskKey
      writeTaskSeparatorRow(
        sheet,
        rowNumber,
        row.taskOrder,
        row.taskName,
        STRUCTURE_COLUMN_COUNT,
      )
      rowNumber += 1
    }

    const dataRow = sheet.getRow(rowNumber)
    dataRow.getCell(1).value = displayMatrixOrder(row.taskOrder)
    dataRow.getCell(2).value = row.taskName
    dataRow.getCell(3).value = displayMatrixOrder(row.sectorOrder)
    dataRow.getCell(4).value = row.sectorName
    dataRow.getCell(5).value = displayMatrixOrder(row.activityOrder)
    dataRow.getCell(6).value = row.activityName
    dataRow.getCell(7).value = row.plannedMinutes
    dataRow.getCell(8).value = row.plannedFormatted
    dataRow.getCell(9).value = row.teamName
    dataRow.getCell(10).value = row.status
    for (let col = 1; col <= STRUCTURE_COLUMN_COUNT; col += 1) {
      applyPrintableTableCellStyle(dataRow.getCell(col))
    }
    rowNumber += 1
  }
}

function addOperationalSheet(
  workbook: ExcelJS.Workbook,
  rows: readonly MatrixOperationalExportRow[],
): void {
  const sheet = workbook.addWorksheet('Leitura Operacional')
  sheet.columns = [
    { header: 'Caminho completo', key: 'path', width: 48 },
    { header: 'Atividade', key: 'activityName', width: 32 },
    { header: 'Tempo planejado em minutos', key: 'plannedMinutes', width: 24 },
    { header: 'Tempo planejado formatado', key: 'plannedFormatted', width: 24 },
    { header: 'Equipe', key: 'teamName', width: 24 },
    { header: 'Status', key: 'status', width: 12 },
  ]
  sheet.addRows([...rows])
  sheet.getRow(1).font = { bold: true }
}

function addValidationSheet(
  workbook: ExcelJS.Workbook,
  tree: MatrixNodeTreeApi,
  rows: readonly MatrixValidationExportRow[],
  exportedAt: Date,
): void {
  const sheet = workbook.addWorksheet('Validação')
  sheet.columns = [
    { width: 10 },
    { width: 24 },
    { width: 24 },
    { width: 36 },
    { width: 18 },
    { width: 20 },
    { width: 14 },
    { width: 18 },
    { width: 40 },
  ]

  sheet.getCell('A1').value = `Nome da Matriz: ${tree.name}`
  sheet.mergeCells(1, 1, 1, VALIDATION_COLUMN_COUNT)
  sheet.getCell('A2').value =
    `Data/hora da exportação: ${formatExportTimestamp(exportedAt)}`
  sheet.mergeCells(2, 1, 2, VALIDATION_COLUMN_COUNT)
  sheet.getCell('A3').value =
    'Planilha para validação manual da estrutura inicial da Matriz.'
  sheet.mergeCells(3, 1, 3, VALIDATION_COLUMN_COUNT)

  sheet.getRow(1).font = { bold: true, size: 11 }
  sheet.getRow(2).font = { size: 11 }
  sheet.getRow(3).font = { size: 11 }
  sheet.getRow(1).alignment = { wrapText: true, vertical: 'top' }
  sheet.getRow(2).alignment = { wrapText: true, vertical: 'top' }
  sheet.getRow(3).alignment = { wrapText: true, vertical: 'top' }

  const headerRow = sheet.getRow(VALIDATION_HEADER_ROW)
  const headers = [
    'Seq.',
    'Tarefa',
    'Setor',
    'Atividade',
    'Tempo planejado',
    'Equipe',
    'Validado?',
    'Ajuste necessário?',
    'Observações',
  ]
  headers.forEach((label, index) => {
    const cell = headerRow.getCell(index + 1)
    cell.value = label
    applyPrintableTableCellStyle(cell)
  })
  headerRow.font = { bold: true, size: 11 }

  let rowNumber = VALIDATION_HEADER_ROW + 1
  let lastTaskKey: string | null = null
  for (const row of rows) {
    const taskKey = `${row.taskOrder}:${row.taskName}`
    if (taskKey !== lastTaskKey) {
      lastTaskKey = taskKey
      writeTaskSeparatorRow(
        sheet,
        rowNumber,
        row.taskOrder,
        row.taskName,
        VALIDATION_COLUMN_COUNT,
      )
      rowNumber += 1
    }

    const excelRow = sheet.getRow(rowNumber)
    const values = [
      row.seq,
      row.taskName,
      row.sectorName,
      row.activityName,
      row.plannedTime,
      row.teamName,
      VALIDATION_MANUAL_CHECKBOX,
      VALIDATION_MANUAL_CHECKBOX,
      '',
    ]
    values.forEach((value, colIndex) => {
      const cell = excelRow.getCell(colIndex + 1)
      cell.value = value
      applyPrintableTableCellStyle(cell, colIndex + 1 !== 1)
    })
    rowNumber += 1
  }

  sheet.pageSetup = {
    paperSize: 9,
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    printTitlesRow: `${VALIDATION_HEADER_ROW}:${VALIDATION_HEADER_ROW}`,
  }
}

export async function buildMatrixExportWorkbookBuffer(
  tree: MatrixNodeTreeApi,
  teamNamesById: ReadonlyMap<string, string>,
  exportedAt = new Date(),
): Promise<Buffer> {
  const { structureRows, operationalRows, validationRows } =
    flattenMatrixTreeForExport(tree, teamNamesById)
  const workbook = new ExcelJS.Workbook()
  addSummarySheet(workbook, tree, exportedAt)
  addStructureSheet(workbook, structureRows)
  addOperationalSheet(workbook, operationalRows)
  addValidationSheet(workbook, tree, validationRows, exportedAt)
  const raw = await workbook.xlsx.writeBuffer()
  return Buffer.isBuffer(raw) ? raw : Buffer.from(raw)
}
