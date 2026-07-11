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
    operationalProgressPct: 50,
    timeConsumptionPct: 264,
    timeEfficiency: aggregateTimeEfficiency,
    tasks: [
      {
        taskId: 't1',
        taskName: 'Tarefa A',
        plannedMinutes: 25,
        realizedMinutes: 66,
        remainingMinutes: 0,
        exceededMinutes: 41,
        operationalProgressPct: 50,
        timeConsumptionPct: 264,
        timeEfficiency: aggregateTimeEfficiency,
        sectors: [
          {
            sectorId: 's1',
            sectorName: 'Setor X',
            plannedMinutes: 25,
            realizedMinutes: 66,
            remainingMinutes: 0,
            exceededMinutes: 41,
            operationalProgressPct: 50,
            timeConsumptionPct: 264,
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
                operationalProgressPct: 50,
                timeConsumptionPct: 264,
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

function aggregateTimeEfficiency(
  overrides: Partial<AggregateTimeEfficiency> = {},
): AggregateTimeEfficiency {
  return {
    status: 'DENTRO_DO_PREVISTO',
    efficiencyPct: 100,
    deviationMinutes: 0,
    deviationPct: 0,
    classification: 'DENTRO_DO_PREVISTO',
    notStartedCount: 0,
    withoutPlannedTimeCount: 0,
    completedWithoutTimeCount: 0,
    partialCount: 0,
    includedInCalculationCount: 1,
    ...overrides,
  }
}

function summaryRowItem(
  id: string,
  name: string,
  timeEfficiency: AggregateTimeEfficiency,
): ConveyorProgressItem {
  return sampleItem(id, name, {
    plannedMinutes: 60,
    realizedMinutes: 60,
    remainingMinutes: 0,
    exceededMinutes: 0,
    operationalProgressPct: 100,
    timeConsumptionPct: 100,
    timeEfficiency,
    tasks: [],
  })
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

  it('renderiza evolução operacional sem confundir com consumo temporal', async () => {
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

    expect(html).toContain('50%')
    expect(html).not.toContain('264%')
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

  it('renderiza os principais estados visuais de eficiência sem depender das linhas internas', async () => {
    const { ConveyorProgressTable } = await import('./ConveyorProgressTable')
    const html = renderToStaticMarkup(
      createElement(ConveyorProgressTable, {
        items: [
          summaryRowItem(
            'c-fast',
            'Esteira rápida',
            aggregateTimeEfficiency({
              status: 'MAIS_RAPIDO',
              efficiencyPct: 150,
              deviationMinutes: -20,
              deviationPct: -33.3,
              classification: 'MAIS_RAPIDO',
            }),
          ),
          summaryRowItem(
            'c-on-plan',
            'Esteira dentro do previsto',
            aggregateTimeEfficiency(),
          ),
          summaryRowItem(
            'c-partial',
            'Esteira parcial',
            aggregateTimeEfficiency({
              status: 'LEVE_DESVIO',
              efficiencyPct: 90.9,
              deviationMinutes: 10,
              deviationPct: 10,
              classification: 'LEVE_DESVIO',
              partialCount: 1,
              includedInCalculationCount: 2,
            }),
          ),
          summaryRowItem(
            'c-no-plan',
            'Esteira sem tempo previsto',
            aggregateTimeEfficiency({
              status: null,
              efficiencyPct: null,
              deviationMinutes: null,
              deviationPct: null,
              classification: null,
              withoutPlannedTimeCount: 1,
              includedInCalculationCount: 0,
            }),
          ),
          summaryRowItem(
            'c-not-started',
            'Esteira não iniciada',
            aggregateTimeEfficiency({
              status: null,
              efficiencyPct: null,
              deviationMinutes: null,
              deviationPct: null,
              classification: null,
              notStartedCount: 1,
              includedInCalculationCount: 0,
            }),
          ),
          summaryRowItem(
            'c-no-entry',
            'Esteira concluída sem apontamento',
            aggregateTimeEfficiency({
              status: null,
              efficiencyPct: null,
              deviationMinutes: null,
              deviationPct: null,
              classification: null,
              completedWithoutTimeCount: 1,
              includedInCalculationCount: 0,
            }),
          ),
        ],
        selectedIds: new Set<string>(),
        onToggleSelect: () => {},
        onSelectAll: () => {},
        onClearSelection: () => {},
      }),
    )

    expect(html).toContain('Mais rápido que previsto')
    expect(html).toContain('Dentro do previsto')
    expect(html).toContain('2 no cálculo · 1 parcial')
    expect(html).toContain('1 sem tempo previsto')
    expect(html).toContain('1 não iniciada')
    expect(html).toContain('1 concluída sem apontamento')
    expect(html).toContain('Sem base calculável')
    expect(html).not.toContain('>Mais rápido<')
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
