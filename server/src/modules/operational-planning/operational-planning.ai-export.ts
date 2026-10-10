/**
 * Export Excel "Planejamento para IA" — Backlog, Planejado e Carga dos colaboradores no recorte
 * (semana ou período), com aba de instruções para uma IA de sugestão de planejamento.
 * Módulo puro — sem I/O. Reutiliza estilos/células do export semanal (`operational-planning.export.ts`).
 */
import ExcelJS from 'exceljs'
import {
  FILL_AMBER,
  FILL_GREEN,
  FILL_RED,
  FONT_AMBER,
  FONT_GREEN,
  FONT_RED,
  applyTableCellStyle,
  excelDateFromIso,
  formatDateBrPt,
  formatMinutesLabel,
  formatSituationLabel,
  formatTimestampBrPt,
  setDateCell,
  setDurationCell,
  setTextCell,
  weekdayLabelPt,
  writeHeaderRow,
  type OperationalPlanningExportSituation,
} from './operational-planning.export.js'

export type PlanningAiExportScope = 'SEMANA' | 'PERIODO'

export type PlanningAiExportMeta = {
  scope: PlanningAiExportScope
  from: string
  to: string
  generatedAt: Date
  weeks: Array<{
    weekStartDate: string
    weekEndDate: string
    situation: OperationalPlanningExportSituation | null
  }>
}

export type PlanningAiBacklogRow = {
  origin: 'Backlog' | 'Aguardando encaixe'
  activityNodeId: string
  conveyorId: string
  conveyorCode: string
  conveyorTitle: string
  clientName: string
  vehicle: string
  plate: string
  priority: string
  estimatedDeadline: string
  deadlineOverdue: 'Sim' | 'Não' | '—'
  taskTitle: string
  sectorTitle: string
  activityTitle: string
  plannedQuantity: number | null
  plannedMinutes: number | null
  realizedMinutes: number | null
  pendingMinutes: number | null
  responsibleCollaborators: string
  responsibleTeams: string
  outOfSequence: 'Sim' | 'Não' | '—'
  /** Para "Aguardando encaixe": data/colaborador sugeridos no plano da esteira. */
  suggestedDate: string | null
  suggestedAssignee: string
  situation: string
}

export type PlanningAiPlannedRow = {
  weekStartDate: string
  planSituation: OperationalPlanningExportSituation
  plannedDate: string
  workPlanItemId: string
  activityNodeId: string
  collaboratorId: string
  collaboratorName: string
  teamName: string
  conveyorCode: string
  conveyorTitle: string
  clientName: string
  priority: string
  estimatedDeadline: string
  taskTitle: string
  sectorTitle: string
  activityTitle: string
  plannedOrderDisplay: number
  plannedQuantity: number | null
  plannedMinutes: number | null
  activityStatusLabel: string
  notes: string
}

export type PlanningAiLoadRow = {
  collaboratorId: string
  collaboratorName: string
  teams: string
  workdays: number
  daysWithoutCapacity: number
  capacityMinutes: number | null
  plannedMinutes: number
  statusLabel: 'Capacidade não cadastrada' | 'Sobrecarregado' | 'No limite' | 'Disponível'
}

export type PlanningAiLoadDailyRow = {
  date: string
  collaboratorId: string
  collaboratorName: string
  capacityMinutes: number | null
  plannedMinutes: number
  statusLabel: PlanningAiLoadRow['statusLabel']
}

export const PLANNING_AI_SHEET_NAMES = {
  prompt: 'Prompt para IA',
  backlog: 'Backlog',
  planned: 'Planejado',
  load: 'Carga dos colaboradores',
  loadDaily: 'Carga por dia',
} as const

const BACKLOG_HEADERS = [
  'Origem',
  'ID atividade',
  'ID esteira',
  'Código/OS',
  'Esteira',
  'Cliente',
  'Veículo',
  'Placa',
  'Prioridade',
  'Prazo da esteira',
  'Prazo vencido',
  'Tarefa',
  'Setor',
  'Atividade',
  'Quantidade prevista',
  'Tempo previsto (h:mm)',
  'Tempo realizado (h:mm)',
  'Tempo pendente (h:mm)',
  'Colaboradores alocados',
  'Equipes alocadas',
  'Fora de sequência',
  'Data sugerida (plano da esteira)',
  'Responsável sugerido (plano da esteira)',
  'Situação da atividade',
] as const
const BACKLOG_WIDTHS = [18, 38, 38, 14, 26, 20, 18, 12, 11, 18, 10, 22, 20, 30, 11, 13, 13, 13, 28, 22, 11, 16, 26, 16]

const PLANNED_HEADERS = [
  'Semana (início)',
  'Situação do plano',
  'Data',
  'Dia da semana',
  'ID item do plano',
  'ID atividade',
  'ID colaborador',
  'Colaborador',
  'Equipe',
  'Código/OS',
  'Esteira',
  'Cliente',
  'Prioridade',
  'Prazo da esteira',
  'Tarefa',
  'Setor',
  'Atividade',
  'Ordem no dia',
  'Quantidade prevista',
  'Tempo planejado (h:mm)',
  'Situação da atividade',
  'Observações',
] as const
const PLANNED_WIDTHS = [14, 22, 12, 14, 38, 38, 38, 24, 18, 14, 26, 20, 11, 18, 22, 20, 30, 9, 11, 14, 16, 30]

const LOAD_HEADERS = [
  'ID colaborador',
  'Colaborador',
  'Equipe(s)',
  'Dias úteis no recorte',
  'Dias sem capacidade cadastrada',
  'Capacidade no recorte (h:mm)',
  'Horas planejadas (h:mm)',
  'Saldo disponível (min)',
  'Ocupação',
  'Situação',
] as const
const LOAD_WIDTHS = [38, 26, 24, 12, 14, 16, 16, 16, 11, 24]

const DAILY_HEADERS = [
  'Data',
  'Dia da semana',
  'ID colaborador',
  'Colaborador',
  'Capacidade (h:mm)',
  'Planejado (h:mm)',
  'Saldo (min)',
  'Ocupação',
  'Situação',
] as const
const DAILY_WIDTHS = [12, 14, 38, 26, 14, 14, 12, 11, 24]

const SHEET_HEADER_ROW = 3

export function buildPlanningAiExportFilename(meta: Pick<PlanningAiExportMeta, 'scope' | 'from' | 'to'>): string {
  const scope = meta.scope === 'SEMANA' ? 'semana' : 'periodo'
  return `planejamento-ia-${scope}-${meta.from}-a-${meta.to}.xlsx`
}

function scopeLabel(meta: PlanningAiExportMeta): string {
  const range = `${formatDateBrPt(excelDateFromIso(meta.from))} a ${formatDateBrPt(excelDateFromIso(meta.to))}`
  return meta.scope === 'SEMANA' ? `Semana de ${range}` : `Período de ${range}`
}

function addTitle(sheet: ExcelJS.Worksheet, columns: number, title: string, subtitle: string): void {
  sheet.mergeCells(1, 1, 1, columns)
  sheet.getCell(1, 1).value = title
  sheet.getRow(1).font = { bold: true, size: 14 }
  sheet.mergeCells(2, 1, 2, columns)
  sheet.getCell(2, 1).value = subtitle
  sheet.getRow(2).font = { size: 11 }
}

function finishTable(
  sheet: ExcelJS.Worksheet,
  columns: number,
  widths: readonly number[],
): void {
  widths.forEach((w, idx) => {
    sheet.getColumn(idx + 1).width = w
  })
  sheet.autoFilter = {
    from: { row: SHEET_HEADER_ROW, column: 1 },
    to: { row: SHEET_HEADER_ROW, column: columns },
  }
  sheet.views = [{ state: 'frozen', ySplit: SHEET_HEADER_ROW }]
  sheet.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
}

function styleRow(row: ExcelJS.Row, columns: number): void {
  for (let col = 1; col <= columns; col += 1) applyTableCellStyle(row.getCell(col))
}

function paintRow(
  row: ExcelJS.Row,
  columns: number,
  fill: ExcelJS.Fill,
  font: Partial<ExcelJS.Font>,
): void {
  for (let col = 1; col <= columns; col += 1) {
    const cell = row.getCell(col)
    cell.fill = fill
    cell.font = { ...(cell.font ?? {}), ...font }
  }
}

function setNumberCell(cell: ExcelJS.Cell, value: number | null): void {
  cell.value = value == null ? null : value
}

const PROMPT_LINES: ReadonlyArray<string> = [
  'Você é um assistente de planejamento da produção (tapeçaria automotiva). Use as abas desta planilha para SUGERIR a distribuição das atividades do Backlog entre os colaboradores no recorte informado.',
  '',
  'Regras obrigatórias:',
  '1. NÃO altere, remova nem remaneje atividades da aba "Planejado" — elas já estão planejadas.',
  '2. Respeite a capacidade e o saldo de cada colaborador ("Carga dos colaboradores" e "Carga por dia"). Não ultrapasse o saldo diário; se não houver saldo, deixe a atividade sem sugestão e explique.',
  '3. Colaborador com "Capacidade não cadastrada" não tem capacidade conhecida: não planeje para ele sem confirmação humana.',
  '4. Planeje somente em dias úteis do recorte (segunda a sexta) e dentro das datas do recorte.',
  '5. Priorize: prazo vencido, prazo mais próximo e prioridade da esteira (alta > média > baixa).',
  '6. Respeite a sequência: atividades marcadas "Fora de sequência = Sim" dependem de atividades anteriores ainda abertas — prefira planejá-las depois delas.',
  '7. Prefira os colaboradores/equipes já alocados na atividade ("Colaboradores alocados" / "Equipes alocadas") e, para "Aguardando encaixe", a data e o responsável sugeridos no plano da esteira.',
  '8. Use o "Tempo pendente" como duração da atividade; não divida uma atividade entre colaboradores sem indicar isso claramente.',
  '9. Não invente dados: se faltar informação para decidir, registre a pendência.',
  '',
  'Formato de resposta sugerido (uma linha por atividade sugerida):',
  'ID atividade | Data (dd/mm/aaaa) | ID colaborador | Colaborador | Tempo planejado (h:mm) | Justificativa curta',
  '',
  'Dicionário das abas:',
  '• Backlog — estoque atual elegível para planejamento (independe do recorte). "Origem = Aguardando encaixe" são itens do plano da esteira enviados à fábrica e ainda não encaixados no planejamento semanal.',
  '• Planejado — atividades já planejadas no recorte (plano em edição da semana: rascunho/revisão, senão o publicado). "Situação do plano" indica qual versão foi usada.',
  '• Carga dos colaboradores — por colaborador no recorte: capacidade somada nos dias úteis (configuração operacional), horas planejadas (soma da aba Planejado por colaborador), saldo e ocupação. Itens planejados apenas para equipe (sem colaborador) não entram na carga individual.',
  '• Carga por dia — a mesma carga detalhada por colaborador e dia útil.',
  '',
  'Tempos estão em horas:minutos (formato [h]:mm). Saldo em minutos. Datas no formato dd/mm/aaaa (horário de Brasília).',
]

function addPromptSheet(workbook: ExcelJS.Workbook, meta: PlanningAiExportMeta): void {
  const sheet = workbook.addWorksheet(PLANNING_AI_SHEET_NAMES.prompt)
  sheet.getColumn(1).width = 140
  sheet.getCell(1, 1).value = 'SGP+ — Planejamento para IA'
  sheet.getRow(1).font = { bold: true, size: 14 }
  sheet.getCell(2, 1).value = `Recorte: ${scopeLabel(meta)}   |   Gerado em: ${formatTimestampBrPt(meta.generatedAt)}`
  sheet.getCell(3, 1).value = `Semanas: ${meta.weeks
    .map(
      (w) =>
        `${formatDateBrPt(excelDateFromIso(w.weekStartDate))} (${w.situation ? formatSituationLabel(w.situation) : 'SEM PLANO'})`,
    )
    .join(' · ')}`
  let r = 5
  for (const line of PROMPT_LINES) {
    const cell = sheet.getCell(r, 1)
    cell.value = line
    cell.alignment = { wrapText: true, vertical: 'top' }
    if (line.endsWith(':') && !line.startsWith('•')) cell.font = { bold: true }
    r += 1
  }
}

function addBacklogSheet(workbook: ExcelJS.Workbook, meta: PlanningAiExportMeta, rows: readonly PlanningAiBacklogRow[]): void {
  const sheet = workbook.addWorksheet(PLANNING_AI_SHEET_NAMES.backlog)
  const cols = BACKLOG_HEADERS.length
  addTitle(
    sheet,
    cols,
    'Backlog — atividades disponíveis para planejamento',
    `Estoque atual elegível (independe do recorte ${scopeLabel(meta)}) · ${rows.length} atividade(s)`,
  )
  writeHeaderRow(sheet, SHEET_HEADER_ROW, BACKLOG_HEADERS)
  let rn = SHEET_HEADER_ROW + 1
  for (const row of rows) {
    const x = sheet.getRow(rn)
    setTextCell(x.getCell(1), row.origin)
    setTextCell(x.getCell(2), row.activityNodeId)
    setTextCell(x.getCell(3), row.conveyorId)
    setTextCell(x.getCell(4), row.conveyorCode)
    setTextCell(x.getCell(5), row.conveyorTitle)
    setTextCell(x.getCell(6), row.clientName)
    setTextCell(x.getCell(7), row.vehicle)
    setTextCell(x.getCell(8), row.plate)
    setTextCell(x.getCell(9), row.priority)
    setTextCell(x.getCell(10), row.estimatedDeadline)
    setTextCell(x.getCell(11), row.deadlineOverdue)
    setTextCell(x.getCell(12), row.taskTitle)
    setTextCell(x.getCell(13), row.sectorTitle)
    setTextCell(x.getCell(14), row.activityTitle)
    setNumberCell(x.getCell(15), row.plannedQuantity)
    setDurationCell(x.getCell(16), row.plannedMinutes)
    setDurationCell(x.getCell(17), row.realizedMinutes)
    setDurationCell(x.getCell(18), row.pendingMinutes)
    setTextCell(x.getCell(19), row.responsibleCollaborators)
    setTextCell(x.getCell(20), row.responsibleTeams)
    setTextCell(x.getCell(21), row.outOfSequence)
    setDateCell(x.getCell(22), row.suggestedDate)
    setTextCell(x.getCell(23), row.suggestedAssignee)
    setTextCell(x.getCell(24), row.situation)
    styleRow(x, cols)
    if (row.deadlineOverdue === 'Sim') paintRow(x, cols, FILL_RED, FONT_RED)
    rn += 1
  }
  finishTable(sheet, cols, BACKLOG_WIDTHS)
}

function addPlannedSheet(workbook: ExcelJS.Workbook, meta: PlanningAiExportMeta, rows: readonly PlanningAiPlannedRow[]): void {
  const sheet = workbook.addWorksheet(PLANNING_AI_SHEET_NAMES.planned)
  const cols = PLANNED_HEADERS.length
  const totalMinutes = rows.reduce((s, r) => s + Math.max(0, r.plannedMinutes ?? 0), 0)
  addTitle(
    sheet,
    cols,
    'Planejado — atividades já planejadas no recorte (não alterar)',
    `${scopeLabel(meta)} · ${rows.length} atividade(s) · ${formatMinutesLabel(totalMinutes)} planejados`,
  )
  writeHeaderRow(sheet, SHEET_HEADER_ROW, PLANNED_HEADERS)
  let rn = SHEET_HEADER_ROW + 1
  for (const row of rows) {
    const x = sheet.getRow(rn)
    setDateCell(x.getCell(1), row.weekStartDate)
    setTextCell(x.getCell(2), formatSituationLabel(row.planSituation))
    setDateCell(x.getCell(3), row.plannedDate)
    x.getCell(4).value = weekdayLabelPt(row.plannedDate)
    setTextCell(x.getCell(5), row.workPlanItemId)
    setTextCell(x.getCell(6), row.activityNodeId)
    setTextCell(x.getCell(7), row.collaboratorId)
    setTextCell(x.getCell(8), row.collaboratorName)
    setTextCell(x.getCell(9), row.teamName)
    setTextCell(x.getCell(10), row.conveyorCode)
    setTextCell(x.getCell(11), row.conveyorTitle)
    setTextCell(x.getCell(12), row.clientName)
    setTextCell(x.getCell(13), row.priority)
    setTextCell(x.getCell(14), row.estimatedDeadline)
    setTextCell(x.getCell(15), row.taskTitle)
    setTextCell(x.getCell(16), row.sectorTitle)
    setTextCell(x.getCell(17), row.activityTitle)
    x.getCell(18).value = row.plannedOrderDisplay
    setNumberCell(x.getCell(19), row.plannedQuantity)
    setDurationCell(x.getCell(20), row.plannedMinutes)
    setTextCell(x.getCell(21), row.activityStatusLabel)
    setTextCell(x.getCell(22), row.notes)
    styleRow(x, cols)
    if (row.activityStatusLabel === 'Concluída') paintRow(x, cols, FILL_GREEN, FONT_GREEN)
    rn += 1
  }
  finishTable(sheet, cols, PLANNED_WIDTHS)
}

function paintByStatus(row: ExcelJS.Row, cols: number, status: PlanningAiLoadRow['statusLabel']): void {
  if (status === 'Sobrecarregado') paintRow(row, cols, FILL_RED, FONT_RED)
  else if (status === 'No limite') paintRow(row, cols, FILL_AMBER, FONT_AMBER)
}

function addLoadSheet(workbook: ExcelJS.Workbook, meta: PlanningAiExportMeta, rows: readonly PlanningAiLoadRow[]): void {
  const sheet = workbook.addWorksheet(PLANNING_AI_SHEET_NAMES.load)
  const cols = LOAD_HEADERS.length
  addTitle(
    sheet,
    cols,
    'Carga dos colaboradores no recorte',
    `${scopeLabel(meta)} · capacidade = soma dos dias úteis (configuração operacional) · planejado = aba Planejado`,
  )
  writeHeaderRow(sheet, SHEET_HEADER_ROW, LOAD_HEADERS)
  let rn = SHEET_HEADER_ROW + 1
  for (const row of rows) {
    const x = sheet.getRow(rn)
    setTextCell(x.getCell(1), row.collaboratorId)
    setTextCell(x.getCell(2), row.collaboratorName)
    setTextCell(x.getCell(3), row.teams)
    x.getCell(4).value = row.workdays
    x.getCell(5).value = row.daysWithoutCapacity
    setDurationCell(x.getCell(6), row.capacityMinutes)
    setDurationCell(x.getCell(7), row.plannedMinutes)
    if (row.capacityMinutes == null) {
      x.getCell(8).value = null
      x.getCell(9).value = null
    } else {
      // Fórmulas auditáveis no Excel (mesmo padrão da aba Capacidade do export semanal).
      x.getCell(8).value = { formula: `(F${rn}-G${rn})*1440`, result: row.capacityMinutes - row.plannedMinutes }
      x.getCell(8).numFmt = '0" min";-0" min"'
      x.getCell(9).value = { formula: `G${rn}/F${rn}`, result: row.plannedMinutes / row.capacityMinutes }
      x.getCell(9).numFmt = '0.0%'
    }
    setTextCell(x.getCell(10), row.statusLabel)
    styleRow(x, cols)
    paintByStatus(x, cols, row.statusLabel)
    rn += 1
  }
  finishTable(sheet, cols, LOAD_WIDTHS)
}

function addLoadDailySheet(
  workbook: ExcelJS.Workbook,
  meta: PlanningAiExportMeta,
  rows: readonly PlanningAiLoadDailyRow[],
): void {
  const sheet = workbook.addWorksheet(PLANNING_AI_SHEET_NAMES.loadDaily)
  const cols = DAILY_HEADERS.length
  addTitle(sheet, cols, 'Carga por dia útil', scopeLabel(meta))
  writeHeaderRow(sheet, SHEET_HEADER_ROW, DAILY_HEADERS)
  let rn = SHEET_HEADER_ROW + 1
  for (const row of rows) {
    const x = sheet.getRow(rn)
    setDateCell(x.getCell(1), row.date)
    x.getCell(2).value = weekdayLabelPt(row.date)
    setTextCell(x.getCell(3), row.collaboratorId)
    setTextCell(x.getCell(4), row.collaboratorName)
    setDurationCell(x.getCell(5), row.capacityMinutes)
    setDurationCell(x.getCell(6), row.plannedMinutes)
    if (row.capacityMinutes == null) {
      x.getCell(7).value = null
      x.getCell(8).value = null
    } else {
      x.getCell(7).value = { formula: `(E${rn}-F${rn})*1440`, result: row.capacityMinutes - row.plannedMinutes }
      x.getCell(7).numFmt = '0" min";-0" min"'
      x.getCell(8).value = { formula: `F${rn}/E${rn}`, result: row.plannedMinutes / row.capacityMinutes }
      x.getCell(8).numFmt = '0.0%'
    }
    setTextCell(x.getCell(9), row.statusLabel)
    styleRow(x, cols)
    paintByStatus(x, cols, row.statusLabel)
    rn += 1
  }
  finishTable(sheet, cols, DAILY_WIDTHS)
}

export async function buildPlanningAiExportWorkbookBuffer(input: {
  meta: PlanningAiExportMeta
  backlogRows: readonly PlanningAiBacklogRow[]
  plannedRows: readonly PlanningAiPlannedRow[]
  loadRows: readonly PlanningAiLoadRow[]
  loadDailyRows: readonly PlanningAiLoadDailyRow[]
}): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  addPromptSheet(workbook, input.meta)
  addBacklogSheet(workbook, input.meta, input.backlogRows)
  addPlannedSheet(workbook, input.meta, input.plannedRows)
  addLoadSheet(workbook, input.meta, input.loadRows)
  addLoadDailySheet(workbook, input.meta, input.loadDailyRows)
  const raw = await workbook.xlsx.writeBuffer()
  return Buffer.isBuffer(raw) ? raw : Buffer.from(raw)
}
