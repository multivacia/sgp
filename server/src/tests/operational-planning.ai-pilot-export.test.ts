import { describe, expect, it } from 'vitest'
import ExcelJS from 'exceljs'
import {
  AI_PILOT_HEADERS,
  AI_PILOT_LEGEND,
  AI_PILOT_PALETTE,
  AI_PILOT_SHEET_NAMES,
  buildAiPilotExportFilename,
  buildAiPilotExportWorkbookBuffer,
  capacityTone,
  type AiPilotExportInput,
} from '../modules/operational-planning/operational-planning.ai-pilot-export.js'
import {
  resolveAiPilotExportRange,
  weekdaysBetween,
} from '../modules/operational-planning/operational-planning.ai-pilot-export.service.js'

function sampleInput(): AiPilotExportInput {
  return {
    startDate: '2026-09-21',
    endDate: '2026-09-25',
    generatedAt: new Date('2026-09-20T12:00:00.000Z'),
    activities: [
      {
        activityId: 'a1',
        name: 'Desmontar banco',
        priority: 1,
        orderIndex: 1,
        status: 'pendente',
        durationMinutes: 60,
        conveyorId: 'c1',
        conveyorCode: 'OS-1',
        conveyorSequence: 1,
      },
      {
        activityId: 'a2',
        name: '=cmd',
        priority: 2,
        orderIndex: 2,
        status: 'em_andamento',
        durationMinutes: 30,
        conveyorId: 'c1',
        conveyorCode: 'OS-1',
        conveyorSequence: 2,
      },
    ],
    sequences: [
      { activityId: 'a1', collaboratorId: 'p1', collaboratorName: 'Ana', sequencePosition: 1, origin: 'designado_direto' },
      { activityId: 'a1', collaboratorId: 'p2', collaboratorName: 'Bia', sequencePosition: 2, origin: 'via_equipe' },
    ],
    capacities: [
      { collaboratorId: 'p1', collaboratorName: 'Ana', date: '2026-09-21', capacityMinutes: 480, allocatedMinutes: 500, reductionReason: '' },
      { collaboratorId: 'p2', collaboratorName: 'Bia', date: '2026-09-21', capacityMinutes: 240, allocatedMinutes: 0, reductionReason: 'Jornada reduzida' },
    ],
    fixedAllocations: [
      { activityId: 'a1', collaboratorId: 'p1', date: '2026-09-21', durationMinutes: 500 },
      { activityId: 'a2', collaboratorId: null, date: '2026-09-22', durationMinutes: 30 },
    ],
  }
}

async function load(input: AiPilotExportInput): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(await buildAiPilotExportWorkbookBuffer(input))
  return wb
}

function fillOf(cell: ExcelJS.Cell): string | undefined {
  const fill = cell.fill as ExcelJS.FillPattern | undefined
  return fill?.fgColor?.argb
}

describe('export piloto IA — workbook', () => {
  it('gera as 4 abas de dados + Legenda com os cabeçalhos da spec', async () => {
    const wb = await load(sampleInput())
    expect(wb.worksheets.map((w) => w.name)).toEqual([
      'Atividades',
      'Sequencias',
      'Capacidades',
      'AlocacoesFixas',
      'Legenda',
    ])
    const headersOf = (name: string) =>
      (wb.getWorksheet(name)!.getRow(1).values as unknown[]).slice(1)
    expect(headersOf('Atividades')).toEqual([...AI_PILOT_HEADERS.activities])
    expect(headersOf('Sequencias')).toEqual([...AI_PILOT_HEADERS.sequences])
    expect(headersOf('Capacidades')).toEqual([...AI_PILOT_HEADERS.capacities])
    expect(headersOf('AlocacoesFixas')).toEqual([...AI_PILOT_HEADERS.fixedAllocations])
  })

  it('valores numéricos como número, datas como texto YYYY-MM-DD e texto protegido contra fórmula', async () => {
    const wb = await load(sampleInput())
    const act = wb.getWorksheet('Atividades')!
    expect(act.getRow(2).getCell(3).value).toBe(1)
    expect(act.getRow(2).getCell(6).value).toBe(60)
    expect(act.getRow(3).getCell(2).value).toBe("'=cmd")
    const cap = wb.getWorksheet('Capacidades')!
    expect(cap.getRow(2).getCell(3).value).toBe('2026-09-21')
    expect(cap.getRow(2).getCell(5).value).toBe(500)
    const fixed = wb.getWorksheet('AlocacoesFixas')!
    expect(fixed.getRow(3).getCell(2).value).toBe('')
  })

  it('toda célula de dado tem fundo, e as cores seguem a legenda', async () => {
    const wb = await load(sampleInput())
    for (const name of ['Atividades', 'Sequencias', 'Capacidades', 'AlocacoesFixas']) {
      const ws = wb.getWorksheet(name)!
      for (let r = 2; r <= ws.rowCount; r += 1) {
        for (let c = 1; c <= ws.getRow(1).cellCount; c += 1) {
          expect(fillOf(ws.getRow(r).getCell(c)), `${name} R${r}C${c}`).toBeTruthy()
        }
      }
    }
    const act = wb.getWorksheet('Atividades')!
    expect(fillOf(act.getRow(2).getCell(1))).toBe(AI_PILOT_PALETTE.neutral.fill)
    expect(fillOf(act.getRow(3).getCell(1))).toBe(AI_PILOT_PALETTE.blue.fill)
    const cap = wb.getWorksheet('Capacidades')!
    expect(fillOf(cap.getRow(2).getCell(1))).toBe(AI_PILOT_PALETTE.red.fill)
    expect(fillOf(cap.getRow(3).getCell(1))).toBe(AI_PILOT_PALETTE.green.fill)
    const fixed = wb.getWorksheet('AlocacoesFixas')!
    expect(fillOf(fixed.getRow(3).getCell(1))).toBe(AI_PILOT_PALETTE.amber.fill)
  })

  it('Legenda lista cada cor usada por aba com amostra colorida', async () => {
    const wb = await load(sampleInput())
    const legend = wb.getWorksheet(AI_PILOT_SHEET_NAMES.legend)!
    const rows: { sheet: string; fill?: string; meaning: string }[] = []
    legend.eachRow((row) => {
      const sheet = String(row.getCell(1).value ?? '')
      if (Object.values(AI_PILOT_SHEET_NAMES).includes(sheet as never)) {
        rows.push({ sheet, fill: fillOf(row.getCell(2)), meaning: String(row.getCell(3).value) })
      }
    })
    expect(rows).toHaveLength(AI_PILOT_LEGEND.length)
    for (const entry of AI_PILOT_LEGEND) {
      expect(rows).toContainEqual({
        sheet: entry.sheet,
        fill: AI_PILOT_PALETTE[entry.tone].fill,
        meaning: entry.meaning,
      })
    }
  })

  it('capacityTone: igual = no limite, acima = sobrecarga', () => {
    expect(capacityTone({ capacityMinutes: 480, allocatedMinutes: 480 })).toBe('amber')
    expect(capacityTone({ capacityMinutes: 480, allocatedMinutes: 481 })).toBe('red')
    expect(capacityTone({ capacityMinutes: 480, allocatedMinutes: 0 })).toBe('green')
  })

  it('nome do arquivo', () => {
    expect(buildAiPilotExportFilename('2026-09-21', '2026-09-25')).toBe(
      'piloto-ia-planejamento-2026-09-21-a-2026-09-25.xlsx',
    )
  })
})

describe('export piloto IA — intervalo', () => {
  it('default = semana corrente (seg–sex) no fuso de São Paulo', () => {
    // Domingo 27/09 02:00 UTC ainda é sábado 26/09 em São Paulo.
    expect(resolveAiPilotExportRange({}, new Date('2026-09-27T02:00:00Z'))).toEqual({
      startDate: '2026-09-21',
      endDate: '2026-09-25',
    })
  })

  it('só inicio → até a sexta da mesma semana', () => {
    expect(resolveAiPilotExportRange({ inicio: '2026-09-23' })).toEqual({
      startDate: '2026-09-23',
      endDate: '2026-09-25',
    })
  })

  it('fim antes de inicio ou intervalo longo demais → erro 400', () => {
    expect(() => resolveAiPilotExportRange({ inicio: '2026-09-25', fim: '2026-09-21' })).toThrow()
    expect(() => resolveAiPilotExportRange({ inicio: '2026-01-01', fim: '2026-03-01' })).toThrow()
  })

  it('weekdaysBetween ignora sábado e domingo', () => {
    expect(weekdaysBetween('2026-09-25', '2026-09-29')).toEqual([
      '2026-09-25',
      '2026-09-28',
      '2026-09-29',
    ])
  })
})
