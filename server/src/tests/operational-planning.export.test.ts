import { describe, expect, it } from 'vitest'
import ExcelJS from 'exceljs'
import {
  buildOperationalPlanningExportFilename,
  buildOperationalPlanningExportWorkbookBuffer,
  excelDateFromIso,
  sanitizeExcelText,
  weekdayLabelPt,
  type OperationalPlanningExportCapacityRow,
  type OperationalPlanningExportMeta,
  type OperationalPlanningExportPlanningRow,
} from '../modules/operational-planning/operational-planning.export.js'

function sampleMeta(
  partial: Partial<OperationalPlanningExportMeta> = {},
): OperationalPlanningExportMeta {
  return {
    weekStartDate: '2026-09-07',
    weekEndDate: '2026-09-11',
    situation: 'RASCUNHO',
    generatedAt: new Date('2026-09-05T14:30:00.000Z'),
    totalActivities: 2,
    totalPlannedMinutes: 150,
    collaboratorsWithActivityCount: 2,
    ...partial,
  }
}

function samplePlanningRow(
  partial: Partial<OperationalPlanningExportPlanningRow> = {},
): OperationalPlanningExportPlanningRow {
  return {
    plannedDate: '2026-09-07',
    collaboratorName: 'Maria Silva',
    teamName: '—',
    conveyorCode: '—',
    conveyorTitle: 'Esteira A',
    clientName: 'Cliente A',
    vehicle: 'Fusca',
    plate: 'ABC1234',
    estimatedDeadline: '2026-09-20',
    taskTitle: 'Tarefa A',
    sectorTitle: 'Setor A',
    activityTitle: 'Atividade A',
    plannedOrderDisplay: 1,
    plannedMinutes: 90,
    statusLabel: 'Aberta',
    notes: '—',
    reviewRequiredLabel: 'Não',
    ...partial,
  }
}

function sampleCapacityRow(
  partial: Partial<OperationalPlanningExportCapacityRow> = {},
): OperationalPlanningExportCapacityRow {
  return {
    date: '2026-09-07',
    collaboratorName: 'Maria Silva',
    capacityMinutes: 480,
    plannedMinutes: 90,
    balanceMinutes: 390,
    occupancyRatio: 90 / 480,
    statusLabel: 'Disponível',
    ...partial,
  }
}

describe('buildOperationalPlanningExportFilename', () => {
  it('gera nome com slug correto para os 3 estados', () => {
    expect(
      buildOperationalPlanningExportFilename('2026-09-07', '2026-09-11', 'PUBLICADO'),
    ).toBe('planejamento-semanal-2026-09-07-a-2026-09-11-publicado.xlsx')
    expect(
      buildOperationalPlanningExportFilename('2026-09-07', '2026-09-11', 'RASCUNHO'),
    ).toBe('planejamento-semanal-2026-09-07-a-2026-09-11-rascunho.xlsx')
    expect(
      buildOperationalPlanningExportFilename(
        '2026-09-07',
        '2026-09-11',
        'REVISAO_NAO_PUBLICADA',
      ),
    ).toBe('planejamento-semanal-2026-09-07-a-2026-09-11-revisao-nao-publicada.xlsx')
  })
})

describe('excelDateFromIso', () => {
  it('não desloca fuso: 2026-09-07 vira dia 7 local, mês 9 (index 8), ano 2026', () => {
    const d = excelDateFromIso('2026-09-07')
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(8)
    expect(d.getDate()).toBe(7)
  })
})

describe('weekdayLabelPt', () => {
  it('resolve o dia da semana em PT-BR a partir da data civil', () => {
    // 2026-09-07 é uma segunda-feira.
    expect(weekdayLabelPt('2026-09-07')).toBe('Segunda-feira')
  })
})

describe('sanitizeExcelText', () => {
  it('prefixa com apóstrofo quando o texto começa com =, +, - ou @', () => {
    expect(sanitizeExcelText('=SUM(A1:A2)')).toBe("'=SUM(A1:A2)")
    expect(sanitizeExcelText('+1234')).toBe("'+1234")
    expect(sanitizeExcelText('-DROP TABLE')).toBe("'-DROP TABLE")
    expect(sanitizeExcelText('@cmd')).toBe("'@cmd")
  })

  it('mantém texto normal inalterado', () => {
    expect(sanitizeExcelText('Observação normal')).toBe('Observação normal')
  })
})

describe('buildOperationalPlanningExportWorkbookBuffer', () => {
  it('gera workbook com exatamente as abas Planejamento e Capacidade', async () => {
    const buffer = await buildOperationalPlanningExportWorkbookBuffer({
      meta: sampleMeta(),
      planningRows: [samplePlanningRow()],
      capacityRows: [sampleCapacityRow()],
    })
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    expect(workbook.worksheets.map((ws) => ws.name)).toEqual(['Planejamento', 'Capacidade'])
  })

  it('título é exatamente "SGP+ — Planejamento semanal", em sua própria linha', async () => {
    const buffer = await buildOperationalPlanningExportWorkbookBuffer({
      meta: sampleMeta({ situation: 'PUBLICADO' }),
      planningRows: [samplePlanningRow()],
      capacityRows: [],
    })
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const sheet = workbook.getWorksheet('Planejamento')
    expect(sheet?.getRow(1).getCell(1).value).toBe('SGP+ — Planejamento semanal')
  })

  it('período, situação, geração e totais em linhas próprias na aba Planejamento', async () => {
    const buffer = await buildOperationalPlanningExportWorkbookBuffer({
      meta: sampleMeta({ situation: 'PUBLICADO' }),
      planningRows: [samplePlanningRow()],
      capacityRows: [],
    })
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const sheet = workbook.getWorksheet('Planejamento')
    const periodValue = String(sheet?.getRow(2).getCell(1).value ?? '')
    const situationValue = String(sheet?.getRow(3).getCell(1).value ?? '')
    const generatedValue = String(sheet?.getRow(4).getCell(1).value ?? '')
    const totalsValue = String(sheet?.getRow(5).getCell(1).value ?? '')

    expect(periodValue).toContain('07/09/2026')
    expect(periodValue).toContain('11/09/2026')
    expect(situationValue).toBe('Situação: PUBLICADO')
    expect(generatedValue.startsWith('Gerado em:')).toBe(true)
    expect(totalsValue).toContain('Total de atividades:')
    expect(totalsValue).toContain('Tempo planejado total:')
    expect(totalsValue).toContain('Colaboradores com atividade:')
  })

  it('cabeçalhos da aba Planejamento: lista completa, ordenada e com "Ordem no planejamento"', async () => {
    const buffer = await buildOperationalPlanningExportWorkbookBuffer({
      meta: sampleMeta(),
      planningRows: [samplePlanningRow()],
      capacityRows: [],
    })
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const sheet = workbook.getWorksheet('Planejamento')
    // Header na linha 7 (ver PLANNING_HEADER_ROW).
    const headerRow = sheet?.getRow(7)
    const headers = Array.from({ length: 18 }, (_, idx) =>
      String(headerRow?.getCell(idx + 1).value ?? ''),
    )
    expect(headers).toEqual([
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
    ])
  })

  it('formata "Gerado em" em America/Sao_Paulo independentemente do fuso do processo', async () => {
    // 2026-09-05T14:30:00.000Z = 11:30 em America/Sao_Paulo (UTC-3 nessa data).
    const buffer = await buildOperationalPlanningExportWorkbookBuffer({
      meta: sampleMeta({ generatedAt: new Date('2026-09-05T14:30:00.000Z') }),
      planningRows: [samplePlanningRow()],
      capacityRows: [],
    })
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const sheet = workbook.getWorksheet('Planejamento')
    const generatedValue = String(sheet?.getRow(4).getCell(1).value ?? '')
    expect(generatedValue.startsWith('Gerado em:')).toBe(true)
    expect(generatedValue).toContain('11:30')
    expect(generatedValue).not.toContain('14:30')
  })

  it('grava datas como valores Date reais sem deslocamento de fuso', async () => {
    const buffer = await buildOperationalPlanningExportWorkbookBuffer({
      meta: sampleMeta(),
      planningRows: [samplePlanningRow({ plannedDate: '2026-09-07' })],
      capacityRows: [],
    })
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const sheet = workbook.getWorksheet('Planejamento')
    // Header na linha 7 (ver PLANNING_HEADER_ROW); primeira linha de dados = 8.
    const dateCell = sheet?.getRow(8).getCell(1)
    expect(dateCell?.value).toBeInstanceOf(Date)
    const value = dateCell?.value as Date
    expect(value.getDate()).toBe(7)
    expect(value.getMonth()).toBe(8)
    expect(value.getFullYear()).toBe(2026)
  })

  it('grava prazo da esteira em texto livre (não-ISO) sem interpretar/quebrar como data', async () => {
    const buffer = await buildOperationalPlanningExportWorkbookBuffer({
      meta: sampleMeta(),
      planningRows: [samplePlanningRow({ estimatedDeadline: '15 dias' })],
      capacityRows: [],
    })
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const sheet = workbook.getWorksheet('Planejamento')
    const deadlineCell = sheet?.getRow(8).getCell(10)
    expect(deadlineCell?.value).toBe('15 dias')
    expect(typeof deadlineCell?.value).toBe('string')
  })

  it('protege texto começando com =, +, - ou @ contra reinterpretação como fórmula', async () => {
    const buffer = await buildOperationalPlanningExportWorkbookBuffer({
      meta: sampleMeta(),
      planningRows: [samplePlanningRow({ notes: '=SUM(A1:A9)' })],
      capacityRows: [],
    })
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const sheet = workbook.getWorksheet('Planejamento')
    const notesCell = sheet?.getRow(8).getCell(17)
    expect(notesCell?.value).toBe("'=SUM(A1:A9)")
    expect(typeof notesCell?.value).toBe('string')
  })

  it('não inclui colunas de execução/tempo realizado/excedido/quantidade/tempo unitário', async () => {
    const buffer = await buildOperationalPlanningExportWorkbookBuffer({
      meta: sampleMeta(),
      planningRows: [samplePlanningRow()],
      capacityRows: [sampleCapacityRow()],
    })
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const forbidden = /realizad|excedid|quantidade|unit[áa]rio/i
    for (const sheet of workbook.worksheets) {
      const values = (sheet.getSheetValues() ?? [])
        .flatMap((r) => (Array.isArray(r) ? r : []))
        .map((v) => String(v ?? ''))
      for (const v of values) {
        expect(forbidden.test(v)).toBe(false)
      }
    }
  })

  it('não expõe nenhum UUID em coluna visível', async () => {
    const buffer = await buildOperationalPlanningExportWorkbookBuffer({
      meta: sampleMeta(),
      planningRows: [samplePlanningRow()],
      capacityRows: [sampleCapacityRow()],
    })
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const uuidRe = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
    for (const sheet of workbook.worksheets) {
      const values = (sheet.getSheetValues() ?? [])
        .flatMap((r) => (Array.isArray(r) ? r : []))
        .map((v) => String(v ?? ''))
      for (const v of values) {
        expect(uuidRe.test(v)).toBe(false)
      }
    }
  })

  it('aplica autofiltro e freeze panes no cabeçalho de cada aba', async () => {
    const buffer = await buildOperationalPlanningExportWorkbookBuffer({
      meta: sampleMeta(),
      planningRows: [samplePlanningRow()],
      capacityRows: [sampleCapacityRow()],
    })
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const planning = workbook.getWorksheet('Planejamento')
    const capacity = workbook.getWorksheet('Capacidade')
    expect(planning?.autoFilter).toBeTruthy()
    expect(capacity?.autoFilter).toBeTruthy()
    expect(planning?.views?.[0]).toMatchObject({ state: 'frozen' })
    expect(capacity?.views?.[0]).toMatchObject({ state: 'frozen' })
  })

  it('marca linhas Sobrecarregado/No limite/Capacidade não cadastrada na aba Capacidade', async () => {
    const buffer = await buildOperationalPlanningExportWorkbookBuffer({
      meta: sampleMeta(),
      planningRows: [],
      capacityRows: [
        sampleCapacityRow({
          collaboratorName: 'Ana',
          statusLabel: 'Sobrecarregado',
          balanceMinutes: -30,
          occupancyRatio: 1.1,
        }),
        sampleCapacityRow({
          collaboratorName: 'Bruno',
          statusLabel: 'No limite',
          balanceMinutes: 0,
          occupancyRatio: 1,
        }),
        sampleCapacityRow({
          collaboratorName: 'Carla',
          statusLabel: 'Capacidade não cadastrada',
          capacityMinutes: null,
          balanceMinutes: null,
          occupancyRatio: null,
        }),
      ],
    })
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const sheet = workbook.getWorksheet('Capacidade')
    // Header na linha 3; dados a partir da linha 4.
    expect(sheet?.getRow(4).getCell(3).value).toBe('Ana')
    // Saldo (coluna 6) agora é fórmula auditável — não um número puro.
    expect(sheet?.getRow(4).getCell(6).formula).toBe('(D4-E4)*1440')
    expect(sheet?.getRow(4).getCell(6).result).toBe(-30)
    expect(sheet?.getRow(5).getCell(3).value).toBe('Bruno')
    expect(sheet?.getRow(6).getCell(3).value).toBe('Carla')
    expect(sheet?.getRow(6).getCell(4).value).toBeNull()
    expect(sheet?.getRow(6).getCell(6).value).toBeNull()
    expect(sheet?.getRow(6).getCell(7).value).toBeNull()
  })

  it('capacidade com plannedMinutes = 0 aparece normalmente na aba', async () => {
    const buffer = await buildOperationalPlanningExportWorkbookBuffer({
      meta: sampleMeta(),
      planningRows: [],
      capacityRows: [
        sampleCapacityRow({
          collaboratorName: 'Zero Min',
          plannedMinutes: 0,
          balanceMinutes: 480,
          occupancyRatio: 0,
          statusLabel: 'Disponível',
        }),
      ],
    })
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const sheet = workbook.getWorksheet('Capacidade')
    expect(sheet?.getRow(4).getCell(3).value).toBe('Zero Min')
    // Duração 0 é gravada com numFmt de hora — ExcelJS lê de volta como Date (serial 0).
    expect(sheet?.getRow(4).getCell(5).value).not.toBeNull()
    expect(sheet?.getRow(4).getCell(5).numFmt).toBe('[h]:mm')
  })

  it('Saldo e Ocupação são fórmulas Excel auditáveis (D/E na linha correta) com result pré-calculado', async () => {
    // 660 planejado / 480 capacidade → saldo -180 min, ocupação 137,5%, Sobrecarregado.
    const buffer = await buildOperationalPlanningExportWorkbookBuffer({
      meta: sampleMeta(),
      planningRows: [],
      capacityRows: [
        sampleCapacityRow({
          collaboratorName: 'Overload',
          capacityMinutes: 480,
          plannedMinutes: 660,
          balanceMinutes: -180,
          occupancyRatio: 660 / 480,
          statusLabel: 'Sobrecarregado',
        }),
      ],
    })
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const sheet = workbook.getWorksheet('Capacidade')
    const row = sheet?.getRow(4)

    const balanceCell = row?.getCell(6)
    expect(balanceCell?.formula).toBe('(D4-E4)*1440')
    expect(balanceCell?.result).toBe(-180)
    expect(balanceCell?.numFmt).toBe('0" min";-0" min"')

    const occupancyCell = row?.getCell(7)
    expect(occupancyCell?.formula).toBe('E4/D4')
    expect(occupancyCell?.result).toBeCloseTo(1.375)
    expect(occupancyCell?.numFmt).toBe('0.0%')

    // Situação continua "Sobrecarregado" (sem limiar de 90%) e com destaque vermelho.
    expect(row?.getCell(8).value).toBe('Sobrecarregado')
    const style = row?.getCell(8).fill as { fgColor?: { argb?: string } } | undefined
    expect(style?.fgColor?.argb).toBe('FFF4CCCC')
  })

  it('só Saldo e Ocupação viram fórmula — nenhuma outra célula do arquivo usa {formula}', async () => {
    const buffer = await buildOperationalPlanningExportWorkbookBuffer({
      meta: sampleMeta(),
      planningRows: [samplePlanningRow({ notes: '=SUM(A1:A9)' })],
      capacityRows: [
        sampleCapacityRow({ balanceMinutes: -30, occupancyRatio: 1.1, statusLabel: 'Sobrecarregado' }),
      ],
    })
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    for (const sheet of workbook.worksheets) {
      sheet.eachRow((row) => {
        row.eachCell((cell, colNumber) => {
          if (!cell.formula) return
          const isKnownFormulaCell = sheet.name === 'Capacidade' && (colNumber === 6 || colNumber === 7)
          expect(isKnownFormulaCell).toBe(true)
        })
      })
    }
  })
})
