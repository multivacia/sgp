import { describe, expect, it } from 'vitest'
import {
  computeConveyorStructureDiff,
  partitionRemovalSubtrees,
  shouldMarkLateAddForNewSteps,
  stepIdsInRemovals,
  type ActiveStructureNode,
  type StructureDiffOptionPayload,
} from '../modules/conveyors/conveyor-structure-diff.js'

const OPT = '11111111-1111-1111-1111-111111111111'
const AREA = '22222222-2222-2222-2222-222222222222'
const STEP = '33333333-3333-3333-3333-333333333333'
const STEP2 = '44444444-4444-4444-4444-444444444444'

function activeTree(): ActiveStructureNode[] {
  return [
    {
      id: OPT,
      parent_id: null,
      node_type: 'OPTION',
      order_index: 1,
      name: 'Opção A',
      is_active: true,
    },
    {
      id: AREA,
      parent_id: OPT,
      node_type: 'AREA',
      order_index: 1,
      name: 'Área 1',
      is_active: true,
    },
    {
      id: STEP,
      parent_id: AREA,
      node_type: 'STEP',
      order_index: 1,
      name: 'Etapa 1',
      is_active: true,
    },
    {
      id: STEP2,
      parent_id: AREA,
      node_type: 'STEP',
      order_index: 2,
      name: 'Etapa 2',
      is_active: true,
    },
  ]
}

function payloadKeepAll(renameStep?: string): StructureDiffOptionPayload[] {
  return [
    {
      id: OPT,
      titulo: 'Opção A',
      orderIndex: 1,
      sourceOrigin: 'manual',
      areas: [
        {
          id: AREA,
          titulo: 'Área 1',
          orderIndex: 1,
          sourceOrigin: 'manual',
          steps: [
            {
              id: STEP,
              titulo: renameStep ?? 'Etapa 1',
              orderIndex: 1,
              plannedMinutes: 30,
              sourceOrigin: 'manual',
              required: true,
              assignees: [],
            },
            {
              id: STEP2,
              titulo: 'Etapa 2',
              orderIndex: 2,
              plannedMinutes: 15,
              sourceOrigin: 'manual',
              required: true,
              assignees: [],
            },
          ],
        },
      ],
    },
  ]
}

describe('computeConveyorStructureDiff', () => {
  it('atualiza nós matched e não remove quando payload cobre a árvore', () => {
    const result = computeConveyorStructureDiff({
      options: payloadKeepAll('Etapa renomeada'),
      activeNodes: activeTree(),
    })
    expect(result.error).toBeNull()
    expect(result.diff!.removals).toHaveLength(0)
    expect(result.diff!.inserts).toHaveLength(0)
    expect(result.diff!.matchedStepIds).toEqual([STEP, STEP2])
    const stepUpd = result.diff!.updates.find((u) => u.id === STEP)
    expect(stepUpd?.name).toBe('Etapa renomeada')
    expect(stepUpd?.plannedMinutes).toBe(30)
  })

  it('marca insert quando payload não traz id', () => {
    const result = computeConveyorStructureDiff({
      options: [
        {
          id: OPT,
          titulo: 'Opção A',
          orderIndex: 1,
          sourceOrigin: 'manual',
          areas: [
            {
              id: AREA,
              titulo: 'Área 1',
              orderIndex: 1,
              sourceOrigin: 'manual',
              steps: [
                {
                  id: STEP,
                  titulo: 'Etapa 1',
                  orderIndex: 1,
                  plannedMinutes: 30,
                  sourceOrigin: 'manual',
                },
                {
                  titulo: 'Nova etapa',
                  orderIndex: 3,
                  plannedMinutes: 10,
                  sourceOrigin: 'manual',
                },
              ],
            },
          ],
        },
      ],
      activeNodes: activeTree(),
    })
    expect(result.error).toBeNull()
    expect(result.diff!.inserts).toHaveLength(1)
    expect(result.diff!.inserts[0]!.nodeType).toBe('STEP')
    expect(result.diff!.inserts[0]!.name).toBe('Nova etapa')
    expect(result.diff!.removals.map((r) => r.id)).toEqual([STEP2])
  })

  it('rejeita id desconhecido', () => {
    const result = computeConveyorStructureDiff({
      options: [
        {
          id: '99999999-9999-9999-9999-999999999999',
          titulo: 'X',
          orderIndex: 1,
          sourceOrigin: 'manual',
          areas: [
            {
              titulo: 'A',
              orderIndex: 1,
              sourceOrigin: 'manual',
              steps: [
                {
                  titulo: 'S',
                  orderIndex: 1,
                  plannedMinutes: 1,
                  sourceOrigin: 'manual',
                },
              ],
            },
          ],
        },
      ],
      activeNodes: activeTree(),
    })
    expect(result.diff).toBeNull()
    expect(result.error?.code).toBe('UNKNOWN_NODE_ID')
  })

  it('rejeita tipo incorreto (STEP id em OPTION)', () => {
    const result = computeConveyorStructureDiff({
      options: [
        {
          id: STEP,
          titulo: 'X',
          orderIndex: 1,
          sourceOrigin: 'manual',
          areas: [
            {
              titulo: 'A',
              orderIndex: 1,
              sourceOrigin: 'manual',
              steps: [
                {
                  titulo: 'S',
                  orderIndex: 1,
                  plannedMinutes: 1,
                  sourceOrigin: 'manual',
                },
              ],
            },
          ],
        },
      ],
      activeNodes: activeTree(),
    })
    expect(result.diff).toBeNull()
    expect(result.error?.code).toBe('WRONG_NODE_TYPE')
  })

  it('payload sem ids remove todos os ativos e agenda inserts', () => {
    const result = computeConveyorStructureDiff({
      options: [
        {
          titulo: 'Nova opção',
          orderIndex: 1,
          sourceOrigin: 'manual',
          areas: [
            {
              titulo: 'Nova área',
              orderIndex: 1,
              sourceOrigin: 'manual',
              steps: [
                {
                  titulo: 'Nova etapa',
                  orderIndex: 1,
                  plannedMinutes: 5,
                  sourceOrigin: 'manual',
                },
              ],
            },
          ],
        },
      ],
      activeNodes: activeTree(),
    })
    expect(result.error).toBeNull()
    expect(result.diff!.inserts).toHaveLength(3)
    expect(result.diff!.removals).toHaveLength(4)
    expect(result.diff!.removals[0]!.nodeType).toBe('STEP')
    expect(result.diff!.removals.at(-1)!.nodeType).toBe('OPTION')
  })
})

describe('partitionRemovalSubtrees / lateAdd', () => {
  it('particiona remoções por raiz de subárvore', () => {
    const removals = [
      { id: STEP, nodeType: 'STEP' as const, parentId: AREA },
      { id: STEP2, nodeType: 'STEP' as const, parentId: AREA },
      { id: AREA, nodeType: 'AREA' as const, parentId: OPT },
    ]
    const parts = partitionRemovalSubtrees(removals)
    expect(parts).toHaveLength(1)
    expect(stepIdsInRemovals(parts[0]!)).toEqual(
      expect.arrayContaining([STEP, STEP2]),
    )
  })

  it('shouldMarkLateAddForNewSteps só fora de elaboração/aguardando', () => {
    expect(shouldMarkLateAddForNewSteps('EM_ELABORACAO')).toBe(false)
    expect(shouldMarkLateAddForNewSteps('AGUARDANDO_PLANEJAMENTO')).toBe(false)
    expect(shouldMarkLateAddForNewSteps('EM_ANDAMENTO')).toBe(true)
    expect(shouldMarkLateAddForNewSteps('FINALIZADA')).toBe(true)
  })
})
