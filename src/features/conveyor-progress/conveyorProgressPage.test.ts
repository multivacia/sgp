import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import {
  computeConveyorProgressSummary,
  filterSelectedConveyors,
} from '../../domain/conveyor-progress/conveyorProgressDisplay'
import type {
  ActivityTimeEfficiency,
  AggregateTimeEfficiency,
  ConveyorProgressItem,
} from '../../domain/conveyor-progress/conveyorProgress.types'

vi.mock('../../domain/conveyors/conveyorOperationalStatus', () => ({
  labelConveyorOperationalStatus: (s: string) => s,
  CONVEYOR_OPERATIONAL_STATUS_LABELS: { EM_ANDAMENTO: 'Em andamento' },
}))

vi.mock('../operational-planning/planningExecutionHelpers', () => ({
  resolvePlanningItemOperationalStatusLabel: (s: string) => s,
}))

function sampleItem(
  id: string,
  name: string,
  overrides?: Partial<ConveyorProgressItem>,
): ConveyorProgressItem {
  const aggregateTimeEfficiency: AggregateTimeEfficiency = {
    status: 'CRITICO',
    efficiencyPct: 66.7,
    deviationMinutes: 15,
    deviationPct: 50,
    classification: 'CRITICO',
    notStartedCount: 0,
    withoutPlannedTimeCount: 0,
    completedWithoutTimeCount: 0,
    partialCount: 1,
    includedInCalculationCount: 1,
  }
  const activityTimeEfficiency: ActivityTimeEfficiency = {
    status: 'CRITICO',
    isPartial: true,
    includedInCalculation: true,
    efficiencyPct: 66.7,
    deviationMinutes: 15,
    deviationPct: 50,
    classification: 'CRITICO',
  }

  return {
    conveyorId: id,
    conveyorName: name,
    operationalStatus: 'EM_ANDAMENTO',
    plannedMinutes: 25,
    realizedMinutes: 66,
    remainingMinutes: 0,
    exceededMinutes: 41,
    progressPercent: 264,
    timeEfficiency: aggregateTimeEfficiency,
    tasks: [
      {
        taskId: 't1',
        taskName: 'Tarefa A',
        plannedMinutes: 25,
        realizedMinutes: 66,
        remainingMinutes: 0,
        exceededMinutes: 41,
        progressPercent: 264,
        timeEfficiency: aggregateTimeEfficiency,
        sectors: [
          {
            sectorId: 's1',
            sectorName: 'Setor X',
            plannedMinutes: 25,
            realizedMinutes: 66,
            remainingMinutes: 0,
            exceededMinutes: 41,
            progressPercent: 264,
            timeEfficiency: aggregateTimeEfficiency,
            activities: [
              {
                activityId: 'a1',
                activityName: 'Atividade 1',
                status: 'PENDING',
                plannedMinutes: 25,
                realizedMinutes: 66,
                remainingMinutes: 0,
                exceededMinutes: 41,
                progressPercent: 264,
                timeEfficiency: activityTimeEfficiency,
                timeEntries: [
                  {
                    timeEntryId: 'te1',
                    entryDate: '2026-06-01T10:00:00.000Z',
                    collaboratorName: 'Maria',
                    durationMinutes: 30,
                    entryMode: 'manual',
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
    ...overrides,
  }
}

describe('computeConveyorProgressSummary', () => {
  it('agrega falta e excedente de forma coerente', () => {
    const s = computeConveyorProgressSummary([sampleItem('c1', 'E1')])
    expect(s.remainingMinutes).toBe(0)
    expect(s.exceededMinutes).toBe(41)
  })
})

describe('ConveyorProgressTable render', () => {
  it('renderiza colunas da tabela analítica', async () => {
    const { ConveyorProgressTable } = await import('./ConveyorProgressTable')
    const html = renderToStaticMarkup(
      createElement(ConveyorProgressTable, {
        items: [sampleItem('c1', 'Esteira Teste')],
        selectedIds: new Set<string>(),
        onToggleSelect: () => {},
        onSelectAll: () => {},
        onClearSelection: () => {},
      }),
    )
    expect(html).toContain('Item')
    expect(html).toContain('Status')
    expect(html).toContain('Previsto')
    expect(html).toContain('Realizado')
    expect(html).toContain('Falta')
    expect(html).toContain('Excedente')
    expect(html).toContain('Evolução')
    expect(html).toContain('Eficiência')
    expect(html).toContain('Seleção')
    expect(html).toContain('Esteira Teste')
  })

  it('checkbox de seleção apenas no nível esteira', async () => {
    const { ConveyorProgressTable } = await import('./ConveyorProgressTable')
    const html = renderToStaticMarkup(
      createElement(ConveyorProgressTable, {
        items: [sampleItem('c1', 'E1')],
        selectedIds: new Set(['c1']),
        onToggleSelect: () => {},
        onSelectAll: () => {},
        onClearSelection: () => {},
      }),
    )
    const checkboxCount = (html.match(/type="checkbox"/g) ?? []).length
    expect(checkboxCount).toBe(2)
  })
})

describe('ConveyorProgressSummary render', () => {
  it('renderiza resumo geral', async () => {
    const { ConveyorProgressSummary } = await import('./ConveyorProgressSummary')
    const html = renderToStaticMarkup(
      createElement(ConveyorProgressSummary, {
        summary: computeConveyorProgressSummary([sampleItem('c1', 'E1')]),
      }),
    )
    expect(html).toContain('Resumo geral')
    expect(html).toContain('Excedente')
    expect(html).toContain('Evolução média')
    expect(html).toContain('Eficiência ponderada')
  })
})

describe('ConveyorProgressAnalyticalEntries render', () => {
  it('renderiza seção Apontamentos analíticos', async () => {
    const { ConveyorProgressAnalyticalEntries } = await import(
      './ConveyorProgressAnalyticalEntries'
    )
    const item = sampleItem('c1', 'E')
    const entries = item.tasks[0]!.sectors[0]!.activities[0]!.timeEntries
    const html = renderToStaticMarkup(
      createElement(ConveyorProgressAnalyticalEntries, {
        entries,
        indentLevel: 4,
      }),
    )
    expect(html).toContain('Apontamentos analíticos')
  })
})

describe('ConveyorProgressFilters render', () => {
  it('renderiza filtros e botão Gerar PDF', async () => {
    const { ConveyorProgressFilters } = await import('./ConveyorProgressFilters')
    const html = renderToStaticMarkup(
      createElement(ConveyorProgressFilters, {
        filters: {
          search: '',
          operationalStatus: '',
          timeEntryFrom: '',
          timeEntryTo: '',
          collaboratorId: '',
          onlyExceeded: false,
        },
        onChange: () => {},
        collaboratorOptions: [],
        advancedOpen: false,
        onToggleAdvanced: () => {},
        onGeneratePdf: () => {},
        pdfDisabled: true,
        pdfLoading: false,
      }),
    )
    expect(html).toContain('Gerar PDF')
    expect(html).toContain('Hierarquia')
    expect(html).toContain('disabled')
  })
})

describe('seleção para PDF', () => {
  it('filterSelectedConveyors retorna apenas selecionadas', () => {
    const items = [sampleItem('c1', 'E1'), sampleItem('c2', 'E2')]
    expect(filterSelectedConveyors(items, new Set(['c1']))).toHaveLength(1)
  })
})
