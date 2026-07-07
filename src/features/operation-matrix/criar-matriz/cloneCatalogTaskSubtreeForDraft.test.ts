import { describe, expect, it } from 'vitest'
import type { MatrixNodeTreeApi } from '../../../domain/operation-matrix/operation-matrix.types'
import { cloneTaskSubtreeWithNewIds } from './cloneCatalogTaskSubtreeForDraft'

function activity(id: string, source_key: string | null = null): MatrixNodeTreeApi {
  return {
    id,
    parent_id: 'sector-1',
    root_id: 'task-1',
    node_type: 'ACTIVITY',
    code: null,
    name: 'Activity',
    description: null,
    order_index: 0,
    level_depth: 3,
    is_active: true,
    planned_minutes: 10,
    default_responsible_id: null,
    team_ids: [],
    required: true,
    source_key,
    metadata_json: null,
    created_at: '',
    updated_at: '',
    deleted_at: null,
    children: [],
  }
}

function minimalTaskTree(act: MatrixNodeTreeApi): MatrixNodeTreeApi {
  return {
    id: 'task-1',
    parent_id: null,
    root_id: 'task-1',
    node_type: 'TASK',
    code: null,
    name: 'Task',
    description: null,
    order_index: 0,
    level_depth: 1,
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
    children: [
      {
        id: 'sector-1',
        parent_id: 'task-1',
        root_id: 'task-1',
        node_type: 'SECTOR',
        code: null,
        name: 'Sector',
        description: null,
        order_index: 0,
        level_depth: 2,
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
        children: [act],
      },
    ],
  }
}

describe('cloneTaskSubtreeWithNewIds', () => {
  it('propaga source_key resolvida (id de origem quando source_key null)', () => {
    const cloned = cloneTaskSubtreeWithNewIds(minimalTaskTree(activity('act-orig', null)))
    const step = cloned.children[0]!.children[0]!
    expect(step.id).not.toBe('act-orig')
    expect(step.source_key).toBe('act-orig')
  })

  it('preserva source_key explícita do original (não o novo id)', () => {
    const cloned = cloneTaskSubtreeWithNewIds(
      minimalTaskTree(activity('act-orig', 'stable-lineage')),
    )
    const step = cloned.children[0]!.children[0]!
    expect(step.source_key).toBe('stable-lineage')
  })
})
