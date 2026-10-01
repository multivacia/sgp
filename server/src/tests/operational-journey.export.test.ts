import { describe, expect, it } from 'vitest'
import ExcelJS from 'exceljs'
import {
  buildOperationalJourneyExportFilename,
  buildOperationalJourneyExportWorkbookBuffer,
  journeyExportCoberturaRatio,
  sumJourneyExportTotals,
  type OperationalJourneyExportCollaborator,
  type OperationalJourneyExportTotals,
} from '../modules/operational-journey/operational-journey.export.js'
import { operationalJourneyExportCollaboratorIdsSchema } from '../modules/operational-journey/operational-journey.schemas.js'

const A = '3a5f3c72-2e75-4e0a-8f6e-6d4d086e5f1c'
const B = '9b1f3c72-2e75-4e0a-8f6e-6d4d086e5f1d'

function totals(partial: Partial<OperationalJourneyExportTotals> = {}): OperationalJourneyExportTotals {
  return {
    assignmentCount: 2,
    plannedMinutesOnStepsSum: 120,
    realizedMinutesInPeriod: 90,
    realizedMinutesTotal: 150,
    coberturaRealizadoMinutos: 60,
    coberturaPrevistoMinutos: 120,
    extraMinutesInPeriod: 30,
    extraEntriesCount: 1,
    overdueCount: 0,
    pendenciaTempoCount: 1,
    ...partial,
  }
}

function collaborator(
  id: string,
  fullName: string,
  minutes: number[],
  t: Partial<OperationalJourneyExportTotals> = {},
): OperationalJourneyExportCollaborator {
  return {
    collaboratorId: id,
    fullName,
    code: `C-${fullName.slice(0, 3)}`,
    registrationCode: null,
    totals: totals({ realizedMinutesInPeriod: minutes.reduce((s, m) => s + m, 0), ...t }),
    timeEntries: minutes.map((m, i) => ({
      workDate: `2026-09-0${i + 1}`,
      conveyorCode: 'OS-1',
      conveyorName: 'Esteira Alfa',
      optionName: 'Tarefa',
      areaName: 'Setor',
      stepName: `Atividade ${i + 1}`,
      minutes: m,
      executedQuantity: i === 0 ? 2 : null,
      entryOrigin: 'ASSIGNED',
      isOutOfSequence: false,
      justification: null,
      notes: i === 0 ? '=SOMA(A1)' : null,
    })),
    extraEntries: [{ entryDate: '2026-09-02', description: 'Limpeza', minutes: 30, notes: null }],
  }
}

/** Durações `[h]:mm` voltam do ExcelJS como Date (época 1899-12-30) — converte para minutos. */
function durationMinutes(value: ExcelJS.CellValue): number {
  if (value instanceof Date) return Math.round((value.getTime() - Date.UTC(1899, 11, 30)) / 60000)
  return Math.round(Number(value) * 1440)
}

async function readWorkbook(buffer: Buffer): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(buffer as unknown as ArrayBuffer)
  return wb
}

const meta = {
  periodFromDate: '2026-09-01',
  periodToDate: '2026-09-07',
  periodPreset: '7d' as const,
  conveyorFilterLabel: null,
  generatedAt: new Date('2026-09-07T12:00:00Z'),
}

describe('operational-journey export — regras puras', () => {
  it('cobertura recalculada sobre somas; null quando previsto ≤ 0', () => {
    const sum = sumJourneyExportTotals([
      totals({ coberturaRealizadoMinutos: 60, coberturaPrevistoMinutos: 120 }),
      totals({ coberturaRealizadoMinutos: 90, coberturaPrevistoMinutos: 30 }),
    ])
    expect(sum.coberturaRealizadoMinutos).toBe(150)
    expect(sum.coberturaPrevistoMinutos).toBe(150)
    expect(journeyExportCoberturaRatio(sum.coberturaRealizadoMinutos, sum.coberturaPrevistoMinutos)).toBe(1)
    expect(journeyExportCoberturaRatio(10, 0)).toBeNull()
  })

  it('nome do arquivo distingue um ou vários colaboradores', () => {
    expect(buildOperationalJourneyExportFilename(meta, 1)).toBe(
      'jornada-colaborador-2026-09-01-a-2026-09-07.xlsx',
    )
    expect(buildOperationalJourneyExportFilename(meta, 3)).toBe(
      'jornada-3-colaboradores-2026-09-01-a-2026-09-07.xlsx',
    )
  })
})

describe('operational-journey export — collaboratorIds', () => {
  it('aceita lista por vírgula e parâmetro repetido, removendo duplicados', () => {
    expect(operationalJourneyExportCollaboratorIdsSchema.parse(`${A}, ${B},${A}`)).toEqual([A, B])
    expect(operationalJourneyExportCollaboratorIdsSchema.parse([A, `${B},${A}`])).toEqual([A, B])
  })

  it('rejeita vazio e uuid inválido', () => {
    expect(() => operationalJourneyExportCollaboratorIdsSchema.parse('')).toThrow()
    expect(() => operationalJourneyExportCollaboratorIdsSchema.parse('abc')).toThrow()
  })

  it('rejeita mais de 50 colaboradores', () => {
    const ids = Array.from(
      { length: 51 },
      (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
    )
    expect(() => operationalJourneyExportCollaboratorIdsSchema.parse(ids.join(','))).toThrow()
  })
})

describe('operational-journey export — workbook', () => {
  it('um colaborador: abas, identificação, período e subtotal sem total geral', async () => {
    const buffer = await buildOperationalJourneyExportWorkbookBuffer({
      meta,
      collaborators: [collaborator(A, 'Ana Souza', [30, 45])],
    })
    const wb = await readWorkbook(buffer)
    expect(wb.worksheets.map((s) => s.name)).toEqual(['Resumo', 'Apontamentos', 'Extra esteira'])

    const resumo = wb.getWorksheet('Resumo')!
    expect(String(resumo.getCell(2, 1).value)).toContain('01/09/2026 a 07/09/2026')
    expect(String(resumo.getCell(3, 1).value)).toBe('Esteira: Todas')
    expect(resumo.getCell(9, 1).value).toBe('Ana Souza')
    expect(resumo.getCell(9, 2).value).toBe('C-Ana')
    expect(resumo.getCell(9, 4).value).toBe(2)
    expect(durationMinutes(resumo.getCell(9, 5).value)).toBe(75)
    expect(resumo.getCell(9, 11).value).toBeCloseTo(0.5)
    expect(resumo.getCell(10, 1).value).toBeNull()

    const ap = wb.getWorksheet('Apontamentos')!
    expect(ap.getCell(4, 1).value).toBe('Ana Souza')
    expect(ap.getCell(4, 10).value).toBe(30)
    expect(ap.getCell(4, 11).value).toBe(2)
    // Texto livre iniciado por "=" não vira fórmula.
    expect(ap.getCell(4, 15).value).toBe("'=SOMA(A1)")
    expect(String(ap.getCell(6, 1).value)).toBe('Subtotal — Ana Souza')
    expect(ap.getCell(6, 10).value).toBe(75)
    expect(ap.getCell(7, 1).value).toBeNull()
  })

  it('vários colaboradores: total geral = soma dos subtotais e do resumo', async () => {
    const buffer = await buildOperationalJourneyExportWorkbookBuffer({
      meta: { ...meta, conveyorFilterLabel: 'OS-1 · Esteira Alfa' },
      collaborators: [
        collaborator(A, 'Ana Souza', [30, 45]),
        collaborator(B, 'Bruno Lima', [60], { coberturaRealizadoMinutos: 0, coberturaPrevistoMinutos: 0 }),
      ],
    })
    const wb = await readWorkbook(buffer)
    const resumo = wb.getWorksheet('Resumo')!
    expect(String(resumo.getCell(3, 1).value)).toBe('Esteira: OS-1 · Esteira Alfa')
    expect(resumo.getCell(10, 11).value).toBe('Não aplicável')
    expect(resumo.getCell(11, 1).value).toBe('Total geral')
    expect(resumo.getCell(11, 4).value).toBe(3)
    expect(durationMinutes(resumo.getCell(11, 5).value)).toBe(135)
    expect(durationMinutes(resumo.getCell(11, 6).value)).toBe(60)
    // cobertura geral = (60 + 0) / (120 + 0)
    expect(resumo.getCell(11, 11).value).toBeCloseTo(0.5)

    const ap = wb.getWorksheet('Apontamentos')!
    let total: ExcelJS.Row | null = null
    ap.eachRow((row) => {
      if (row.getCell(1).value === 'Total geral') total = row
    })
    expect(total).not.toBeNull()
    expect(total!.getCell(10).value).toBe(135)
    expect(total!.getCell(8).value).toBe('3 apontamento(s)')

    const extra = wb.getWorksheet('Extra esteira')!
    let extraTotal: ExcelJS.Row | null = null
    extra.eachRow((row) => {
      if (row.getCell(1).value === 'Total geral') extraTotal = row
    })
    expect(extraTotal!.getCell(6).value).toBe(60)
  })
})
