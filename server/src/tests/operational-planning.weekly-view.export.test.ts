import { describe, expect, it } from 'vitest'
import ExcelJS from 'exceljs'
import {
  buildOperationalPlanningWeeklyViewExportFilename,
  buildOperationalPlanningWeeklyViewExportWorkbookBuffer,
  excelDateFromIso,
  formatDurationHhMm,
  formatWeeklyViewActivityCellContent,
  formatWeeklyViewActivityCellLabel,
  formatWeeklyViewPlannedDurationLabel,
  sanitizeExcelText,
  sortOperationalPlanningWeeklyViewRows,
  weeklyViewWeekdayDates,
  type OperationalPlanningWeeklyViewExportMeta,
  type OperationalPlanningWeeklyViewExportRow,
} from '../modules/operational-planning/operational-planning.weekly-view.export.js'

function sampleMeta(
  partial: Partial<OperationalPlanningWeeklyViewExportMeta> = {},
): OperationalPlanningWeeklyViewExportMeta {
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

function sampleRow(
  partial: Partial<OperationalPlanningWeeklyViewExportRow> = {},
): OperationalPlanningWeeklyViewExportRow {
  return {
    id: 'item-1',
    collaboratorId: 'col-1',
    collaboratorName: 'Maria Silva',
    plannedDate: '2026-09-07',
    plannedOrder: 0,
    plannedMinutes: 60,
    conveyorTitle: null,
    activityTitle: 'Atividade A',
    notes: 'Observação',
    ...partial,
  }
}

describe('buildOperationalPlanningWeeklyViewExportFilename', () => {
  it('gera nome com slug correto para os 3 estados', () => {
    expect(
      buildOperationalPlanningWeeklyViewExportFilename('2026-09-07', '2026-09-11', 'PUBLICADO'),
    ).toBe('planejamento-semanal-visao-2026-09-07-a-2026-09-11-publicado.xlsx')
    expect(
      buildOperationalPlanningWeeklyViewExportFilename('2026-09-07', '2026-09-11', 'RASCUNHO'),
    ).toBe('planejamento-semanal-visao-2026-09-07-a-2026-09-11-rascunho.xlsx')
    expect(
      buildOperationalPlanningWeeklyViewExportFilename(
        '2026-09-07',
        '2026-09-11',
        'REVISAO_NAO_PUBLICADA',
      ),
    ).toBe('planejamento-semanal-visao-2026-09-07-a-2026-09-11-revisao-nao-publicada.xlsx')
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

describe('weeklyViewWeekdayDates', () => {
  it('gera as 5 datas civis de segunda a sexta a partir do weekStartDate', () => {
    expect(weeklyViewWeekdayDates('2026-09-07')).toEqual([
      '2026-09-07',
      '2026-09-08',
      '2026-09-09',
      '2026-09-10',
      '2026-09-11',
    ])
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

describe('formatWeeklyViewActivityCellLabel', () => {
  it('compõe descrição — atividade quando ambos existem (helper legado)', () => {
    expect(
      formatWeeklyViewActivityCellLabel(
        'Reforma dos bancos do veículo',
        'Retirada do revestimento',
      ),
    ).toBe('Reforma dos bancos do veículo — Retirada do revestimento')
  })
})

describe('formatWeeklyViewPlannedDurationLabel', () => {
  it('formata 0 min, minutos, horas e combinação h+mm', () => {
    expect(formatWeeklyViewPlannedDurationLabel(0)).toBe('0 min')
    expect(formatWeeklyViewPlannedDurationLabel(5)).toBe('5 min')
    expect(formatWeeklyViewPlannedDurationLabel(30)).toBe('30 min')
    expect(formatWeeklyViewPlannedDurationLabel(60)).toBe('1h')
    expect(formatWeeklyViewPlannedDurationLabel(65)).toBe('1h05 min')
    expect(formatWeeklyViewPlannedDurationLabel(90)).toBe('1h30 min')
    expect(formatWeeklyViewPlannedDurationLabel(120)).toBe('2h')
    expect(formatWeeklyViewPlannedDurationLabel(135)).toBe('2h15 min')
    expect(formatWeeklyViewPlannedDurationLabel(630)).toBe('10h30 min')
  })

  it('usa o mesmo valor de minutos que formatDurationHhMm (fonte única)', () => {
    for (const minutes of [0, 5, 30, 60, 65, 90, 120, 135, 600, 1500, null, undefined, -10]) {
      const hhmm = formatDurationHhMm(minutes as number | null | undefined)
      const [hStr, mStr] = hhmm.split(':')
      const fromHhMm = Number(hStr) * 60 + Number(mStr)
      const normalized =
        typeof minutes === 'number' && Number.isFinite(minutes) && minutes > 0
          ? Math.floor(minutes)
          : 0
      expect(fromHhMm).toBe(normalized)
      expect(formatWeeklyViewPlannedDurationLabel(minutes as number | null | undefined)).toBeTruthy()
    }
  })

  it('trata nulo/inválido como 0 min', () => {
    expect(formatWeeklyViewPlannedDurationLabel(null)).toBe('0 min')
    expect(formatWeeklyViewPlannedDurationLabel(undefined)).toBe('0 min')
    expect(formatWeeklyViewPlannedDurationLabel(Number.NaN)).toBe('0 min')
    expect(formatWeeklyViewPlannedDurationLabel(-30)).toBe('0 min')
  })
})

describe('formatDurationHhMm', () => {
  it('permanece disponível e estável (fonte do valor em minutos)', () => {
    expect(formatDurationHhMm(60)).toBe('1:00')
    expect(formatDurationHhMm(45)).toBe('0:45')
    expect(formatDurationHhMm(600)).toBe('10:00')
    expect(formatDurationHhMm(1500)).toBe('25:00')
    expect(formatDurationHhMm(null)).toBe('0:00')
  })
})

describe('formatWeeklyViewActivityCellContent', () => {
  it('gera três linhas quando existe nome da esteira', () => {
    expect(
      formatWeeklyViewActivityCellContent(
        0,
        'Reforma dos bancos do veículo',
        'Retirada do revestimento',
        90,
      ),
    ).toBe(
      '1º Reforma dos bancos do veículo\nRetirada do revestimento\nTempo planejado: 1h30 min',
    )
  })

  it('gera duas linhas quando a esteira está ausente/vazia/só espaços', () => {
    expect(formatWeeklyViewActivityCellContent(0, null, 'Retirada', 60)).toBe(
      '1º Retirada\nTempo planejado: 1h',
    )
    expect(formatWeeklyViewActivityCellContent(0, undefined, 'Retirada', 60)).toBe(
      '1º Retirada\nTempo planejado: 1h',
    )
    expect(formatWeeklyViewActivityCellContent(0, '', 'Retirada', 30)).toBe(
      '1º Retirada\nTempo planejado: 30 min',
    )
    expect(formatWeeklyViewActivityCellContent(0, '   ', 'Retirada', 5)).toBe(
      '1º Retirada\nTempo planejado: 5 min',
    )
  })

  it('não gera linha vazia no lugar da esteira e aplica trim', () => {
    const text = formatWeeklyViewActivityCellContent(1, '  Esteira X  ', '  Atividade Y  ', 65)
    expect(text).toBe('2º Esteira X\nAtividade Y\nTempo planejado: 1h05 min')
    expect(text.split('\n')).toHaveLength(3)
    expect(text.split('\n').some((line) => line.trim() === '')).toBe(false)
  })

  it('preserva acentos', () => {
    expect(
      formatWeeklyViewActivityCellContent(0, 'Revisão do assento', 'Remoção do revestimento', 60),
    ).toBe('1º Revisão do assento\nRemoção do revestimento\nTempo planejado: 1h')
  })
})

describe('sortOperationalPlanningWeeklyViewRows', () => {
  it('ordena por colaborador → data → plannedOrder → id, com não atribuído ao final', () => {
    const rows: OperationalPlanningWeeklyViewExportRow[] = [
      sampleRow({ id: 'z', collaboratorId: null, collaboratorName: null, plannedDate: '2026-09-07' }),
      sampleRow({ id: 'b', collaboratorId: 'col-b', collaboratorName: 'Bruno', plannedDate: '2026-09-08' }),
      sampleRow({
        id: 'a2',
        collaboratorId: 'col-a',
        collaboratorName: 'Ana',
        plannedDate: '2026-09-08',
        plannedOrder: 1,
      }),
      sampleRow({
        id: 'a1',
        collaboratorId: 'col-a',
        collaboratorName: 'Ana',
        plannedDate: '2026-09-07',
        plannedOrder: 0,
      }),
    ]
    const sorted = sortOperationalPlanningWeeklyViewRows(rows)
    expect(sorted.map((r) => r.id)).toEqual(['a1', 'a2', 'b', 'z'])
  })

  it('desempata por id quando colaborador, data e ordem são iguais', () => {
    const rows: OperationalPlanningWeeklyViewExportRow[] = [
      sampleRow({ id: 'zzz', collaboratorId: 'col-a', plannedDate: '2026-09-07', plannedOrder: 0 }),
      sampleRow({ id: 'aaa', collaboratorId: 'col-a', plannedDate: '2026-09-07', plannedOrder: 0 }),
    ]
    const sorted = sortOperationalPlanningWeeklyViewRows(rows)
    expect(sorted.map((r) => r.id)).toEqual(['aaa', 'zzz'])
  })
})

describe('buildOperationalPlanningWeeklyViewExportWorkbookBuffer', () => {
  it('gera workbook com EXATAMENTE 1 aba "Visão semanal"', async () => {
    const buffer = await buildOperationalPlanningWeeklyViewExportWorkbookBuffer({
      meta: sampleMeta(),
      rows: [sampleRow()],
    })
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    expect(workbook.worksheets.map((ws) => ws.name)).toEqual(['Visão semanal'])
  })

  it('título/período/situação/geração/totais em linhas próprias', async () => {
    const buffer = await buildOperationalPlanningWeeklyViewExportWorkbookBuffer({
      meta: sampleMeta({ situation: 'PUBLICADO' }),
      rows: [sampleRow()],
    })
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const sheet = workbook.getWorksheet('Visão semanal')
    expect(sheet?.getRow(1).getCell(1).value).toBe('SGP+ — Planejamento semanal')
    const periodValue = String(sheet?.getRow(2).getCell(1).value ?? '')
    expect(periodValue).toContain('07/09/2026')
    expect(periodValue).toContain('11/09/2026')
    expect(sheet?.getRow(3).getCell(1).value).toBe('Situação: PUBLICADO')
    const generatedValue = String(sheet?.getRow(4).getCell(1).value ?? '')
    expect(generatedValue.startsWith('Gerado em:')).toBe(true)
    const totalsValue = String(sheet?.getRow(5).getCell(1).value ?? '')
    expect(totalsValue).toContain('Total de atividades:')
    expect(totalsValue).toContain('Tempo planejado total:')
    expect(totalsValue).toContain('Colaboradores com atividade:')
  })

  it('formata "Gerado em" em America/Sao_Paulo independentemente do fuso do processo', async () => {
    const buffer = await buildOperationalPlanningWeeklyViewExportWorkbookBuffer({
      meta: sampleMeta({ generatedAt: new Date('2026-09-05T14:30:00.000Z') }),
      rows: [sampleRow()],
    })
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const sheet = workbook.getWorksheet('Visão semanal')
    const generatedValue = String(sheet?.getRow(4).getCell(1).value ?? '')
    expect(generatedValue).toContain('11:30')
    expect(generatedValue).not.toContain('14:30')
  })

  it('lista exata das 7 colunas, com quebra de linha literal nos cabeçalhos de dia', async () => {
    const buffer = await buildOperationalPlanningWeeklyViewExportWorkbookBuffer({
      meta: sampleMeta(),
      rows: [sampleRow()],
    })
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const sheet = workbook.getWorksheet('Visão semanal')
    const headerRow = sheet?.getRow(7)
    const headers = Array.from({ length: 7 }, (_, idx) => String(headerRow?.getCell(idx + 1).value ?? ''))
    expect(headers).toEqual([
      'Colaborador',
      'Segunda-feira\n07/09/2026',
      'Terça-feira\n08/09/2026',
      'Quarta-feira\n09/09/2026',
      'Quinta-feira\n10/09/2026',
      'Sexta-feira\n11/09/2026',
      'Observações',
    ])
    expect(headers[1]).toContain('\n')
  })

  it('atividade de segunda só na coluna de segunda — demais colunas de dia vazias na linha', async () => {
    const buffer = await buildOperationalPlanningWeeklyViewExportWorkbookBuffer({
      meta: sampleMeta(),
      rows: [sampleRow({ plannedDate: '2026-09-07', activityTitle: 'Atividade Segunda' })],
    })
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const sheet = workbook.getWorksheet('Visão semanal')
    const dataRow = sheet?.getRow(8)
    expect(String(dataRow?.getCell(2).value ?? '')).toContain('Atividade Segunda')
    expect(dataRow?.getCell(3).value ?? null).toBeFalsy()
    expect(dataRow?.getCell(4).value ?? null).toBeFalsy()
    expect(dataRow?.getCell(5).value ?? null).toBeFalsy()
    expect(dataRow?.getCell(6).value ?? null).toBeFalsy()
  })

  it('atividade de terça só na coluna de terça', async () => {
    const buffer = await buildOperationalPlanningWeeklyViewExportWorkbookBuffer({
      meta: sampleMeta(),
      rows: [sampleRow({ plannedDate: '2026-09-08', activityTitle: 'Atividade Terça' })],
    })
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const sheet = workbook.getWorksheet('Visão semanal')
    const dataRow = sheet?.getRow(8)
    expect(dataRow?.getCell(2).value ?? null).toBeFalsy()
    expect(String(dataRow?.getCell(3).value ?? '')).toContain('Atividade Terça')
    expect(dataRow?.getCell(4).value ?? null).toBeFalsy()
  })

  it('2 atividades do mesmo colaborador no mesmo dia geram 2 linhas físicas distintas', async () => {
    const buffer = await buildOperationalPlanningWeeklyViewExportWorkbookBuffer({
      meta: sampleMeta(),
      rows: [
        sampleRow({
          id: 'i1',
          plannedDate: '2026-09-07',
          plannedOrder: 0,
          conveyorTitle: 'Nome da esteira',
          activityTitle: 'Primeira atividade',
          plannedMinutes: 90,
          notes: 'Nota 1',
        }),
        sampleRow({
          id: 'i2',
          plannedDate: '2026-09-07',
          plannedOrder: 1,
          conveyorTitle: 'Outra esteira',
          activityTitle: 'Segunda atividade',
          plannedMinutes: 45,
          notes: 'Nota 2',
        }),
      ],
    })
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const sheet = workbook.getWorksheet('Visão semanal')
    const row1 = String(sheet?.getRow(8).getCell(2).value ?? '')
    const row2 = String(sheet?.getRow(9).getCell(2).value ?? '')
    expect(row1).toBe(
      '1º Nome da esteira\nPrimeira atividade\nTempo planejado: 1h30 min',
    )
    expect(row2).toBe(
      '2º Outra esteira\nSegunda atividade\nTempo planejado: 45 min',
    )
    expect(row1.includes('Segunda atividade')).toBe(false)
    expect(row2.includes('Primeira atividade')).toBe(false)
    expect(String(sheet?.getRow(8).getCell(7).value ?? '')).toBe('Nota 1')
    expect(String(sheet?.getRow(9).getCell(7).value ?? '')).toBe('Nota 2')
    // quantidade de linhas de dados = quantidade de itens
    expect(sheet?.getRow(10).getCell(1).value ?? null).toBeFalsy()
  })

  it('quantidade de linhas de dados permanece igual à quantidade de itens exportados', async () => {
    const rows = [
      sampleRow({ id: 'a', collaboratorId: 'col-a', collaboratorName: 'Ana', plannedDate: '2026-09-07' }),
      sampleRow({ id: 'b', collaboratorId: 'col-a', collaboratorName: 'Ana', plannedDate: '2026-09-08' }),
      sampleRow({ id: 'c', collaboratorId: 'col-b', collaboratorName: 'Bruno', plannedDate: '2026-09-07' }),
    ]
    const buffer = await buildOperationalPlanningWeeklyViewExportWorkbookBuffer({
      meta: sampleMeta(),
      rows,
    })
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const sheet = workbook.getWorksheet('Visão semanal')
    expect(String(sheet?.getRow(8).getCell(1).value ?? '')).toBe('Ana')
    expect(String(sheet?.getRow(9).getCell(1).value ?? '')).toBe('Ana')
    expect(String(sheet?.getRow(10).getCell(1).value ?? '')).toBe('Bruno')
    expect(sheet?.getRow(11).getCell(1).value ?? null).toBeFalsy()
  })

  it('preserva bordas de início/continuidade e alternância visual de blocos da base', async () => {
    const buffer = await buildOperationalPlanningWeeklyViewExportWorkbookBuffer({
      meta: sampleMeta(),
      rows: [
        sampleRow({ id: 'a1', collaboratorId: 'col-a', collaboratorName: 'Ana', plannedDate: '2026-09-07' }),
        sampleRow({ id: 'a2', collaboratorId: 'col-a', collaboratorName: 'Ana', plannedDate: '2026-09-08' }),
        sampleRow({ id: 'b1', collaboratorId: 'col-b', collaboratorName: 'Bruno', plannedDate: '2026-09-07' }),
      ],
    })
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const sheet = workbook.getWorksheet('Visão semanal')
    const r8 = sheet?.getRow(8).getCell(1)
    const r9 = sheet?.getRow(9).getCell(1)
    const r10 = sheet?.getRow(10).getCell(1)
    expect(r8?.border?.top?.style).toBe('medium')
    expect(r9?.border?.top?.style).toBe('thin')
    expect(r10?.border?.top?.style).toBe('medium')
    // bloco 0 (Ana) sem fill alt; bloco 1 (Bruno) com fill alt
    const fillArgb = (cell: ExcelJS.Cell | undefined) =>
      (cell?.fill as ExcelJS.FillPattern | undefined)?.fgColor?.argb
    expect(fillArgb(r8)).not.toBe('FFF3F4F6')
    expect(fillArgb(r9)).not.toBe('FFF3F4F6')
    expect(fillArgb(r10)).toBe('FFF3F4F6')
  })

  it('célula do dia com esteira em 3 linhas na mesma coluna (sem coluna nova)', async () => {
    const buffer = await buildOperationalPlanningWeeklyViewExportWorkbookBuffer({
      meta: sampleMeta(),
      rows: [
        sampleRow({
          plannedDate: '2026-09-07',
          conveyorTitle: 'Reforma dos bancos do veículo',
          activityTitle: 'Retirada do revestimento',
          plannedMinutes: 60,
        }),
      ],
    })
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const sheet = workbook.getWorksheet('Visão semanal')
    const headerRow = sheet?.getRow(7)
    const headers = Array.from({ length: 7 }, (_, idx) => String(headerRow?.getCell(idx + 1).value ?? ''))
    expect(headers).toHaveLength(7)
    expect(headers[0]).toBe('Colaborador')
    expect(headers[6]).toBe('Observações')
    const cell = String(sheet?.getRow(8).getCell(2).value ?? '')
    expect(cell).toBe(
      '1º Reforma dos bancos do veículo\nRetirada do revestimento\nTempo planejado: 1h',
    )
  })

  it('descrição ausente/vazia na célula → duas linhas (atividade + tempo), sem linha vazia', async () => {
    const buffer = await buildOperationalPlanningWeeklyViewExportWorkbookBuffer({
      meta: sampleMeta(),
      rows: [
        sampleRow({
          id: 'a',
          collaboratorId: 'c1',
          collaboratorName: 'A',
          plannedDate: '2026-09-07',
          conveyorTitle: null,
          activityTitle: 'Só atividade',
          plannedMinutes: 30,
        }),
        sampleRow({
          id: 'b',
          collaboratorId: 'c2',
          collaboratorName: 'B',
          plannedDate: '2026-09-07',
          conveyorTitle: '   ',
          activityTitle: '  Outra  ',
          plannedMinutes: 120,
        }),
      ],
    })
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const sheet = workbook.getWorksheet('Visão semanal')
    const a = String(sheet?.getRow(8).getCell(2).value ?? '')
    const b = String(sheet?.getRow(9).getCell(2).value ?? '')
    expect(a).toBe('1º Só atividade\nTempo planejado: 30 min')
    expect(b).toBe('1º Outra\nTempo planejado: 2h')
    expect(a.split('\n').some((line) => line.trim() === '')).toBe(false)
    expect(b.split('\n').some((line) => line.trim() === '')).toBe(false)
  })

  it('aplica wrapText e altura suficiente para todas as linhas da célula', async () => {
    const buffer = await buildOperationalPlanningWeeklyViewExportWorkbookBuffer({
      meta: sampleMeta(),
      rows: [
        sampleRow({
          plannedDate: '2026-09-07',
          conveyorTitle: 'Esteira',
          activityTitle: 'Atividade',
          plannedMinutes: 90,
        }),
      ],
    })
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const sheet = workbook.getWorksheet('Visão semanal')
    const dataRow = sheet?.getRow(8)
    const dayCell = dataRow?.getCell(2)
    expect(dayCell?.alignment?.wrapText).toBe(true)
    expect(dayCell?.alignment?.vertical).toBe('top')
    const lines = String(dayCell?.value ?? '').split('\n').length
    expect(lines).toBe(3)
    expect(dataRow?.height ?? 0).toBeGreaterThanOrEqual(lines * 15)
  })

  it('altura da linha física é individual e comporta o texto multilinha da própria célula', async () => {
    const buffer = await buildOperationalPlanningWeeklyViewExportWorkbookBuffer({
      meta: sampleMeta(),
      rows: [
        sampleRow({
          id: 'with-conveyor',
          collaboratorId: 'col-a',
          collaboratorName: 'Ana',
          plannedDate: '2026-09-07',
          conveyorTitle: 'Esteira',
          activityTitle: 'Atividade',
          plannedMinutes: 90,
        }),
        sampleRow({
          id: 'no-conveyor',
          collaboratorId: 'col-a',
          collaboratorName: 'Ana',
          plannedDate: '2026-09-08',
          conveyorTitle: null,
          activityTitle: 'Só atividade',
          plannedMinutes: 30,
        }),
      ],
    })
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const sheet = workbook.getWorksheet('Visão semanal')
    const rowWith = sheet?.getRow(8)
    const rowWithout = sheet?.getRow(9)
    const linesWith = String(rowWith?.getCell(2).value ?? '').split('\n').length
    const linesWithout = String(rowWithout?.getCell(3).value ?? '').split('\n').length
    expect(linesWith).toBe(3)
    expect(linesWithout).toBe(2)
    expect(rowWith?.height ?? 0).toBeGreaterThanOrEqual(linesWith * 15)
    expect(rowWithout?.height ?? 0).toBeGreaterThanOrEqual(linesWithout * 15)
    // linhas físicas distintas — altura não agrega atividades do colaborador
    expect(rowWithout?.height ?? 0).toBeLessThan(rowWith?.height ?? 0)
  })

  it('preserva proteção contra fórmula em observações após formatação multilinha', async () => {
    const buffer = await buildOperationalPlanningWeeklyViewExportWorkbookBuffer({
      meta: sampleMeta(),
      rows: [
        sampleRow({
          plannedDate: '2026-09-07',
          conveyorTitle: 'Esteira',
          activityTitle: 'Atividade',
          notes: '=CMD()',
        }),
      ],
    })
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const sheet = workbook.getWorksheet('Visão semanal')
    expect(String(sheet?.getRow(8).getCell(7).value ?? '')).toBe("'=CMD()")
    expect(String(sheet?.getRow(8).getCell(2).value ?? '')).toContain('Esteira')
    expect(String(sheet?.getRow(8).getCell(2).value ?? '')).toContain('Atividade')
  })

  it('ordem exibida como 1º/2º (plannedOrder + 1)', async () => {
    const buffer = await buildOperationalPlanningWeeklyViewExportWorkbookBuffer({
      meta: sampleMeta(),
      rows: [sampleRow({ plannedOrder: 4, plannedDate: '2026-09-07' })],
    })
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const sheet = workbook.getWorksheet('Visão semanal')
    expect(String(sheet?.getRow(8).getCell(2).value ?? '')).toContain('5º')
  })

  it('duração embutida usa rótulo textual — 60→1h, 45→45 min, 600→10h, 1500→25h', async () => {
    const buffer = await buildOperationalPlanningWeeklyViewExportWorkbookBuffer({
      meta: sampleMeta(),
      rows: [
        sampleRow({ id: 'a', collaboratorId: 'col-a', collaboratorName: 'A', plannedDate: '2026-09-07', plannedMinutes: 60 }),
        sampleRow({ id: 'b', collaboratorId: 'col-b', collaboratorName: 'B', plannedDate: '2026-09-07', plannedMinutes: 45 }),
        sampleRow({ id: 'c', collaboratorId: 'col-c', collaboratorName: 'C', plannedDate: '2026-09-07', plannedMinutes: 600 }),
        sampleRow({ id: 'd', collaboratorId: 'col-d', collaboratorName: 'D', plannedDate: '2026-09-07', plannedMinutes: 1500 }),
      ],
    })
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const sheet = workbook.getWorksheet('Visão semanal')
    const values = Array.from({ length: 4 }, (_, i) => String(sheet?.getRow(8 + i).getCell(2).value ?? ''))
    expect(values.some((v) => v.includes('Tempo planejado: 1h'))).toBe(true)
    expect(values.some((v) => v.includes('Tempo planejado: 45 min'))).toBe(true)
    expect(values.some((v) => v.includes('Tempo planejado: 10h'))).toBe(true)
    expect(values.some((v) => v.includes('Tempo planejado: 25h'))).toBe(true)
    expect(values.every((v) => !/\d+:\d{2}/.test(v))).toBe(true)
  })

  it('observação correta por linha; observação ausente vira —', async () => {
    const buffer = await buildOperationalPlanningWeeklyViewExportWorkbookBuffer({
      meta: sampleMeta(),
      rows: [
        sampleRow({ id: 'a', collaboratorId: 'col-a', collaboratorName: 'A', notes: 'Nota da atividade' }),
        sampleRow({ id: 'b', collaboratorId: 'col-b', collaboratorName: 'B', notes: null }),
        sampleRow({ id: 'c', collaboratorId: 'col-c', collaboratorName: 'C', notes: '   ' }),
      ],
    })
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const sheet = workbook.getWorksheet('Visão semanal')
    const notesValues = Array.from({ length: 3 }, (_, i) => String(sheet?.getRow(8 + i).getCell(7).value ?? ''))
    expect(notesValues).toEqual(['Nota da atividade', '—', '—'])
  })

  it('"Não atribuído" quando o item não tem colaborador — e fica ao final da ordenação', async () => {
    const buffer = await buildOperationalPlanningWeeklyViewExportWorkbookBuffer({
      meta: sampleMeta(),
      rows: [
        sampleRow({ id: 'a', collaboratorId: 'col-a', collaboratorName: 'Ana' }),
        sampleRow({ id: 'z', collaboratorId: null, collaboratorName: null }),
      ],
    })
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const sheet = workbook.getWorksheet('Visão semanal')
    expect(sheet?.getRow(8).getCell(1).value).toBe('Ana')
    expect(sheet?.getRow(9).getCell(1).value).toBe('Não atribuído')
  })

  it('protege texto começando com =, +, - ou @ contra reinterpretação como fórmula', async () => {
    const buffer = await buildOperationalPlanningWeeklyViewExportWorkbookBuffer({
      meta: sampleMeta(),
      rows: [sampleRow({ notes: '=SUM(A1:A9)', collaboratorName: '+Nome' })],
    })
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const sheet = workbook.getWorksheet('Visão semanal')
    expect(sheet?.getRow(8).getCell(7).value).toBe("'=SUM(A1:A9)")
    expect(sheet?.getRow(8).getCell(1).value).toBe("'+Nome")
  })

  it('ZERO fórmulas em qualquer célula do workbook', async () => {
    const buffer = await buildOperationalPlanningWeeklyViewExportWorkbookBuffer({
      meta: sampleMeta(),
      rows: [sampleRow({ notes: '=SUM(A1:A9)' })],
    })
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    for (const sheet of workbook.worksheets) {
      sheet.eachRow((row) => {
        row.eachCell((cell) => {
          expect(cell.formula).toBeFalsy()
        })
      })
    }
  })

  it('não expõe nenhum UUID em coluna visível', async () => {
    const buffer = await buildOperationalPlanningWeeklyViewExportWorkbookBuffer({
      meta: sampleMeta(),
      rows: [
        sampleRow({
          id: '11111111-1111-1111-1111-111111111111',
          collaboratorId: '22222222-2222-2222-2222-222222222222',
        }),
      ],
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

  it('não inclui dados de execução/apontamento/tempo realizado/quantidade executada', async () => {
    const buffer = await buildOperationalPlanningWeeklyViewExportWorkbookBuffer({
      meta: sampleMeta(),
      rows: [sampleRow()],
    })
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const forbidden = /realizad|excedid|quantidade executada|apontamento/i
    for (const sheet of workbook.worksheets) {
      const values = (sheet.getSheetValues() ?? [])
        .flatMap((r) => (Array.isArray(r) ? r : []))
        .map((v) => String(v ?? ''))
      for (const v of values) {
        expect(forbidden.test(v)).toBe(false)
      }
    }
  })

  it('aplica autofiltro, freeze panes na linha 7 e pageSetup paisagem', async () => {
    const buffer = await buildOperationalPlanningWeeklyViewExportWorkbookBuffer({
      meta: sampleMeta(),
      rows: [sampleRow()],
    })
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const sheet = workbook.getWorksheet('Visão semanal')
    expect(sheet?.autoFilter).toBeTruthy()
    expect(sheet?.views?.[0]).toMatchObject({ state: 'frozen', ySplit: 7 })
    expect(sheet?.pageSetup?.orientation).toBe('landscape')
    expect(sheet?.pageSetup?.fitToWidth).toBe(1)
    expect(sheet?.pageSetup?.fitToHeight).toBe(0)
  })

  it('nenhuma aba oculta', async () => {
    const buffer = await buildOperationalPlanningWeeklyViewExportWorkbookBuffer({
      meta: sampleMeta(),
      rows: [sampleRow()],
    })
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    for (const sheet of workbook.worksheets) {
      expect(sheet.state ?? 'visible').toBe('visible')
    }
  })
})
