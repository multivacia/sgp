import { describe, expect, it } from 'vitest'
import type { MatrixNodeTreeApi } from '../../../domain/operation-matrix/operation-matrix.types'
import type { MatrixCatalogTaskEntry } from './extractMatrixTasksForCatalog'
import { matrixCatalogEntryOverlapsCurrentMatrix } from './matrixCatalogEntryOverlapsMatrix'

function itemWithTasks(
  tasks: Array<Partial<MatrixNodeTreeApi> & Pick<MatrixNodeTreeApi, 'id' | 'name'>>,
): MatrixNodeTreeApi {
  return {
    id: 'item-1',
    parent_id: null,
    root_id: 'item-1',
    node_type: 'ITEM',
    code: null,
    name: 'Oferta',
    description: null,
    order_index: 0,
    level_depth: 0,
    is_active: true,
    planned_minutes: null,
    default_responsible_id: null,
    team_ids: [],
    required: false,
    source_key: null,
    metadata_json: null,
    created_at: '',
    updated_at: '',
    deleted_at: null,
    children: tasks.map((t, i) => ({
      id: t.id,
      parent_id: 'item-1',
      root_id: 'item-1',
      node_type: 'TASK' as const,
      code: null,
      name: t.name,
      description: null,
      order_index: t.order_index ?? i,
      level_depth: 1,
      is_active: true,
      planned_minutes: null,
      default_responsible_id: null,
      team_ids: [],
      required: false,
      source_key: t.source_key ?? null,
      metadata_json: null,
      created_at: '',
      updated_at: '',
      deleted_at: null,
      children: [],
    })),
  }
}

function entry(opts: {
  taskId: string
  taskName: string
  sourceKey?: string | null
}): MatrixCatalogTaskEntry {
  const taskSubtree: MatrixNodeTreeApi = {
    id: opts.taskId,
    parent_id: null,
    root_id: opts.taskId,
    node_type: 'TASK',
    code: null,
    name: opts.taskName,
    description: null,
    order_index: 0,
    level_depth: 1,
    is_active: true,
    planned_minutes: null,
    default_responsible_id: null,
    team_ids: [],
    required: false,
    source_key: opts.sourceKey ?? null,
    metadata_json: null,
    created_at: '',
    updated_at: '',
    deleted_at: null,
    children: [],
  }
  return {
    taskId: opts.taskId,
    taskName: opts.taskName,
    matrixItemId: 'other',
    matrixItemName: 'Outra',
    taskSubtree,
  }
}

describe('matrixCatalogEntryOverlapsCurrentMatrix', () => {
  it('retorna falso sem árvore', () => {
    expect(
      matrixCatalogEntryOverlapsCurrentMatrix(
        entry({ taskId: 'a', taskName: 'X' }),
        null,
      ),
    ).toBe(false)
  })

  it('associa por source_key quando ambos definidos', () => {
    const tree = itemWithTasks([
      { id: 't1', name: 'Nome diferente', source_key: 'sk-1' },
    ])
    expect(
      matrixCatalogEntryOverlapsCurrentMatrix(
        entry({ taskId: 'ext', taskName: 'Outro', sourceKey: 'sk-1' }),
        tree,
      ),
    ).toBe(true)
  })

  it('cai no nome quando source_key ausente no catálogo', () => {
    const tree = itemWithTasks([{ id: 't1', name: 'Limpeza' }])
    expect(
      matrixCatalogEntryOverlapsCurrentMatrix(
        entry({ taskId: 'ext', taskName: 'Limpeza' }),
        tree,
      ),
    ).toBe(true)
  })

  it('nome case-insensitive', () => {
    const tree = itemWithTasks([{ id: 't1', name: 'ABC' }])
    expect(
      matrixCatalogEntryOverlapsCurrentMatrix(
        entry({ taskId: 'ext', taskName: 'abc' }),
        tree,
      ),
    ).toBe(true)
  })

  it('retorna falso quando não há coincidência', () => {
    const tree = itemWithTasks([{ id: 't1', name: 'A' }])
    expect(
      matrixCatalogEntryOverlapsCurrentMatrix(
        entry({ taskId: 'ext', taskName: 'B', sourceKey: 'x' }),
        tree,
      ),
    ).toBe(false)
  })
})
