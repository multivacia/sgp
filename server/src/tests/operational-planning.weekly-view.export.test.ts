import { describe, expect, it } from 'vitest'
import ExcelJS from 'exceljs'
import {
  buildOperationalPlanningWeeklyViewExportFilename,
  buildOperationalPlanningWeeklyViewExportWorkbookBuffer,
  computeSafeWeeklyViewDataRowHeightPt,
  computeWeeklyViewDataRowHeightPt,
  countTempoPlanejadoOccurrences,
  countWeeklyViewActivityBlocksInCell,
  DATA_ROW_HEIGHT_PADDING_PT,
  DATA_ROW_LINE_HEIGHT_PT,
  estimateCharsPerWrappedLine,
  estimateExplicitLineVisualLines,
  estimateWrappedCellVisualLineCount,
  excelDateFromIso,
  EXCEL_MAX_ROW_HEIGHT_PT,
  formatDurationHhMm,
  formatWeeklyViewActivityCellContent,
  formatWeeklyViewActivityCellLabel,
  formatWeeklyViewApontadoDurationLabel,
  formatWeeklyViewPlannedDurationLabel,
  formatWeeklyViewPositionNotes,
  groupWeeklyViewRowsByCollaborator,
  MIN_SAFE_VISUAL_LINES,
  SAFETY_EXTRA_VISUAL_LINES,
  sanitizeExcelText,
  sortOperationalPlanningWeeklyViewRows,
  splitWeeklyViewGroupByWeekday,
  weeklyViewCollaboratorBlockRowCount,
  weeklyViewWeekdayDates,
  WEEKLY_VIEW_COLUMN_WIDTHS,
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
    realizedMinutes: 0,
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
      expect((text.match(/Tempo apontado:/g) ?? []).length).toBe(1)
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

describe('formatWeeklyViewApontadoDurationLabel', () => {
  it('usa --- para zero/nulo e formata positivos como o planejado', () => {
    expect(formatWeeklyViewApontadoDurationLabel(0)).toBe('---')
    expect(formatWeeklyViewApontadoDurationLabel(null)).toBe('---')
    expect(formatWeeklyViewApontadoDurationLabel(undefined)).toBe('---')
    expect(formatWeeklyViewApontadoDurationLabel(45)).toBe('45 min')
    expect(formatWeeklyViewApontadoDurationLabel(60)).toBe('1h')
    expect(formatWeeklyViewApontadoDurationLabel(65)).toBe('1h05 min')
    expect(formatWeeklyViewApontadoDurationLabel(90)).toBe('1h30 min')
    expect(formatWeeklyViewApontadoDurationLabel(75)).toBe('1h15 min')
  })
})

describe('formatWeeklyViewActivityCellContent', () => {
  it('gera quatro linhas com esteira e três sem (sempre com Tempo apontado)', () => {
    expect(formatWeeklyViewActivityCellContent(0, 'Reforma', 'Retirada', 90, 45)).toBe(
      '1º Reforma\nRetirada\nTempo planejado: 1h30 min\nTempo apontado: 45 min',
    )
    expect(formatWeeklyViewActivityCellContent(0, null, 'Retirada', 60, 0)).toBe(
      '1º Retirada\nTempo planejado: 1h\nTempo apontado: ---',
    )
    expect(formatWeeklyViewActivityCellContent(0, '  Revisão  ', '  Remoção  ', 60, null)).toBe(
      '1º Revisão\nRemoção\nTempo planejado: 1h\nTempo apontado: ---',
    )
    const withEsteira = formatWeeklyViewActivityCellContent(0, 'OS', 'Ativ', 30, 15)
    expect(withEsteira.split('\n')).toHaveLength(4)
    expect(withEsteira.split('\n').some((l) => l.trim() === '')).toBe(false)
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

describe('estimateWrappedCellVisualLineCount / altura dinâmica', () => {
  const weekdayWidth = WEEKLY_VIEW_COLUMN_WIDTHS[1]!
  const notesWidth = WEEKLY_VIEW_COLUMN_WIDTHS[6]!

  it('preserva larguras configuradas e capacidade conservadora', () => {
    expect([...WEEKLY_VIEW_COLUMN_WIDTHS]).toEqual([26, 32, 32, 32, 32, 32, 36])
    expect(estimateCharsPerWrappedLine(weekdayWidth)).toBe(30)
    expect(estimateCharsPerWrappedLine(notesWidth)).toBe(34)
  })

  it('linha explícita vazia conta como 1 linha visual', () => {
    expect(estimateExplicitLineVisualLines('', 30)).toBe(1)
    expect(estimateWrappedCellVisualLineCount('a\n\nb', 30)).toBe(3)
  })

  it('respeita quebras explícitas e soma quebras automáticas', () => {
    const shortCell = formatWeeklyViewActivityCellContent(
      0,
      'OS 7350',
      'Atividade curta',
      90,
      0,
    )
    expect(shortCell.split('\n')).toHaveLength(4)
    expect(estimateWrappedCellVisualLineCount(shortCell, weekdayWidth)).toBe(4)
    // fórmula bruta (sem margem de segurança)
    expect(computeWeeklyViewDataRowHeightPt(4)).toBe(
      4 * DATA_ROW_LINE_HEIGHT_PT + DATA_ROW_HEIGHT_PADDING_PT,
    )
    // política segura: floor 5 + safety → 79pt
    expect(computeSafeWeeklyViewDataRowHeightPt(4)).toBe(79)
  })

  it('descrições reais longas geram ao menos uma quebra visual adicional', () => {
    const titles = [
      'MONTAR PEÇS DE ACABAMENTO PORTA TRECO',
      'Perfilar couro para dar acabamento(manualmente)',
      'costura da borda e Fechamento do volante',
      'limpreza dos forros de portas (junto das ombreiras )',
      'INSTALAÇÃO DO BOTÃO DE PRESSÃO',
      'Instatalação da capa do banco dianteiro direito com ajuste de costura',
      'Aplicação cola na espuma do encosto para fixação do couro',
      'Aplicar cola para adesão da capa no assento dianteiro',
      'Verificar se não tem nenhuma peça quebrada no kit de acabamento',
    ]
    for (const title of titles) {
      const cell = formatWeeklyViewActivityCellContent(0, 'OS 7350', title, 240, 0)
      expect(cell).toContain('Tempo apontado: ---')
      expect(countTempoPlanejadoOccurrences(cell)).toBe(1)
      expect((cell.match(/Tempo apontado:/g) ?? []).length).toBe(1)
      const visual = estimateWrappedCellVisualLineCount(cell, weekdayWidth)
      expect(visual).toBeGreaterThanOrEqual(4)
      // títulos longos (exceto os que cabem em 1 linha) elevam altura
      if (estimateExplicitLineVisualLines(title, estimateCharsPerWrappedLine(weekdayWidth)) > 1) {
        expect(visual).toBeGreaterThanOrEqual(5)
        expect(computeSafeWeeklyViewDataRowHeightPt(visual)).toBeGreaterThanOrEqual(94)
      }
    }
  })

  it('palavra individual maior que a capacidade é fatiada', () => {
    // 42 caracteres / capacidade 10 → 5 linhas visuais
    const longWord = 'ABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOP'
    expect(longWord.length).toBe(42)
    expect(estimateExplicitLineVisualLines(longWord, 10)).toBe(5)
  })

  it('fórmula bruta cresce 15pt por linha e respeita teto 409', () => {
    expect(computeWeeklyViewDataRowHeightPt(4)).toBe(64)
    expect(computeWeeklyViewDataRowHeightPt(5)).toBe(79)
    expect(computeWeeklyViewDataRowHeightPt(6)).toBe(94)
    expect(computeWeeklyViewDataRowHeightPt(1000)).toBe(EXCEL_MAX_ROW_HEIGHT_PT)
  })

  it('política segura: piso 5, margem +1 e teto 409', () => {
    expect(SAFETY_EXTRA_VISUAL_LINES).toBe(1)
    expect(MIN_SAFE_VISUAL_LINES).toBe(5)
    expect(computeSafeWeeklyViewDataRowHeightPt(4)).toBe(79)
    expect(computeSafeWeeklyViewDataRowHeightPt(5)).toBe(94)
    expect(computeSafeWeeklyViewDataRowHeightPt(6)).toBe(109)
    expect(computeSafeWeeklyViewDataRowHeightPt(1000)).toBe(EXCEL_MAX_ROW_HEIGHT_PT)
    expect(computeSafeWeeklyViewDataRowHeightPt(Number.NaN)).toBe(79)
    expect(computeSafeWeeklyViewDataRowHeightPt(Number.POSITIVE_INFINITY)).toBe(79)
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
    expect(sheet.getRow(8).height ?? 0).toBeGreaterThanOrEqual(4 * 15)
    expect(sheet.getRow(8).getCell(2).alignment?.wrapText).toBe(true)
    expect(String(sheet.getRow(8).getCell(2).value ?? '')).toContain('Tempo apontado: ---')
    expect(sheet.getRow(8).getCell(2).border?.top?.style).toBe('medium')
    expect(sheet.getRow(9).getCell(2).border?.top?.style).toBe('thin')
  })

  it('workbook: Tempo apontado com valor e --- por célula (uma ocorrência)', async () => {
    const buffer = await buildOperationalPlanningWeeklyViewExportWorkbookBuffer({
      meta: sampleMeta(),
      rows: [
        sampleRow({
          id: 'a',
          plannedDate: '2026-09-07',
          conveyorTitle: 'Esteira',
          activityTitle: 'Com apontamento',
          plannedMinutes: 90,
          realizedMinutes: 45,
        }),
        sampleRow({
          id: 'b',
          plannedDate: '2026-09-08',
          conveyorTitle: null,
          activityTitle: 'Sem apontamento',
          plannedMinutes: 60,
          realizedMinutes: 0,
        }),
      ],
    })
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const sheet = workbook.getWorksheet('Visão semanal')!
    const mon = String(sheet.getRow(8).getCell(2).value ?? '')
    const tue = String(sheet.getRow(8).getCell(3).value ?? '')
    expect(mon).toBe(
      '1º Esteira\nCom apontamento\nTempo planejado: 1h30 min\nTempo apontado: 45 min',
    )
    expect(tue).toBe('1º Sem apontamento\nTempo planejado: 1h\nTempo apontado: ---')
    expect((mon.match(/Tempo apontado:/g) ?? []).length).toBe(1)
    expect((tue.match(/Tempo apontado:/g) ?? []).length).toBe(1)
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

  it('altura variável por linha: curta compacta, longa expandida, independente', async () => {
    const shortTitle = 'Acabamento'
    const longTitle = 'MONTAR PEÇS DE ACABAMENTO PORTA TRECO'
    const buffer = await buildOperationalPlanningWeeklyViewExportWorkbookBuffer({
      meta: sampleMeta({ totalActivities: 3, collaboratorsWithActivityCount: 1 }),
      rows: [
        sampleRow({
          id: 'short',
          plannedDate: '2026-09-07',
          plannedOrder: 0,
          conveyorTitle: 'OS 7350',
          activityTitle: shortTitle,
          plannedMinutes: 90,
          realizedMinutes: 45,
          notes: null,
        }),
        sampleRow({
          id: 'long',
          plannedDate: '2026-09-07',
          plannedOrder: 1,
          conveyorTitle: 'OS 7350',
          activityTitle: longTitle,
          plannedMinutes: 240,
          realizedMinutes: 0,
          notes: null,
        }),
        sampleRow({
          id: 'short-after',
          plannedDate: '2026-09-07',
          plannedOrder: 2,
          conveyorTitle: 'OS 7350',
          activityTitle: 'Costura',
          plannedMinutes: 30,
          realizedMinutes: 0,
          notes: null,
        }),
      ],
    })
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const sheet = workbook.getWorksheet('Visão semanal')!

    expect([...WEEKLY_VIEW_COLUMN_WIDTHS]).toEqual([26, 32, 32, 32, 32, 32, 36])
    for (let col = 1; col <= 7; col += 1) {
      expect(sheet.getColumn(col).width).toBe(WEEKLY_VIEW_COLUMN_WIDTHS[col - 1])
    }

    const hShort = sheet.getRow(8).height ?? 0
    const hLong = sheet.getRow(9).height ?? 0
    const hShortAfter = sheet.getRow(10).height ?? 0

    // 4 linhas explícitas → política segura (piso 5) → 79pt; Tempo apontado preservado
    expect(hShort).toBe(79)
    expect(hLong).toBeGreaterThan(hShort)
    expect(hShortAfter).toBe(79)
    expect(hShort).toBeLessThan(hLong)
    expect(hShortAfter).toBeLessThan(hLong)
    expect(hShort).not.toBe(64)
    expect(hShortAfter).not.toBe(64)
    expect(hShort).toBeLessThanOrEqual(EXCEL_MAX_ROW_HEIGHT_PT)
    expect(hLong).toBeLessThanOrEqual(EXCEL_MAX_ROW_HEIGHT_PT)

    for (const rowNumber of [8, 9, 10]) {
      const cell = sheet.getRow(rowNumber).getCell(2)
      const text = String(cell.value ?? '')
      expect(cell.font?.size).toBe(11)
      expect(cell.alignment?.wrapText).toBe(true)
      expect(text).toContain('Tempo planejado:')
      expect(text).toContain('Tempo apontado:')
      expect(countTempoPlanejadoOccurrences(text)).toBe(1)
      expect((text.match(/Tempo apontado:/g) ?? []).length).toBe(1)
      expect(countWeeklyViewActivityBlocksInCell(text)).toBe(1)
      expect(text.split('\n').length).toBeGreaterThanOrEqual(4)
    }

    expect(String(sheet.getRow(8).getCell(2).value ?? '')).toContain('Tempo apontado: 45 min')
    expect(String(sheet.getRow(9).getCell(2).value ?? '')).toContain('Tempo apontado: ---')
    expect(String(sheet.getRow(9).getCell(2).value ?? '')).toContain(longTitle)
  })

  it('duas quebras visuais adicionais elevam altura proporcionalmente (sem regressão a 64)', async () => {
    const veryLongTitle =
      'limpreza dos forros de portas (junto das ombreiras ) e acabamento final completo da peça'
    const cell = formatWeeklyViewActivityCellContent(0, 'OS 7350', veryLongTitle, 90, 0)
    const visual = estimateWrappedCellVisualLineCount(cell, WEEKLY_VIEW_COLUMN_WIDTHS[1]!)
    expect(visual).toBeGreaterThanOrEqual(6)
    expect(computeSafeWeeklyViewDataRowHeightPt(visual)).toBeGreaterThanOrEqual(109)
    expect(computeSafeWeeklyViewDataRowHeightPt(visual)).not.toBe(64)

    const buffer = await buildOperationalPlanningWeeklyViewExportWorkbookBuffer({
      meta: sampleMeta({ totalActivities: 1, collaboratorsWithActivityCount: 1 }),
      rows: [
        sampleRow({
          id: 'very-long',
          plannedDate: '2026-09-07',
          plannedOrder: 0,
          conveyorTitle: 'OS 7350',
          activityTitle: veryLongTitle,
          plannedMinutes: 90,
          realizedMinutes: 0,
        }),
      ],
    })
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const sheet = workbook.getWorksheet('Visão semanal')!
    const height = sheet.getRow(8).height ?? 0
    expect(height).toBeGreaterThanOrEqual(109)
    expect(height).not.toBe(64)
    expect(String(sheet.getRow(8).getCell(2).value ?? '')).toContain('Tempo apontado: ---')
  })

  it('maior célula entre dias define a altura; observação longa também conta', async () => {
    const buffer = await buildOperationalPlanningWeeklyViewExportWorkbookBuffer({
      meta: sampleMeta({ totalActivities: 2, collaboratorsWithActivityCount: 1 }),
      rows: [
        sampleRow({
          id: 'mon-short',
          plannedDate: '2026-09-07',
          plannedOrder: 0,
          conveyorTitle: 'OS 1',
          activityTitle: 'Curta',
          notes: null,
        }),
        sampleRow({
          id: 'tue-long',
          plannedDate: '2026-09-08',
          plannedOrder: 0,
          conveyorTitle: 'OS 1',
          activityTitle: 'Perfilar couro para dar acabamento(manualmente)',
          notes: null,
        }),
      ],
    })
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const sheet = workbook.getWorksheet('Visão semanal')!
    // mesma linha física (posição 1): terça longa eleva a altura da linha inteira
    // visual >= 5 → safe max(5, visual+1) >= 6 → >= 94pt
    expect(sheet.getRow(8).height ?? 0).toBeGreaterThanOrEqual(94)

    const notesBuffer = await buildOperationalPlanningWeeklyViewExportWorkbookBuffer({
      meta: sampleMeta({ totalActivities: 1, collaboratorsWithActivityCount: 1 }),
      rows: [
        sampleRow({
          id: 'notes-only',
          plannedDate: '2026-09-07',
          plannedOrder: 0,
          conveyorTitle: 'OS 1',
          activityTitle: 'Curta',
          notes:
            'Nota extensíssima para validar que a coluna Observações também participa do cálculo de altura visual da linha física correspondente na grade por posição do planejamento semanal',
        }),
      ],
    })
    const notesWb = new ExcelJS.Workbook()
    await notesWb.xlsx.load(notesBuffer)
    const notesSheet = notesWb.getWorksheet('Visão semanal')!
    expect(notesSheet.getRow(8).height ?? 0).toBeGreaterThan(79)
  })

  it('descrições reais cobertas mantêm quarta linha e altura segura após reabrir .xlsx', async () => {
    const titles = [
      'MONTAR PEÇS DE ACABAMENTO PORTA TRECO',
      'Perfilar couro para dar acabamento(manualmente)',
      'costura da borda e Fechamento do volante',
      'limpreza dos forros de portas (junto das ombreiras )',
      'INSTALAÇÃO DO BOTÃO DE PRESSÃO',
      'Instatalação da capa do banco dianteiro direito com ajuste de costura',
      'Aplicação cola na espuma do encosto para fixação do couro',
      'Aplicar cola para adesão da capa no assento dianteiro',
      'Verificar se não tem nenhuma peça quebrada no kit de acabamento',
    ]
    const rows = titles.map((activityTitle, idx) =>
      sampleRow({
        id: `real-${idx}`,
        plannedDate: '2026-09-07',
        plannedOrder: idx,
        conveyorTitle: 'OS 7350',
        activityTitle,
        plannedMinutes: 90,
        realizedMinutes: idx === 0 ? 45 : 0,
      }),
    )
    const buffer = await buildOperationalPlanningWeeklyViewExportWorkbookBuffer({
      meta: sampleMeta({ totalActivities: rows.length, collaboratorsWithActivityCount: 1 }),
      rows,
    })
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const sheet = workbook.getWorksheet('Visão semanal')!
    for (let i = 0; i < titles.length; i += 1) {
      const row = sheet.getRow(8 + i)
      const text = String(row.getCell(2).value ?? '')
      expect(text).toContain(titles[i]!)
      expect(text).toContain('Tempo planejado:')
      expect(text).toMatch(/Tempo apontado: (45 min|---)/)
      expect(row.height ?? 0).toBeGreaterThanOrEqual(79)
      expect(row.height ?? 0).not.toBe(64)
      expect(row.height ?? 0).toBeLessThanOrEqual(EXCEL_MAX_ROW_HEIGHT_PT)
      expect(row.getCell(2).font?.size).toBe(11)
      expect(row.getCell(2).alignment?.wrapText).toBe(true)
    }

    // conteúdo completo após serializar/reabrir
    const reopened = new ExcelJS.Workbook()
    await reopened.xlsx.load(buffer)
    const reopenedSheet = reopened.getWorksheet('Visão semanal')!
    for (let i = 0; i < titles.length; i += 1) {
      const row = reopenedSheet.getRow(8 + i)
      expect(String(row.getCell(2).value ?? '')).toContain(titles[i]!)
      expect(row.height ?? 0).toBeGreaterThanOrEqual(79)
      expect(row.getCell(2).alignment?.wrapText).toBe(true)
    }
  })
})
