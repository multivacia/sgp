import { describe, expect, it } from 'vitest'
import type { MatrixNodeTreeApi } from '../../../domain/operation-matrix/operation-matrix.types'
import {
  buildAppliedMatrixBlock,
  countActivitiesInTree,
  defaultSelectedActivityIds,
  extractSectorGroupsFromMatrix,
  summarizeAppliedBlocks,
} from './laboratorioEsteirasState'

function node(
  partial: Partial<MatrixNodeTreeApi> & Pick<MatrixNodeTreeApi, 'id' | 'node_type' | 'name'>,
  children: MatrixNodeTreeApi[] = [],
): MatrixNodeTreeApi {
  return {
    parent_id: null,
    root_id: 'root',
    code: null,
    description: null,
    order_index: 0,
    level_depth: 0,
    is_active: true,
    planned_minutes: null,
    default_responsible_id: null,
    team_ids: [],
    required: true,
    source_key: null,
    metadata_json: null,
    created_at: '',
    updated_at: '',
    deleted_at: null,
    children,
    ...partial,
  }
}

const sampleTree = node(
  { id: 'item-1', node_type: 'ITEM', name: 'Sofá 3 lugares' },
  [
    node({ id: 'task-1', node_type: 'TASK', name: 'Reforma', order_index: 0 }, [
      node({ id: 'sector-1', node_type: 'SECTOR', name: 'Estrutura', order_index: 0 }, [
        node({
          id: 'act-1',
          node_type: 'ACTIVITY',
          name: 'Desmontagem',
          planned_minutes: 60,
          order_index: 0,
        }),
        node({
          id: 'act-2',
          node_type: 'ACTIVITY',
          name: 'Inspeção',
          planned_minutes: 30,
          order_index: 1,
        }),
      ]),
      node({ id: 'sector-2', node_type: 'SECTOR', name: 'Costura', order_index: 1 }, [
        node({
          id: 'act-3',
          node_type: 'ACTIVITY',
          name: 'Corte',
          planned_minutes: 60,
          order_index: 0,
        }),
      ]),
    ]),
  ],
)

describe('laboratorioEsteirasState', () => {
  it('lista atividades e setores da matriz', () => {
    expect(countActivitiesInTree(sampleTree)).toBe(3)
    expect(extractSectorGroupsFromMatrix(sampleTree)).toHaveLength(2)
    expect(defaultSelectedActivityIds(sampleTree).size).toBe(3)
  })

  it('filtra atividades selecionadas ao montar bloco', () => {
    const selected = new Set(['act-1', 'act-3'])
    const block = buildAppliedMatrixBlock(
      sampleTree,
      'item-1',
      'Sofá 3 lugares',
      selected,
      'block-1',
    )
    expect(block).not.toBeNull()
    expect(block!.selectedActivityIds).toEqual(['act-1', 'act-3'])
    expect(block!.options).toHaveLength(1)
    expect(block!.options[0]!.areas).toHaveLength(2)
    expect(block!.options[0]!.areas[0]!.steps).toHaveLength(1)
    expect(block!.options[0]!.areas[1]!.steps[0]!.titulo).toBe('Corte')
  })

  it('aplica override de nome e tempo', () => {
    const selected = new Set(['act-1'])
    const block = buildAppliedMatrixBlock(
      sampleTree,
      'item-1',
      'Sofá 3 lugares',
      selected,
      'block-1',
      { 'act-1': { name: 'Desmontagem extra', plannedMinutes: 90 } },
    )
    const step = block!.options[0]!.areas[0]!.steps[0]!
    expect(step.titulo).toBe('Desmontagem extra')
    expect(step.plannedMinutes).toBe(90)
  })

  it('resume blocos aplicados', () => {
    const block = buildAppliedMatrixBlock(
      sampleTree,
      'item-1',
      'Sofá 3 lugares',
      defaultSelectedActivityIds(sampleTree),
      'block-1',
    )!
    const summary = summarizeAppliedBlocks([block])
    expect(summary.matrixCount).toBe(1)
    expect(summary.activityCount).toBe(3)
    expect(summary.totalMinutes).toBe(150)
  })
})
