import { describe, expect, it } from 'vitest'
import ExcelJS from 'exceljs'
import {
  buildOperationalPlanningWeeklyViewExportFilename,
  buildOperationalPlanningWeeklyViewExportWorkbookBuffer,
  countTempoPlanejadoOccurrences,
  countWeeklyViewActivityBlocksInCell,
  excelDateFromIso,
  EXCEL_MAX_ROW_HEIGHT_PT,
  formatDurationHhMm,
  formatWeeklyViewActivityCellContent,
  formatWeeklyViewActivityCellLabel,
  formatWeeklyViewPlannedDurationLabel,
  formatWeeklyViewPositionNotes,
  groupWeeklyViewRowsByCollaborator,
  sanitizeExcelText,
  sortOperationalPlanningWeeklyViewRows,
  splitWeeklyViewGroupByWeekday,
  weeklyViewCollaboratorBlockRowCount,
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

const WEEK_DATES = [
  '2026-09-07',
  '2026-09-08',
  '2026-09-09',
  '2026-09-10',
  '2026-09-11',
] as const

function buildDayVolumeRows(
  collaboratorId: string,
  collaboratorName: string,
  counts: readonly number[],
): OperationalPlanningWeeklyViewExportRow[] {
  const rows: OperationalPlanningWeeklyViewExportRow[] = []
  counts.forEach((count, dayIndex) => {
    const date = WEEK_DATES[dayIndex]!
    for (let i = 0; i < count; i += 1) {
      rows.push(
        sampleRow({
          id: `${collaboratorId}-${date}-${i}`,
          collaboratorId,
          collaboratorName,
          plannedDate: date,
          plannedOrder: i,
          conveyorTitle: 'OS 6995',
          activityTitle: `${collaboratorName} ${date} #${i + 1}`,
          plannedMinutes: 15 + (i % 4) * 15,
          notes:
            dayIndex === 0 && i === 0
              ? `Obs ${collaboratorName} segunda 1`
              : dayIndex === 2 && i === 0
                ? `Obs ${collaboratorName} quarta 1`
                : null,
        }),
      )
    }
  })
  return rows
}

function buildAdminVolumeRows(): OperationalPlanningWeeklyViewExportRow[] {
  return buildDayVolumeRows('admin', 'Admin', [14, 3, 8, 12, 7])
}

/** Admin 44 + Gabriel 6 + João 14 = 64; máximos diários 14 / 6 / 14 → 34 linhas. */
function buildFullReferenceRows(): OperationalPlanningWeeklyViewExportRow[] {
  return [
    ...buildDayVolumeRows('admin', 'Admin', [14, 3, 8, 12, 7]),
    ...buildDayVolumeRows('gabriel', 'Gabriel', [6, 0, 0, 0, 0]),
    ...buildDayVolumeRows('joao', 'João', [14, 0, 0, 0, 0]),
  ]
}

function countFilledActivityCellsInBlock(
  sheet: ExcelJS.Worksheet,
  firstRow: number,
  rowCount: number,
): number {
  let filled = 0
  for (let r = 0; r < rowCount; r += 1) {
    for (let col = 2; col <= 6; col += 1) {
      const text = String(sheet.getRow(firstRow + r).getCell(col).value ?? '')
      if (!text) continue
      filled += 1
      expect(countTempoPlanejadoOccurrences(text)).toBe(1)
      expect(countWeeklyViewActivityBlocksInCell(text)).toBe(1)
    }
  }
  return filled
}

function listMerges(sheet: ExcelJS.Worksheet): string[] {
  return ((sheet.model as { merges?: string[] }).merges ?? []).map((m) => m.toUpperCase())
}

describe('buildOperationalPlanningWeeklyViewExportFilename', () => {
  it('gera nome com slug correto', () => {
    expect(
      buildOperationalPlanningWeeklyViewExportFilename('2026-09-07', '2026-09-11', 'PUBLICADO'),
    ).toBe('planejamento-semanal-visao-2026-09-07-a-2026-09-11-publicado.xlsx')
  })
})

describe('excelDateFromIso / weeklyViewWeekdayDates', () => {
  it('não desloca fuso e gera seg–sex', () => {
    const d = excelDateFromIso('2026-09-07')
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(8)
    expect(d.getDate()).toBe(7)
    expect(weeklyViewWeekdayDates('2026-09-07')).toEqual([...WEEK_DATES])
  })
})

describe('sanitizeExcelText', () => {
  it('protege fórmulas e mantém texto normal', () => {
    expect(sanitizeExcelText('=SUM(A1:A2)')).toBe("'=SUM(A1:A2)")
    expect(sanitizeExcelText('Observação normal')).toBe('Observação normal')
  })
})

describe('formatWeeklyViewPlannedDurationLabel', () => {
  it('formata tempo textual e mantém paridade com HH:mm', () => {
    expect(formatWeeklyViewPlannedDurationLabel(0)).toBe('0 min')
    expect(formatWeeklyViewPlannedDurationLabel(5)).toBe('5 min')
    expect(formatWeeklyViewPlannedDurationLabel(30)).toBe('30 min')
    expect(formatWeeklyViewPlannedDurationLabel(60)).toBe('1h')
    expect(formatWeeklyViewPlannedDurationLabel(65)).toBe('1h05 min')
    expect(formatWeeklyViewPlannedDurationLabel(90)).toBe('1h30 min')
    expect(formatWeeklyViewPlannedDurationLabel(120)).toBe('2h')
    expect(formatWeeklyViewPlannedDurationLabel(135)).toBe('2h15 min')
    expect(formatDurationHhMm(90)).toBe('1:30')
  })
})

describe('formatWeeklyViewActivityCellContent', () => {
  it('gera três linhas com esteira e duas sem; preserva acentos', () => {
    expect(formatWeeklyViewActivityCellContent(0, 'Reforma', 'Retirada', 90)).toBe(
      '1º Reforma\nRetirada\nTempo planejado: 1h30 min',
    )
    expect(formatWeeklyViewActivityCellContent(0, null, 'Retirada', 60)).toBe(
      '1º Retirada\nTempo planejado: 1h',
    )
    expect(formatWeeklyViewActivityCellContent(0, '  Revisão  ', '  Remoção  ', 60)).toBe(
      '1º Revisão\nRemoção\nTempo planejado: 1h',
    )
    expect(formatWeeklyViewActivityCellLabel('A', 'B')).toBe('A — B')
  })
})

describe('group / split / blockRowCount', () => {
  it('agrupa por collaboratorId e calcula linhas = máximo diário', () => {
    const sorted = sortOperationalPlanningWeeklyViewRows(buildAdminVolumeRows())
    const groups = groupWeeklyViewRowsByCollaborator(sorted)
    expect(groups).toHaveLength(1)
    const days = splitWeeklyViewGroupByWeekday(groups[0]!, '2026-09-07')
    expect(days.map((d) => d.length)).toEqual([14, 3, 8, 12, 7])
    expect(weeklyViewCollaboratorBlockRowCount(days)).toBe(14)
  })
})

describe('formatWeeklyViewPositionNotes', () => {
  it('consolida só as observações das atividades da linha de posição', () => {
    const mon = sampleRow({ plannedDate: '2026-09-07', plannedOrder: 0, notes: 'Obs segunda' })
    const tue = sampleRow({ id: 't', plannedDate: '2026-09-08', plannedOrder: 0, notes: null })
    const wed = sampleRow({ id: 'w', plannedDate: '2026-09-09', plannedOrder: 0, notes: 'Obs quarta' })
    expect(formatWeeklyViewPositionNotes([mon, tue, wed, null, null])).toBe(
      'Segunda 1º — Obs segunda\nQuarta 1º — Obs quarta',
    )
    expect(formatWeeklyViewPositionNotes([null, null, null, null, null])).toBe('—')
  })
})

describe('buildOperationalPlanningWeeklyViewExportWorkbookBuffer — grade por posição', () => {
  it('gera workbook com 1 aba e 7 colunas; preserva totais do meta', async () => {
    const buffer = await buildOperationalPlanningWeeklyViewExportWorkbookBuffer({
      meta: sampleMeta({ totalActivities: 64, collaboratorsWithActivityCount: 3, totalPlannedMinutes: 999 }),
      rows: [sampleRow()],
    })
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    expect(workbook.worksheets.map((ws) => ws.name)).toEqual(['Visão semanal'])
    const sheet = workbook.getWorksheet('Visão semanal')
    const headers = Array.from({ length: 7 }, (_, idx) => String(sheet?.getRow(7).getCell(idx + 1).value ?? ''))
    expect(headers[0]).toBe('Colaborador')
    expect(headers[6]).toBe('Observações')
    const totals = String(sheet?.getRow(5).getCell(1).value ?? '')
    expect(totals).toContain('Total de atividades: 64')
    expect(totals).toContain('Colaboradores com atividade: 3')
  })

  it('cenário Admin 14/3/8/12/7 → 14 linhas, merge, grade alinhada, 44 células', async () => {
    const adminRows = buildAdminVolumeRows()
    expect(adminRows).toHaveLength(44)
    const buffer = await buildOperationalPlanningWeeklyViewExportWorkbookBuffer({
      meta: sampleMeta({ totalActivities: 44, collaboratorsWithActivityCount: 1 }),
      rows: adminRows,
    })
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const sheet = workbook.getWorksheet('Visão semanal')!

    expect(String(sheet.getRow(8).getCell(2).value ?? '')).toContain('Admin 2026-09-07 #1')
    expect(sheet.getRow(8 + 14).getCell(2).value ?? null).toBeFalsy()

    expect(listMerges(sheet).some((m) => m === 'A8:A21')).toBe(true)
    expect(String(sheet.getRow(8).getCell(1).value ?? '')).toBe('Admin')

    for (let col = 2; col <= 6; col += 1) {
      const text = String(sheet.getRow(8).getCell(col).value ?? '')
      expect(text).toContain('1º')
      expect(countTempoPlanejadoOccurrences(text)).toBe(1)
    }

    for (let col = 2; col <= 6; col += 1) {
      expect(String(sheet.getRow(9).getCell(col).value ?? '')).toContain('2º')
      expect(String(sheet.getRow(10).getCell(col).value ?? '')).toContain('3º')
    }

    // linha 4: terça vazia
    expect(sheet.getRow(11).getCell(3).value ?? null).toBeFalsy()
    expect(String(sheet.getRow(11).getCell(2).value ?? '')).toContain('4º')
    expect(String(sheet.getRow(11).getCell(4).value ?? '')).toContain('4º')

    // linha 8: terça vazia, quarta preenchida
    expect(sheet.getRow(15).getCell(3).value ?? null).toBeFalsy()
    expect(String(sheet.getRow(15).getCell(4).value ?? '')).toContain('8º')

    // linha 12: segunda e quinta; quarta vazia
    expect(String(sheet.getRow(19).getCell(2).value ?? '')).toContain('12º')
    expect(sheet.getRow(19).getCell(4).value ?? null).toBeFalsy()
    expect(String(sheet.getRow(19).getCell(5).value ?? '')).toContain('12º')

    // linhas 13–14: somente segunda (14 atividades); quinta tem só 12
    expect(String(sheet.getRow(20).getCell(2).value ?? '')).toContain('13º')
    expect(sheet.getRow(20).getCell(3).value ?? null).toBeFalsy()
    expect(sheet.getRow(20).getCell(4).value ?? null).toBeFalsy()
    expect(sheet.getRow(20).getCell(5).value ?? null).toBeFalsy()
    expect(sheet.getRow(20).getCell(6).value ?? null).toBeFalsy()

    expect(String(sheet.getRow(21).getCell(2).value ?? '')).toContain('14º')
    expect(sheet.getRow(21).getCell(3).value ?? null).toBeFalsy()
    expect(sheet.getRow(21).getCell(4).value ?? null).toBeFalsy()
    expect(sheet.getRow(21).getCell(5).value ?? null).toBeFalsy()
    expect(sheet.getRow(21).getCell(6).value ?? null).toBeFalsy()

    expect(countFilledActivityCellsInBlock(sheet, 8, 14)).toBe(44)

    expect(String(sheet.getRow(8).getCell(7).value ?? '')).toContain('Segunda 1º —')
    expect(String(sheet.getRow(8).getCell(7).value ?? '')).toContain('Quarta 1º —')

    expect(sheet.getRow(8).getCell(2).font?.size).toBe(11)
    expect(sheet.getRow(8).height ?? 0).toBeLessThan(EXCEL_MAX_ROW_HEIGHT_PT)
    expect(sheet.getRow(8).getCell(2).alignment?.wrapText).toBe(true)
    expect(sheet.getRow(8).getCell(2).border?.top?.style).toBe('medium')
    expect(sheet.getRow(9).getCell(2).border?.top?.style).toBe('thin')
  })

  it('arquivo completo Admin14 + Gabriel6 + João14 → 34 linhas e 64 atividades', async () => {
    const rows = buildFullReferenceRows()
    expect(rows).toHaveLength(64)
    const buffer = await buildOperationalPlanningWeeklyViewExportWorkbookBuffer({
      meta: sampleMeta({ totalActivities: 64, collaboratorsWithActivityCount: 3 }),
      rows,
    })
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const sheet = workbook.getWorksheet('Visão semanal')!

    expect(String(sheet.getRow(8).getCell(1).value ?? '')).toBe('Admin')
    expect(String(sheet.getRow(22).getCell(1).value ?? '')).toBe('Gabriel')
    expect(String(sheet.getRow(28).getCell(1).value ?? '')).toBe('João')
    expect(sheet.getRow(8 + 34).getCell(1).value ?? null).toBeFalsy()

    const merges = listMerges(sheet)
    expect(merges).toContain('A8:A21')
    expect(merges).toContain('A22:A27')
    expect(merges).toContain('A28:A41')

    expect(countFilledActivityCellsInBlock(sheet, 8, 14)).toBe(44)
    expect(countFilledActivityCellsInBlock(sheet, 22, 6)).toBe(6)
    expect(countFilledActivityCellsInBlock(sheet, 28, 14)).toBe(14)

    const totals = String(sheet.getRow(5).getCell(1).value ?? '')
    expect(totals).toContain('Total de atividades: 64')
    expect(totals).toContain('Colaboradores com atividade: 3')
  })

  it('colaborador com atividade em apenas um dia; bloco de 1 linha sem merge inválido', async () => {
    const buffer = await buildOperationalPlanningWeeklyViewExportWorkbookBuffer({
      meta: sampleMeta(),
      rows: [sampleRow({ plannedDate: '2026-09-09', activityTitle: 'Só quarta' })],
    })
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const sheet = workbook.getWorksheet('Visão semanal')!
    expect(String(sheet.getRow(8).getCell(4).value ?? '')).toContain('Só quarta')
    expect(sheet.getRow(8).getCell(2).value ?? null).toBeFalsy()
    expect(sheet.getRow(9).getCell(1).value ?? null).toBeFalsy()
    expect(listMerges(sheet).some((m) => /^A8:A8$/i.test(m))).toBe(false)
    expect(listMerges(sheet).some((m) => /^A8:A\d+$/i.test(m) && m !== 'A8:A8')).toBe(false)
  })

  it('uma atividade em cada dia → 1 linha com cinco células', async () => {
    const buffer = await buildOperationalPlanningWeeklyViewExportWorkbookBuffer({
      meta: sampleMeta(),
      rows: WEEK_DATES.map((date, i) =>
        sampleRow({ id: `d${i}`, plannedDate: date, plannedOrder: 0, activityTitle: `Dia ${i}` }),
      ),
    })
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const sheet = workbook.getWorksheet('Visão semanal')!
    for (let col = 2; col <= 6; col += 1) {
      expect(String(sheet.getRow(8).getCell(col).value ?? '')).toContain('1º')
    }
    expect(sheet.getRow(9).getCell(1).value ?? null).toBeFalsy()
  })

  it('IDs diferentes com mesmo nome permanecem em blocos separados', async () => {
    const buffer = await buildOperationalPlanningWeeklyViewExportWorkbookBuffer({
      meta: sampleMeta(),
      rows: [
        sampleRow({ id: '1', collaboratorId: 'id-1', collaboratorName: 'João', plannedDate: '2026-09-07' }),
        sampleRow({ id: '2', collaboratorId: 'id-2', collaboratorName: 'João', plannedDate: '2026-09-07' }),
        sampleRow({
          id: '3',
          collaboratorId: 'id-1',
          collaboratorName: 'João',
          plannedDate: '2026-09-08',
          plannedOrder: 0,
        }),
      ],
    })
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const sheet = workbook.getWorksheet('Visão semanal')!
    // id-1: max(1,1)=1? mon1 + tue1 → max=1 → 1 linha; wait mon1 tue1 → blockRowCount=1
    // Actually id-1 has mon and tue → 1 row with both; id-2 has mon → 1 row. Total 2 rows.
    expect(String(sheet.getRow(8).getCell(1).value ?? '')).toBe('João')
    expect(String(sheet.getRow(9).getCell(1).value ?? '')).toBe('João')
    expect(sheet.getRow(10).getCell(1).value ?? null).toBeFalsy()
  })

  it('itens sem colaborador agrupados em Não atribuído', async () => {
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
    const sheet = workbook.getWorksheet('Visão semanal')!
    expect(sheet.getRow(8).getCell(1).value).toBe('Ana')
    expect(sheet.getRow(9).getCell(1).value).toBe('Não atribuído')
    // unassigned: 2 on same day → 2 position rows
    expect(String(sheet.getRow(9).getCell(2).value ?? '')).toContain('1º')
    expect(String(sheet.getRow(10).getCell(2).value ?? '')).toContain('2º')
    expect(listMerges(sheet)).toContain('A9:A10')
  })

  it('observações ficam na linha da posição correspondente', async () => {
    const buffer = await buildOperationalPlanningWeeklyViewExportWorkbookBuffer({
      meta: sampleMeta(),
      rows: [
        sampleRow({
          id: '1',
          plannedDate: '2026-09-07',
          plannedOrder: 0,
          notes: 'Nota posição 1',
        }),
        sampleRow({
          id: '2',
          plannedDate: '2026-09-07',
          plannedOrder: 1,
          notes: 'Nota posição 2',
        }),
        sampleRow({
          id: '3',
          plannedDate: '2026-09-08',
          plannedOrder: 0,
          notes: 'Nota terça 1',
        }),
      ],
    })
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const sheet = workbook.getWorksheet('Visão semanal')!
    expect(String(sheet.getRow(8).getCell(7).value ?? '')).toBe(
      'Segunda 1º — Nota posição 1\nTerça 1º — Nota terça 1',
    )
    expect(String(sheet.getRow(9).getCell(7).value ?? '')).toBe('Segunda 2º — Nota posição 2')
  })

  it('protege nome com + e ZERO fórmulas no workbook', async () => {
    const buffer = await buildOperationalPlanningWeeklyViewExportWorkbookBuffer({
      meta: sampleMeta(),
      rows: [sampleRow({ collaboratorName: '+Nome', notes: '=CMD()' })],
    })
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const sheet = workbook.getWorksheet('Visão semanal')!
    expect(sheet.getRow(8).getCell(1).value).toBe("'+Nome")
    expect(String(sheet.getRow(8).getCell(7).value ?? '')).toContain('=CMD()')
    for (const ws of workbook.worksheets) {
      ws.eachRow((row) => {
        row.eachCell((cell) => {
          expect(cell.formula).toBeFalsy()
        })
      })
    }
  })

  it('autofiltro, freeze panes e pageSetup paisagem', async () => {
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

  it('alternância visual por colaborador em todas as linhas do bloco', async () => {
    const buffer = await buildOperationalPlanningWeeklyViewExportWorkbookBuffer({
      meta: sampleMeta(),
      rows: [
        ...buildDayVolumeRows('a', 'Ana', [2, 0, 0, 0, 0]),
        ...buildDayVolumeRows('b', 'Bruno', [2, 0, 0, 0, 0]),
      ],
    })
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const sheet = workbook.getWorksheet('Visão semanal')!
    const fillArgb = (cell: ExcelJS.Cell) =>
      (cell.fill as ExcelJS.FillPattern | undefined)?.fgColor?.argb
    expect(fillArgb(sheet.getRow(8).getCell(2))).not.toBe('FFF3F4F6')
    expect(fillArgb(sheet.getRow(9).getCell(2))).not.toBe('FFF3F4F6')
    expect(fillArgb(sheet.getRow(10).getCell(2))).toBe('FFF3F4F6')
    expect(fillArgb(sheet.getRow(11).getCell(2))).toBe('FFF3F4F6')
  })
})
