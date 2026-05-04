import { describe, expect, it } from 'vitest'
import {
  detectSyntheticSubtreeRollupInCreatePayload,
  detectSyntheticSubtreeRollupNodes,
  detectSyntheticSubtreeRollupNodesFromDetailStructure,
  detectSyntheticSubtreeRollupNodesFromFlatRows,
  detectSyntheticSubtreeRollupNodesFromPostBody,
} from '../modules/conveyors/conveyorCreateDiagnostics.js'
import type { PostConveyorBody } from '../modules/conveyors/conveyors.schemas.js'

describe('detectSyntheticSubtreeRollupInCreatePayload (S9.4.5)', () => {
  it('rejeita pseudo-etapa oficial: Área + step = TASK quando já há setor real', () => {
    const t = '16 - VOLANTE'
    const body: Pick<PostConveyorBody, 'options'> = {
      options: [
        {
          titulo: t,
          orderIndex: 1,
          sourceOrigin: 'manual',
          areas: [
            {
              titulo: 'Área',
              orderIndex: 1,
              sourceOrigin: 'manual',
              steps: [
                {
                  titulo: t,
                  orderIndex: 1,
                  plannedMinutes: 250,
                  sourceOrigin: 'manual',
                  assignees: [],
                },
              ],
            },
            {
              titulo: 'PREPARAÇÃO',
              orderIndex: 2,
              sourceOrigin: 'manual',
              steps: [
                {
                  titulo: 'Remover revestimento',
                  orderIndex: 1,
                  plannedMinutes: 10,
                  sourceOrigin: 'manual',
                  assignees: [],
                },
                {
                  titulo: 'Limpar',
                  orderIndex: 2,
                  plannedMinutes: 10,
                  sourceOrigin: 'manual',
                  assignees: [],
                },
              ],
            },
          ],
        },
      ],
    }
    const f = detectSyntheticSubtreeRollupInCreatePayload(body)
    expect(f).toHaveLength(1)
    expect(f[0]?.reason).toBe('official_placeholder_task_rollstep_duplicate')
    expect(f[0]?.plannedMinutes).toBe(250)
  })

  it('não acusa quando só existe área placeholder com rollup (sem setores reais)', () => {
    const t = '16 - VOLANTE'
    const body: Pick<PostConveyorBody, 'options'> = {
      options: [
        {
          titulo: t,
          orderIndex: 1,
          sourceOrigin: 'manual',
          areas: [
            {
              titulo: 'Área',
              orderIndex: 1,
              sourceOrigin: 'manual',
              steps: [
                {
                  titulo: t,
                  orderIndex: 1,
                  plannedMinutes: 250,
                  sourceOrigin: 'manual',
                  assignees: [],
                },
              ],
            },
          ],
        },
      ],
    }
    expect(detectSyntheticSubtreeRollupInCreatePayload(body)).toEqual([])
  })

  it('aceita opção só com setores nomeados (sem Área/Serviço)', () => {
    const body: Pick<PostConveyorBody, 'options'> = {
      options: [
        {
          titulo: '16 - VOLANTE',
          orderIndex: 1,
          sourceOrigin: 'manual',
          areas: [
            {
              titulo: 'PREPARAÇÃO',
              orderIndex: 1,
              sourceOrigin: 'manual',
              steps: [
                {
                  titulo: 'Remover revestimento',
                  orderIndex: 1,
                  plannedMinutes: 10,
                  sourceOrigin: 'manual',
                  assignees: [],
                },
                {
                  titulo: 'Limpar',
                  orderIndex: 2,
                  plannedMinutes: 10,
                  sourceOrigin: 'manual',
                  assignees: [],
                },
              ],
            },
            {
              titulo: 'CORTE',
              orderIndex: 2,
              sourceOrigin: 'manual',
              steps: [
                {
                  titulo: 'Corte couro',
                  orderIndex: 1,
                  plannedMinutes: 40,
                  sourceOrigin: 'manual',
                  assignees: [],
                },
              ],
            },
          ],
        },
      ],
    }
    expect(detectSyntheticSubtreeRollupInCreatePayload(body)).toEqual([])
  })
})

describe('conveyorCreateDiagnostics (S9.4.3)', () => {
  it('detectSyntheticSubtreeRollupNodesFromPostBody — payload válido sem rollup', () => {
    const body: PostConveyorBody = {
      dados: { nome: 'E', cliente: '', prioridade: 'media' },
      originType: 'MANUAL',
      matrixRootItemId: null,
      options: [
        {
          titulo: '15 - BANCOS DIANTEIROS',
          orderIndex: 1,
          sourceOrigin: 'manual',
          areas: [
            {
              titulo: 'PREPARAÇÃO',
              orderIndex: 1,
              sourceOrigin: 'manual',
              steps: [
                {
                  titulo: 'Limpar',
                  orderIndex: 1,
                  plannedMinutes: 10,
                  sourceOrigin: 'manual',
                  assignees: [],
                },
              ],
            },
          ],
        },
      ],
    }
    expect(detectSyntheticSubtreeRollupNodesFromPostBody(body)).toEqual([])
    expect(detectSyntheticSubtreeRollupNodes(body)).toEqual([])
  })

  it('detectSyntheticSubtreeRollupNodesFromPostBody — aponta step = título da opção', () => {
    const t = '15 - BANCOS DIANTEIROS'
    const body: PostConveyorBody = {
      dados: { nome: 'E', cliente: '', prioridade: 'media' },
      originType: 'MANUAL',
      matrixRootItemId: null,
      options: [
        {
          titulo: t,
          orderIndex: 1,
          sourceOrigin: 'manual',
          areas: [
            {
              titulo: 'Área',
              orderIndex: 1,
              sourceOrigin: 'manual',
              steps: [
                {
                  titulo: t,
                  orderIndex: 1,
                  plannedMinutes: 825,
                  sourceOrigin: 'reaproveitada',
                  assignees: [],
                },
              ],
            },
          ],
        },
      ],
    }
    const f = detectSyntheticSubtreeRollupNodesFromPostBody(body)
    expect(f.length).toBeGreaterThan(0)
    expect(f.some((x) => x.reason === 'step_title_matches_option_title')).toBe(true)
  })

  it('detectSyntheticSubtreeRollupNodesFromDetailStructure — estrutura GET consistente com POST limpo', () => {
    const structure = {
      options: [
        {
          id: 'opt-1',
          name: 'Opção A',
          orderIndex: 1,
          areas: [
            {
              id: 'ar-1',
              name: 'Área 1',
              orderIndex: 1,
              steps: [
                {
                  id: 'st-1',
                  name: 'Etapa',
                  orderIndex: 1,
                  plannedMinutes: 30,
                  assignees: [],
                },
              ],
            },
          ],
        },
      ],
    }
    expect(detectSyntheticSubtreeRollupNodesFromDetailStructure(structure)).toEqual([])
  })

  it('detectSyntheticSubtreeRollupNodesFromFlatRows — reflecte BD sem pseudo-etapa quando bem formado', () => {
    const rows = [
      {
        id: 'o1',
        parent_id: null,
        node_type: 'OPTION' as const,
        order_index: 1,
        name: 'TASK X',
        planned_minutes: null,
        source_origin: 'manual' as const,
      },
      {
        id: 'a1',
        parent_id: 'o1',
        node_type: 'AREA' as const,
        order_index: 1,
        name: 'PREPARAÇÃO',
        planned_minutes: null,
        source_origin: 'manual' as const,
      },
      {
        id: 's1',
        parent_id: 'a1',
        node_type: 'STEP' as const,
        order_index: 1,
        name: 'Corte',
        planned_minutes: 40,
        source_origin: 'reaproveitada' as const,
      },
    ]
    expect(detectSyntheticSubtreeRollupNodesFromFlatRows(rows)).toEqual([])
  })
})
