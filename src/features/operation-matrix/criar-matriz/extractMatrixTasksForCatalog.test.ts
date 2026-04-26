import { describe, expect, it } from 'vitest'
import { extractCatalogTasksFromItemTree } from './extractMatrixTasksForCatalog'
import type { MatrixNodeTreeApi } from '../../../domain/operation-matrix/operation-matrix.types'

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
  } as MatrixNodeTreeApi
}

describe('extractCatalogTasksFromItemTree', () => {
  it('extrai TASK filhos diretos do ITEM', () => {
    const item = node(
      { id: 'item-1', node_type: 'ITEM', name: 'Carpete' },
      [
        node({ id: 't1', node_type: 'TASK', name: 'Opção A', parent_id: 'item-1' }),
        node({ id: 't2', node_type: 'TASK', name: 'Opção B', parent_id: 'item-1' }),
      ],
    )
    const rows = extractCatalogTasksFromItemTree('item-1', 'Carpete', item)
    expect(rows).toHaveLength(2)
    expect(rows.map((r) => r.taskId)).toEqual(['t1', 't2'])
    expect(rows[0]?.matrixItemName).toBe('Carpete')
    expect(rows[0]?.taskSubtree.id).toBe('t1')
  })

  it('retorna vazio se a raiz não for ITEM', () => {
    const task = node({ id: 'x', node_type: 'TASK', name: 'X' })
    expect(extractCatalogTasksFromItemTree('i', 'M', task)).toEqual([])
  })
})
