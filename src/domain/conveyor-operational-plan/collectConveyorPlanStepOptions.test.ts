import { describe, expect, it } from 'vitest'
import { collectConveyorPlanStepOptions } from './collectConveyorPlanStepOptions'
import type { ConveyorStructure } from '../conveyors/conveyor.types'

describe('collectConveyorPlanStepOptions', () => {
  it('flattens OPTION > AREA > STEP', () => {
    const structure: ConveyorStructure = {
      options: [
        {
          id: 'o1',
          name: 'Tarefa A',
          orderIndex: 0,
          areas: [
            {
              id: 'a1',
              name: 'Setor 1',
              orderIndex: 0,
              steps: [
                {
                  id: 's1',
                  name: 'Atividade 1',
                  orderIndex: 0,
                  plannedMinutes: 30,
                  operationalStatus: 'PENDING',
                  isCompleted: false,
                  completedAt: null,
                  completedByName: null,
                  completionEventId: null,
                },
              ],
            },
          ],
        },
      ],
    }
    const opts = collectConveyorPlanStepOptions(structure)
    expect(opts).toHaveLength(1)
    expect(opts[0]?.label).toContain('Tarefa A')
    expect(opts[0]?.plannedMinutes).toBe(30)
  })
})
