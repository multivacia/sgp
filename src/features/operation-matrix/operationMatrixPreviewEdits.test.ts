import { describe, expect, it } from 'vitest'
import type { MatrixNodeTreeApi } from '../../domain/operation-matrix/operation-matrix.types'
import {
  activityFieldsSignature,
  collectActivityFieldDiffs,
  matrixPreviewActivityInfoFlags,
  patchActivityFieldsInTreeClone,
  validatePreviewActivityTree,
} from './operationMatrixPreviewEdits'

function act(
  id: string,
  opts: Partial<{
    planned_minutes: number | null
    default_responsible_id: string | null
    required: boolean
    is_active: boolean
  }> = {},
): MatrixNodeTreeApi {
  return {
    id,
    parent_id: 'p',
    root_id: 'root',
    node_type: 'ACTIVITY',
    code: null,
    name: 'A',
    description: null,
    order_index: 0,
    level_depth: 3,
    is_active: opts.is_active ?? true,
    planned_minutes: opts.planned_minutes ?? 10,
    default_responsible_id: opts.default_responsible_id ?? null,
    team_ids: [],
    required: opts.required ?? false,
    source_key: null,
    metadata_json: null,
    created_at: '',
    updated_at: '',
    deleted_at: null,
    children: [],
  }
}

function itemWithActivity(activity: MatrixNodeTreeApi): MatrixNodeTreeApi {
  return {
    id: 'root',
    parent_id: null,
    root_id: 'root',
    node_type: 'ITEM',
    code: null,
    name: 'M',
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
    children: [
      {
        id: 'task',
        parent_id: 'root',
        root_id: 'root',
        node_type: 'TASK',
        code: null,
        name: 'T',
        description: null,
        order_index: 0,
        level_depth: 1,
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
        children: [
          {
            id: 'sector',
            parent_id: 'task',
            root_id: 'root',
            node_type: 'SECTOR',
            code: null,
            name: 'S',
            description: null,
            order_index: 0,
            level_depth: 2,
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
            children: [activity],
          },
        ],
      },
    ],
  }
}

describe('operationMatrixPreviewEdits', () => {
  it('patchActivityFieldsInTreeClone updates activity fields', () => {
    const tree = itemWithActivity(act('a1', { planned_minutes: 5 }))
    const next = patchActivityFieldsInTreeClone(tree, 'a1', {
      planned_minutes: 20,
      default_responsible_id: '550e8400-e29b-41d4-a716-446655440000',
    })
    const node = next.children[0]?.children[0]?.children[0]
    expect(node?.planned_minutes).toBe(20)
    expect(node?.default_responsible_id).toBe('550e8400-e29b-41d4-a716-446655440000')
    expect(tree.children[0]?.children[0]?.children[0]?.planned_minutes).toBe(5)
  })

  it('activityFieldsSignature detects changes', () => {
    const a = itemWithActivity(act('a1', { planned_minutes: 10 }))
    const b = patchActivityFieldsInTreeClone(a, 'a1', { planned_minutes: 11 })
    expect(activityFieldsSignature(a)).not.toBe(activityFieldsSignature(b))
  })

  it('validatePreviewActivityTree rejects negative minutes', () => {
    const tree = itemWithActivity(act('a1', { planned_minutes: -1 }))
    expect(validatePreviewActivityTree(tree).ok).toBe(false)
  })

  it('validatePreviewActivityTree allows zero minutes for required active activity', () => {
    const zero = itemWithActivity(
      act('a1', { planned_minutes: 0, required: true, is_active: true }),
    )
    expect(validatePreviewActivityTree(zero).ok).toBe(true)
  })

  it('validatePreviewActivityTree allows null minutes', () => {
    const tree = itemWithActivity(act('a1', { planned_minutes: null }))
    expect(validatePreviewActivityTree(tree).ok).toBe(true)
  })

  it('matrixPreviewActivityInfoFlags detects missing time and responsible', () => {
    expect(
      matrixPreviewActivityInfoFlags(0, '550e8400-e29b-41d4-a716-446655440000'),
    ).toEqual({ missingEffectiveTime: true, missingResponsible: false })
    expect(matrixPreviewActivityInfoFlags(null, null)).toEqual({
      missingEffectiveTime: true,
      missingResponsible: true,
    })
    expect(matrixPreviewActivityInfoFlags(15, null)).toEqual({
      missingEffectiveTime: false,
      missingResponsible: true,
    })
    expect(
      matrixPreviewActivityInfoFlags(10, '550e8400-e29b-41d4-a716-446655440000'),
    ).toEqual({ missingEffectiveTime: false, missingResponsible: false })
  })

  it('collectActivityFieldDiffs lists changed activities only', () => {
    const base = itemWithActivity(act('a1', { planned_minutes: 10, default_responsible_id: null }))
    const work = patchActivityFieldsInTreeClone(base, 'a1', {
      planned_minutes: 12,
      default_responsible_id: '550e8400-e29b-41d4-a716-446655440001',
    })
    const diffs = collectActivityFieldDiffs(base, work)
    expect(diffs).toHaveLength(1)
    expect(diffs[0]?.id).toBe('a1')
    expect(diffs[0]?.patch.planned_minutes).toBe(12)
    expect(diffs[0]?.patch.default_responsible_id).toBe(
      '550e8400-e29b-41d4-a716-446655440001',
    )
  })
})
