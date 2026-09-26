/**
 * Export .xlsx para o piloto MANUAL de sugestão de alocação via IA (fora do sistema).
 * Módulo puro — sem I/O. Colunas em snake_case (legíveis por máquina); cores apenas visuais,
 * explicadas na aba "Legenda". Paleta contida: neutro + 4 tons suaves com significado fixo.
 */
import ExcelJS from 'exceljs'
import { sanitizeExcelText } from './operational-planning.export.js'

export type AiPilotActivityStatus = 'pendente' | 'em_andamento'

export type AiPilotActivityRow = {
  activityId: string
  name: string
  /** 1 = alta, 2 = média, 3 = baixa (prioridade da esteira). */
  priority: number
  orderIndex: number
  status: AiPilotActivityStatus
  durationMinutes: number
  conveyorId: string
  conveyorCode: string
  /** Posição global da atividade na esteira (tarefa → setor → atividade), começando em 1. */
  conveyorSequence: number
}

export type AiPilotSequenceOrigin = 'designado_direto' | 'via_equipe' | 'responsavel_padrao'

export type AiPilotSequenceRow = {
  activityId: string
  collaboratorId: string
  collaboratorName: string
  sequencePosition: number
  origin: AiPilotSequenceOrigin
}

export type AiPilotCapacityRow = {
  collaboratorId: string
  collaboratorName: string
  date: string
  capacityMinutes: number
  allocatedMinutes: number
  reductionReason: string
}

export type AiPilotFixedAllocationRow = {
  activityId: string
  collaboratorId: string | null
  date: string
  durationMinutes: number
}

export type AiPilotExportInput = {
  startDate: string
  endDate: string
  generatedAt: Date
  activities: readonly AiPilotActivityRow[]
  sequences: readonly AiPilotSequenceRow[]
  capacities: readonly AiPilotCapacityRow[]
  fixedAllocations: readonly AiPilotFixedAllocationRow[]
}

/** Paleta única do arquivo (fundo + cor de texto legível). */
export const AI_PILOT_PALETTE = {
  neutral: { fill: 'FFF2F2F2', font: 'FF1F2933' },
  blue: { fill: 'FFDDEBF7', font: 'FF1F4E78' },
  green: { fill: 'FFD9EAD3', font: 'FF274E13' },
  amber: { fill: 'FFFFF2CC', font: 'FF7F6000' },
  red: { fill: 'FFF4CCCC', font: 'FF990000' },
} as const

export type AiPilotTone = keyof typeof AI_PILOT_PALETTE

const HEADER_FILL = 'FF1F2933'
const HEADER_FONT = 'FFFFFFFF'

const BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FFBFBFBF' } },
  left: { style: 'thin', color: { argb: 'FFBFBFBF' } },
  bottom: { style: 'thin', color: { argb: 'FFBFBFBF' } },
  right: { style: 'thin', color: { argb: 'FFBFBFBF' } },
}

export const AI_PILOT_SHEET_NAMES = {
  activities: 'Atividades',
  sequences: 'Sequencias',
  capacities: 'Capacidades',
  fixedAllocations: 'AlocacoesFixas',
  legend: 'Legenda',
} as const

export const AI_PILOT_HEADERS = {
  activities: [
    'atividade_id',
    'nome',
    'prioridade',
    'order_index',
    'status',
    'duracao_minutos',
    'esteira_id',
    'esteira_codigo',
    'ordem_na_esteira',
  ],
  sequences: ['atividade_id', 'colaborador_id', 'colaborador_nome', 'posicao_sequencia', 'origem'],
  capacities: [
    'colaborador_id',
    'colaborador_nome',
    'data',
    'capacidade_minutos_total',
    'minutos_ja_alocados',
    'motivo_reducao',
  ],
  fixedAllocations: ['atividade_id', 'colaborador_id', 'data', 'duracao_minutos'],
} as const

export function buildAiPilotExportFilename(startDate: string, endDate: string): string {
  return `piloto-ia-planejamento-${startDate}-a-${endDate}.xlsx`
}

export function activityTone(row: Pick<AiPilotActivityRow, 'status'>): AiPilotTone {
  return row.status === 'em_andamento' ? 'blue' : 'neutral'
}

export function sequenceTone(row: Pick<AiPilotSequenceRow, 'origin'>): AiPilotTone {
  if (row.origin === 'designado_direto') return 'blue'
  if (row.origin === 'responsavel_padrao') return 'amber'
  return 'neutral'
}

/** Tom da linha de capacidade pela ocupação (mesma regra do export semanal: igual = no limite). */
export function capacityTone(
  row: Pick<AiPilotCapacityRow, 'capacityMinutes' | 'allocatedMinutes'>,
): AiPilotTone {
  if (row.allocatedMinutes > row.capacityMinutes) return 'red'
  if (row.allocatedMinutes === row.capacityMinutes) return 'amber'
  return 'green'
}

export function fixedAllocationTone(row: Pick<AiPilotFixedAllocationRow, 'collaboratorId'>): AiPilotTone {
  return row.collaboratorId ? 'neutral' : 'amber'
}

type LegendEntry = { sheet: string; tone: AiPilotTone; meaning: string }

export const AI_PILOT_LEGEND: readonly LegendEntry[] = [
  { sheet: AI_PILOT_SHEET_NAMES.activities, tone: 'neutral', meaning: 'Atividade pendente (ainda não iniciada ou reaberta).' },
  { sheet: AI_PILOT_SHEET_NAMES.activities, tone: 'blue', meaning: 'Atividade em andamento.' },
  { sheet: AI_PILOT_SHEET_NAMES.sequences, tone: 'blue', meaning: 'Colaborador designado diretamente na atividade.' },
  { sheet: AI_PILOT_SHEET_NAMES.sequences, tone: 'neutral', meaning: 'Colaborador elegível por ser membro de equipe designada.' },
  {
    sheet: AI_PILOT_SHEET_NAMES.sequences,
    tone: 'amber',
    meaning: 'Sem designação: usado o responsável padrão da atividade (vínculo mais fraco).',
  },
  { sheet: AI_PILOT_SHEET_NAMES.capacities, tone: 'green', meaning: 'Dia com capacidade livre (alocado < capacidade).' },
  { sheet: AI_PILOT_SHEET_NAMES.capacities, tone: 'amber', meaning: 'Dia no limite (alocado = capacidade).' },
  { sheet: AI_PILOT_SHEET_NAMES.capacities, tone: 'red', meaning: 'Dia sobrecarregado (alocado > capacidade).' },
  { sheet: AI_PILOT_SHEET_NAMES.fixedAllocations, tone: 'neutral', meaning: 'Alocação confirmada (plano publicado) — não mover.' },
  {
    sheet: AI_PILOT_SHEET_NAMES.fixedAllocations,
    tone: 'amber',
    meaning: 'Alocação confirmada só para equipe (sem colaborador) — não entra em minutos_ja_alocados.',
  },
]

function styleCell(cell: ExcelJS.Cell, tone: AiPilotTone): void {
  const c = AI_PILOT_PALETTE[tone]
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: c.fill } }
  cell.font = { size: 11, color: { argb: c.font } }
  cell.border = BORDER
  cell.alignment = { vertical: 'top' }
}

function writeHeader(sheet: ExcelJS.Worksheet, headers: readonly string[], widths: readonly number[]): void {
  const row = sheet.getRow(1)
  headers.forEach((label, idx) => {
    const cell = row.getCell(idx + 1)
    cell.value = label
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } }
    cell.font = { bold: true, size: 11, color: { argb: HEADER_FONT } }
    cell.border = BORDER
    cell.alignment = { vertical: 'middle' }
    sheet.getColumn(idx + 1).width = widths[idx] ?? 16
  })
  sheet.views = [{ state: 'frozen', ySplit: 1 }]
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } }
}

function text(value: string | null | undefined): string {
  return sanitizeExcelText(value ?? '')
}

function addDataSheet<T>(
  workbook: ExcelJS.Workbook,
  name: string,
  headers: readonly string[],
  widths: readonly number[],
  rows: readonly T[],
  toValues: (row: T) => (string | number)[],
  toneOf: (row: T) => AiPilotTone,
): void {
  const sheet = workbook.addWorksheet(name)
  writeHeader(sheet, headers, widths)
  rows.forEach((row, i) => {
    const excelRow = sheet.getRow(i + 2)
    const values = toValues(row)
    const tone = toneOf(row)
    values.forEach((v, idx) => {
      const cell = excelRow.getCell(idx + 1)
      cell.value = typeof v === 'string' ? text(v) : v
      styleCell(cell, tone)
    })
  })
}

function addLegendSheet(workbook: ExcelJS.Workbook, input: AiPilotExportInput): void {
  const sheet = workbook.addWorksheet(AI_PILOT_SHEET_NAMES.legend)
  sheet.getColumn(1).width = 18
  sheet.getColumn(2).width = 14
  sheet.getColumn(3).width = 90

  const info: [string, string][] = [
    ['Relatório', 'SGP+ — Exportação para piloto de sugestão de planejamento via IA'],
    ['Período', `${input.startDate} a ${input.endDate} (somente dias úteis, seg–sex)`],
    ['Gerado em (UTC)', input.generatedAt.toISOString()],
    ['Prioridade', '1 = alta, 2 = média, 3 = baixa (prioridade da esteira da atividade).'],
    ['Durações', 'Todas as durações/capacidades estão em minutos.'],
    ['Fixas', 'AlocacoesFixas vêm apenas de planos semanais PUBLICADOS; rascunhos são ignorados.'],
  ]
  info.forEach(([k, v], i) => {
    const row = sheet.getRow(i + 1)
    row.getCell(1).value = k
    row.getCell(1).font = { bold: true }
    sheet.mergeCells(i + 1, 2, i + 1, 3)
    row.getCell(2).value = v
  })

  const headerRow = info.length + 2
  ;['aba', 'cor', 'significado'].forEach((label, idx) => {
    const cell = sheet.getRow(headerRow).getCell(idx + 1)
    cell.value = label
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } }
    cell.font = { bold: true, color: { argb: HEADER_FONT } }
    cell.border = BORDER
  })

  AI_PILOT_LEGEND.forEach((entry, i) => {
    const row = sheet.getRow(headerRow + 1 + i)
    row.getCell(1).value = entry.sheet
    row.getCell(1).border = BORDER
    const swatch = row.getCell(2)
    swatch.value = ''
    styleCell(swatch, entry.tone)
    row.getCell(3).value = entry.meaning
    row.getCell(3).border = BORDER
  })
}

export async function buildAiPilotExportWorkbookBuffer(input: AiPilotExportInput): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.created = input.generatedAt

  addDataSheet(
    workbook,
    AI_PILOT_SHEET_NAMES.activities,
    AI_PILOT_HEADERS.activities,
    [38, 36, 11, 12, 14, 16, 38, 16, 17],
    input.activities,
    (r) => [
      r.activityId,
      r.name,
      r.priority,
      r.orderIndex,
      r.status,
      r.durationMinutes,
      r.conveyorId,
      r.conveyorCode,
      r.conveyorSequence,
    ],
    activityTone,
  )

  addDataSheet(
    workbook,
    AI_PILOT_SHEET_NAMES.sequences,
    AI_PILOT_HEADERS.sequences,
    [38, 38, 30, 18, 20],
    input.sequences,
    (r) => [r.activityId, r.collaboratorId, r.collaboratorName, r.sequencePosition, r.origin],
    sequenceTone,
  )

  addDataSheet(
    workbook,
    AI_PILOT_SHEET_NAMES.capacities,
    AI_PILOT_HEADERS.capacities,
    [38, 30, 12, 24, 20, 44],
    input.capacities,
    (r) => [r.collaboratorId, r.collaboratorName, r.date, r.capacityMinutes, r.allocatedMinutes, r.reductionReason],
    capacityTone,
  )

  addDataSheet(
    workbook,
    AI_PILOT_SHEET_NAMES.fixedAllocations,
    AI_PILOT_HEADERS.fixedAllocations,
    [38, 38, 12, 16],
    input.fixedAllocations,
    (r) => [r.activityId, r.collaboratorId ?? '', r.date, r.durationMinutes],
    fixedAllocationTone,
  )

  addLegendSheet(workbook, input)

  const raw = await workbook.xlsx.writeBuffer()
  return Buffer.isBuffer(raw) ? raw : Buffer.from(raw)
}
