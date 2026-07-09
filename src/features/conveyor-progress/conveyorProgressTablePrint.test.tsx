import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ConveyorProgressTable } from './ConveyorProgressTable'
import type { ConveyorProgressItem } from '../../domain/conveyor-progress/conveyorProgress.types'

const sampleItem: ConveyorProgressItem = {
  conveyorId: 'conv-1',
  conveyorCode: 'OS-1',
  conveyorName: 'Gol',
  operationalStatus: 'EM_ANDAMENTO',
  plannedMinutes: 120,
  realizedMinutes: 40,
  remainingMinutes: 80,
  exceededMinutes: 0,
  progressPercent: 33,
  timeEfficiency: {
    status: 'MAIS_RAPIDO',
    efficiencyPct: 300,
    deviationMinutes: -80,
    deviationPct: -66.7,
    classification: 'MAIS_RAPIDO',
    notStartedCount: 0,
    withoutPlannedTimeCount: 0,
    completedWithoutTimeCount: 0,
    partialCount: 1,
    includedInCalculationCount: 1,
  },
  tasks: [
    {
      taskId: 'task-1',
      taskName: 'Bancos',
      plannedMinutes: 120,
      realizedMinutes: 40,
      remainingMinutes: 80,
      exceededMinutes: 0,
      progressPercent: 33,
      timeEfficiency: {
        status: 'MAIS_RAPIDO',
        efficiencyPct: 300,
        deviationMinutes: -80,
        deviationPct: -66.7,
        classification: 'MAIS_RAPIDO',
        notStartedCount: 0,
        withoutPlannedTimeCount: 0,
        completedWithoutTimeCount: 0,
        partialCount: 1,
        includedInCalculationCount: 1,
      },
      sectors: [
        {
          sectorId: 'sector-1',
          sectorName: 'Costura',
          plannedMinutes: 120,
          realizedMinutes: 40,
          remainingMinutes: 80,
          exceededMinutes: 0,
          progressPercent: 33,
          timeEfficiency: {
            status: 'MAIS_RAPIDO',
            efficiencyPct: 300,
            deviationMinutes: -80,
            deviationPct: -66.7,
            classification: 'MAIS_RAPIDO',
            notStartedCount: 0,
            withoutPlannedTimeCount: 0,
            completedWithoutTimeCount: 0,
            partialCount: 1,
            includedInCalculationCount: 1,
          },
          activities: [
            {
              activityId: 'step-1',
              activityName: 'Costurar lateral',
              status: 'IN_PROGRESS',
              collaboratorName: 'Marcio',
              plannedMinutes: 60,
              realizedMinutes: 20,
              remainingMinutes: 40,
              exceededMinutes: 0,
              progressPercent: 33,
              timeEfficiency: {
                status: 'MAIS_RAPIDO',
                isPartial: true,
                includedInCalculation: true,
                efficiencyPct: 300,
                deviationMinutes: -40,
                deviationPct: -66.7,
                classification: 'MAIS_RAPIDO',
              },
              timeEntries: [],
            },
          ],
        },
      ],
    },
  ],
}

describe('ConveyorProgressTable activity print action', () => {
  it('aceita callback de impressão avulsa por atividade', () => {
    const html = renderToStaticMarkup(
      createElement(ConveyorProgressTable, {
        items: [sampleItem],
        selectedIds: new Set<string>(),
        onToggleSelect: () => {},
        onSelectAll: () => {},
        onClearSelection: () => {},
        onPrintActivity: () => {},
      }),
    )

    expect(html).toContain('Gol')
    expect(html).toContain('Esteira')
  })
})
