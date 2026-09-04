import { describe, expect, it } from 'vitest'
import ExcelJS from 'exceljs'
import {
  buildOperationalPlanningWeeklyViewExportFilename,
  buildOperationalPlanningWeeklyViewExportWorkbookBuffer,
  countCellTextLines,
  countWeeklyViewActivityBlocksInCell,
  excelDateFromIso,
  EXCEL_MAX_ROW_HEIGHT_PT,
  formatDurationHhMm,
  formatWeeklyViewActivityCellContent,
  formatWeeklyViewActivityCellLabel,
  formatWeeklyViewConsolidatedNotes,
  formatWeeklyViewPlannedDurationLabel,
  groupWeeklyViewRowsByCollaborator,
  joinWeeklyViewDayCellActivityBlocks,
  resolveWeeklyViewDataCellFontSize,
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

function buildVolumeRowsForAdmin(): OperationalPlanningWeeklyViewExportRow[] {
  const days = [
    { date: '2026-09-07', count: 14 },
    { date: '2026-09-08', count: 3 },
    { date: '2026-09-09', count: 8 },
    { date: '2026-09-10', count: 12 },
    { date: '2026-09-11', count: 7 },
  ]
  const rows: OperationalPlanningWeeklyViewExportRow[] = []
  for (const day of days) {
    for (let i = 0; i < day.count; i += 1) {
      rows.push(
        sampleRow({
          id: `admin-${day.date}-${i}`,
          collaboratorId: 'admin',
          collaboratorName: 'Admin',
          plannedDate: day.date,
          plannedOrder: i,
          conveyorTitle: `OS 6995`,
          activityTitle: `Atividade ${day.date} #${i + 1}`,
          plannedMinutes: 15 + (i % 4) * 15,
          notes: i === 2 && day.date === '2026-09-07' ? 'Aguardar confirmação do cliente' : null,
        }),
      )
    }
  }
  return rows
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
  })

  it('usa o mesmo valor de minutos que formatDurationHhMm', () => {
    for (const minutes of [0, 5, 30, 60, 65, 90, 120, 135, 600, null, undefined]) {
      const hhmm = formatDurationHhMm(minutes as number | null | undefined)
      const [hStr, mStr] = hhmm.split(':')
      const fromHhMm = Number(hStr) * 60 + Number(mStr)
      const normalized =
        typeof minutes === 'number' && Number.isFinite(minutes) && minutes > 0
          ? Math.floor(minutes)
          : 0
      expect(fromHhMm).toBe(normalized)
    }
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

  it('gera duas linhas quando a esteira está ausente', () => {
    expect(formatWeeklyViewActivityCellContent(0, null, 'Retirada', 60)).toBe(
      '1º Retirada\nTempo planejado: 1h',
    )
    expect(formatWeeklyViewActivityCellContent(0, '   ', 'Retirada', 30)).toBe(
      '1º Retirada\nTempo planejado: 30 min',
    )
  })

  it('preserva acentos e aplica trim', () => {
    expect(
      formatWeeklyViewActivityCellContent(0, '  Revisão  ', '  Remoção  ', 60),
    ).toBe('1º Revisão\nRemoção\nTempo planejado: 1h')
  })
})

describe('joinWeeklyViewDayCellActivityBlocks', () => {
  it('une várias atividades na mesma célula sem linha em branco entre elas', () => {
    const joined = joinWeeklyViewDayCellActivityBlocks([
      formatWeeklyViewActivityCellContent(0, 'OS 6995', 'Corte do novo tecido', 15),
      formatWeeklyViewActivityCellContent(1, 'OS 6995', 'Aplicação de cola no teto e no tecido', 30),
      formatWeeklyViewActivityCellContent(2, 'OS 6995', 'Revestir o teto com tecido novo', 80),
    ])
    expect(joined).toBe(
      [
        '1º OS 6995',
        'Corte do novo tecido',
        'Tempo planejado: 15 min',
        '2º OS 6995',
        'Aplicação de cola no teto e no tecido',
        'Tempo planejado: 30 min',
        '3º OS 6995',
        'Revestir o teto com tecido novo',
        'Tempo planejado: 1h20 min',
      ].join('\n'),
    )
    expect(joined.includes('\n\n')).toBe(false)
  })
})

describe('groupWeeklyViewRowsByCollaborator', () => {
  it('agrupa por collaboratorId consecutivo sem perder itens', () => {
    const sorted = sortOperationalPlanningWeeklyViewRows([
      sampleRow({ id: 'a1', collaboratorId: 'a', collaboratorName: 'Ana', plannedDate: '2026-09-07' }),
      sampleRow({ id: 'a2', collaboratorId: 'a', collaboratorName: 'Ana', plannedDate: '2026-09-08' }),
      sampleRow({ id: 'b1', collaboratorId: 'b', collaboratorName: 'Bruno', plannedDate: '2026-09-07' }),
      sampleRow({ id: 'z', collaboratorId: null, collaboratorName: null, plannedDate: '2026-09-07' }),
    ])
    const groups = groupWeeklyViewRowsByCollaborator(sorted)
    expect(groups).toHaveLength(3)
    expect(groups[0]!.map((r) => r.id)).toEqual(['a1', 'a2'])
    expect(groups[1]!.map((r) => r.id)).toEqual(['b1'])
    expect(groups[2]!.map((r) => r.id)).toEqual(['z'])
  })
})

describe('formatWeeklyViewConsolidatedNotes', () => {
  it('identifica dia e ordem; ignora vazias; — quando nenhuma', () => {
    const group = [
      sampleRow({
        plannedDate: '2026-09-07',
        plannedOrder: 2,
        notes: 'Aguardar confirmação do cliente',
      }),
      sampleRow({
        id: '2',
        plannedDate: '2026-09-09',
        plannedOrder: 0,
        notes: 'Utilizar material separado',
      }),
      sampleRow({
        id: '3',
        plannedDate: '2026-09-11',
        plannedOrder: 1,
        notes: '   ',
      }),
      sampleRow({
        id: '4',
        plannedDate: '2026-09-11',
        plannedOrder: 2,
        notes: 'Conferir acabamento',
      }),
    ]
    expect(formatWeeklyViewConsolidatedNotes(group, '2026-09-07')).toBe(
      [
        'Segunda 3º — Aguardar confirmação do cliente',
        'Quarta 1º — Utilizar material separado',
        'Sexta 3º — Conferir acabamento',
      ].join('\n'),
    )
    expect(formatWeeklyViewConsolidatedNotes([sampleRow({ notes: null })], '2026-09-07')).toBe(
      '—',
    )
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
})

describe('resolveWeeklyViewDataCellFontSize / altura', () => {
  it('reduz fonte até 8pt e nunca ultrapassa o limite do Excel na altura calculada', () => {
    expect(resolveWeeklyViewDataCellFontSize(3)).toBe(11)
    const sizeForDense = resolveWeeklyViewDataCellFontSize(42)
    expect(sizeForDense).toBeGreaterThanOrEqual(8)
    expect(sizeForDense).toBeLessThanOrEqual(11)
    expect(EXCEL_MAX_ROW_HEIGHT_PT).toBe(409)
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
      meta: sampleMeta({ situation: 'PUBLICADO', totalActivities: 44, collaboratorsWithActivityCount: 1 }),
      rows: [sampleRow()],
    })
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const sheet = workbook.getWorksheet('Visão semanal')
    expect(sheet?.getRow(1).getCell(1).value).toBe('SGP+ — Planejamento semanal')
    expect(String(sheet?.getRow(5).getCell(1).value ?? '')).toContain('Total de atividades: 44')
    expect(String(sheet?.getRow(5).getCell(1).value ?? '')).toContain('Colaboradores com atividade: 1')
  })

  it('lista exata das 7 colunas', async () => {
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
  })

  it('um colaborador com atividades em cinco dias gera uma única linha física', async () => {
    const buffer = await buildOperationalPlanningWeeklyViewExportWorkbookBuffer({
      meta: sampleMeta(),
      rows: [
        sampleRow({ id: '1', plannedDate: '2026-09-07', activityTitle: 'Seg' }),
        sampleRow({ id: '2', plannedDate: '2026-09-08', activityTitle: 'Ter' }),
        sampleRow({ id: '3', plannedDate: '2026-09-09', activityTitle: 'Qua' }),
        sampleRow({ id: '4', plannedDate: '2026-09-10', activityTitle: 'Qui' }),
        sampleRow({ id: '5', plannedDate: '2026-09-11', activityTitle: 'Sex' }),
      ],
    })
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const sheet = workbook.getWorksheet('Visão semanal')
    expect(String(sheet?.getRow(8).getCell(1).value ?? '')).toBe('Maria Silva')
    expect(String(sheet?.getRow(8).getCell(2).value ?? '')).toContain('Seg')
    expect(String(sheet?.getRow(8).getCell(3).value ?? '')).toContain('Ter')
    expect(String(sheet?.getRow(8).getCell(4).value ?? '')).toContain('Qua')
    expect(String(sheet?.getRow(8).getCell(5).value ?? '')).toContain('Qui')
    expect(String(sheet?.getRow(8).getCell(6).value ?? '')).toContain('Sex')
    expect(sheet?.getRow(9).getCell(1).value ?? null).toBeFalsy()
  })

  it('2 itens do mesmo colaborador no mesmo dia ficam na mesma célula, sem concatenação perdida', async () => {
    const buffer = await buildOperationalPlanningWeeklyViewExportWorkbookBuffer({
      meta: sampleMeta(),
      rows: [
        sampleRow({
          id: 'i1',
          plannedOrder: 0,
          conveyorTitle: 'Nome da esteira',
          activityTitle: 'Primeira atividade',
          plannedMinutes: 90,
          notes: 'Nota 1',
        }),
        sampleRow({
          id: 'i2',
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
    const cell = String(sheet?.getRow(8).getCell(2).value ?? '')
    expect(cell).toBe(
      [
        '1º Nome da esteira',
        'Primeira atividade',
        'Tempo planejado: 1h30 min',
        '2º Outra esteira',
        'Segunda atividade',
        'Tempo planejado: 45 min',
      ].join('\n'),
    )
    expect(cell.includes('\n\n')).toBe(false)
    expect(sheet?.getRow(9).getCell(1).value ?? null).toBeFalsy()
    expect(String(sheet?.getRow(8).getCell(7).value ?? '')).toBe(
      'Segunda 1º — Nota 1\nSegunda 2º — Nota 2',
    )
  })

  it('quantidade de linhas de dados = colaboradores distintos (IDs diferentes com mesmo nome separados)', async () => {
    const buffer = await buildOperationalPlanningWeeklyViewExportWorkbookBuffer({
      meta: sampleMeta(),
      rows: [
        sampleRow({ id: '1', collaboratorId: 'id-1', collaboratorName: 'João', plannedDate: '2026-09-07' }),
        sampleRow({ id: '2', collaboratorId: 'id-2', collaboratorName: 'João', plannedDate: '2026-09-07' }),
        sampleRow({ id: '3', collaboratorId: 'id-1', collaboratorName: 'João', plannedDate: '2026-09-08' }),
      ],
    })
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const sheet = workbook.getWorksheet('Visão semanal')
    expect(String(sheet?.getRow(8).getCell(1).value ?? '')).toBe('João')
    expect(String(sheet?.getRow(9).getCell(1).value ?? '')).toBe('João')
    expect(sheet?.getRow(10).getCell(1).value ?? null).toBeFalsy()
    expect(countWeeklyViewActivityBlocksInCell(String(sheet?.getRow(8).getCell(2).value ?? ''))).toBe(
      1,
    )
    expect(countWeeklyViewActivityBlocksInCell(String(sheet?.getRow(8).getCell(3).value ?? ''))).toBe(
      1,
    )
    expect(countWeeklyViewActivityBlocksInCell(String(sheet?.getRow(9).getCell(2).value ?? ''))).toBe(
      1,
    )
  })

  it('itens sem colaborador agrupados em "Não atribuído" ao final', async () => {
    const buffer = await buildOperationalPlanningWeeklyViewExportWorkbookBuffer({
      meta: sampleMeta(),
      rows: [
        sampleRow({ id: 'a', collaboratorId: 'col-a', collaboratorName: 'Ana' }),
        sampleRow({ id: 'z1', collaboratorId: null, collaboratorName: null, plannedOrder: 0 }),
        sampleRow({ id: 'z2', collaboratorId: null, collaboratorName: null, plannedOrder: 1 }),
      ],
    })
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const sheet = workbook.getWorksheet('Visão semanal')
    expect(sheet?.getRow(8).getCell(1).value).toBe('Ana')
    expect(sheet?.getRow(9).getCell(1).value).toBe('Não atribuído')
    expect(countWeeklyViewActivityBlocksInCell(String(sheet?.getRow(9).getCell(2).value ?? ''))).toBe(
      2,
    )
    expect(sheet?.getRow(10).getCell(1).value ?? null).toBeFalsy()
  })

  it('não duplica nem perde atividades; ordem e numeração diária preservadas', async () => {
    const rows = [
      sampleRow({
        id: 'm2',
        plannedDate: '2026-09-07',
        plannedOrder: 1,
        activityTitle: 'Segunda B',
      }),
      sampleRow({
        id: 'm1',
        plannedDate: '2026-09-07',
        plannedOrder: 0,
        activityTitle: 'Segunda A',
      }),
      sampleRow({
        id: 't1',
        plannedDate: '2026-09-08',
        plannedOrder: 0,
        activityTitle: 'Terça A',
      }),
    ]
    const buffer = await buildOperationalPlanningWeeklyViewExportWorkbookBuffer({
      meta: sampleMeta({ totalActivities: 3 }),
      rows,
    })
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const sheet = workbook.getWorksheet('Visão semanal')
    const mon = String(sheet?.getRow(8).getCell(2).value ?? '')
    const tue = String(sheet?.getRow(8).getCell(3).value ?? '')
    expect(mon.indexOf('Segunda A')).toBeLessThan(mon.indexOf('Segunda B'))
    expect(mon).toContain('1º')
    expect(mon).toContain('2º')
    expect(tue).toContain('1º')
    expect(tue).toContain('Terça A')
    expect(countWeeklyViewActivityBlocksInCell(mon)).toBe(2)
    expect(countWeeklyViewActivityBlocksInCell(tue)).toBe(1)
  })

  it('cenário de volume Admin 14/3/8/12/7 — uma linha, 44 atividades, altura válida', async () => {
    const adminRows = buildVolumeRowsForAdmin()
    const gabriel = sampleRow({
      id: 'g1',
      collaboratorId: 'gabriel',
      collaboratorName: 'Gabriel',
      plannedDate: '2026-09-07',
      activityTitle: 'Gabriel 1',
    })
    const joao = sampleRow({
      id: 'j1',
      collaboratorId: 'joao',
      collaboratorName: 'João',
      plannedDate: '2026-09-08',
      activityTitle: 'João 1',
    })
    const all = [...adminRows, gabriel, joao]
    expect(adminRows).toHaveLength(44)

    const buffer = await buildOperationalPlanningWeeklyViewExportWorkbookBuffer({
      meta: sampleMeta({
        totalActivities: all.length,
        collaboratorsWithActivityCount: 3,
      }),
      rows: all,
    })
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const sheet = workbook.getWorksheet('Visão semanal')!

    expect(String(sheet.getRow(8).getCell(1).value ?? '')).toBe('Admin')
    expect(String(sheet.getRow(9).getCell(1).value ?? '')).toBe('Gabriel')
    expect(String(sheet.getRow(10).getCell(1).value ?? '')).toBe('João')
    expect(sheet.getRow(11).getCell(1).value ?? null).toBeFalsy()

    const mon = String(sheet.getRow(8).getCell(2).value ?? '')
    const tue = String(sheet.getRow(8).getCell(3).value ?? '')
    const wed = String(sheet.getRow(8).getCell(4).value ?? '')
    const thu = String(sheet.getRow(8).getCell(5).value ?? '')
    const fri = String(sheet.getRow(8).getCell(6).value ?? '')
    expect(countWeeklyViewActivityBlocksInCell(mon)).toBe(14)
    expect(countWeeklyViewActivityBlocksInCell(tue)).toBe(3)
    expect(countWeeklyViewActivityBlocksInCell(wed)).toBe(8)
    expect(countWeeklyViewActivityBlocksInCell(thu)).toBe(12)
    expect(countWeeklyViewActivityBlocksInCell(fri)).toBe(7)
    const totalBlocks =
      countWeeklyViewActivityBlocksInCell(mon) +
      countWeeklyViewActivityBlocksInCell(tue) +
      countWeeklyViewActivityBlocksInCell(wed) +
      countWeeklyViewActivityBlocksInCell(thu) +
      countWeeklyViewActivityBlocksInCell(fri)
    expect(totalBlocks).toBe(44)

    const adminRow = sheet.getRow(8)
    expect(adminRow.getCell(2).alignment?.wrapText).toBe(true)
    expect(adminRow.getCell(2).alignment?.vertical).toBe('top')
    expect(adminRow.height ?? 0).toBeGreaterThan(0)
    expect(adminRow.height ?? 0).toBeLessThanOrEqual(EXCEL_MAX_ROW_HEIGHT_PT)
    expect((adminRow.getCell(2).font?.size ?? 11)).toBeGreaterThanOrEqual(8)
    expect((adminRow.getCell(2).font?.size ?? 11)).toBeLessThanOrEqual(11)

    const notes = String(adminRow.getCell(7).value ?? '')
    expect(notes).toContain('Segunda 3º — Aguardar confirmação do cliente')

    // maior célula define a altura (segunda com 14×3=42 linhas)
    expect(countCellTextLines(mon)).toBeGreaterThan(countCellTextLines(tue))
  })

  it('célula com esteira em 3 linhas; wrapText e altura por maior célula', async () => {
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
    const cell = String(sheet?.getRow(8).getCell(2).value ?? '')
    expect(cell).toBe(
      '1º Reforma dos bancos do veículo\nRetirada do revestimento\nTempo planejado: 1h',
    )
    expect(sheet?.getRow(8).getCell(2).alignment?.wrapText).toBe(true)
    expect(sheet?.getRow(8).height ?? 0).toBeGreaterThanOrEqual(3 * 15)
  })

  it('preserva proteção contra fórmula em observações consolidadas', async () => {
    const buffer = await buildOperationalPlanningWeeklyViewExportWorkbookBuffer({
      meta: sampleMeta(),
      rows: [
        sampleRow({
          plannedDate: '2026-09-07',
          plannedOrder: 0,
          notes: '=CMD()',
        }),
      ],
    })
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const sheet = workbook.getWorksheet('Visão semanal')
    // sanitização age no início da célula; prefixo "Segunda…" impede fórmula — conteúdo preservado
    const notes = String(sheet?.getRow(8).getCell(7).value ?? '')
    expect(notes).toContain('=CMD()')
    expect(notes).toContain('Segunda 1º —')
    expect(sheet?.getRow(8).getCell(7).formula).toBeFalsy()
  })

  it('protege nome de colaborador começando com + contra fórmula', async () => {
    const buffer = await buildOperationalPlanningWeeklyViewExportWorkbookBuffer({
      meta: sampleMeta(),
      rows: [sampleRow({ collaboratorName: '+Nome', notes: null })],
    })
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const sheet = workbook.getWorksheet('Visão semanal')
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
  })

  it('alternância visual por colaborador e borda estrutural em cada linha', async () => {
    const buffer = await buildOperationalPlanningWeeklyViewExportWorkbookBuffer({
      meta: sampleMeta(),
      rows: [
        sampleRow({ id: 'a', collaboratorId: 'a', collaboratorName: 'Ana' }),
        sampleRow({ id: 'b', collaboratorId: 'b', collaboratorName: 'Bruno' }),
      ],
    })
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const sheet = workbook.getWorksheet('Visão semanal')
    expect(sheet?.getRow(8).getCell(1).border?.top?.style).toBe('medium')
    expect(sheet?.getRow(9).getCell(1).border?.top?.style).toBe('medium')
    const fillArgb = (cell: ExcelJS.Cell | undefined) =>
      (cell?.fill as ExcelJS.FillPattern | undefined)?.fgColor?.argb
    expect(fillArgb(sheet?.getRow(8).getCell(1))).not.toBe('FFF3F4F6')
    expect(fillArgb(sheet?.getRow(9).getCell(1))).toBe('FFF3F4F6')
  })
})
