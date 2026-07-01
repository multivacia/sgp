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
  tasks: [
    {
      taskId: 'task-1',
      taskName: 'Bancos',
      plannedMinutes: 120,
      realizedMinutes: 40,
      remainingMinutes: 80,
      exceededMinutes: 0,
      progressPercent: 33,
      sectors: [
        {
          sectorId: 'sector-1',
          sectorName: 'Costura',
          plannedMinutes: 120,
          realizedMinutes: 40,
          remainingMinutes: 80,
          exceededMinutes: 0,
          progressPercent: 33,
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
