import { describe, expect, it } from 'vitest'
import type { MatrixNodeTreeApi } from '../../domain/operation-matrix/operation-matrix.types'
import {
  findNodeById,
  findParentIdOf,
  orderTreeMatchesBaseline,
  computeOrderPatches,
  reorderSiblingStep,
  reorderItemChildTasksToOrder,
  reorderSiblingsRelativeToOver,
  snapshotOrderMap,
} from './matrixStructureReorder'

function makeActivity(
  id: string,
  order: number,
  name: string,
): MatrixNodeTreeApi {
  return {
    id,
    parent_id: 's1',
    root_id: 'item',
    node_type: 'ACTIVITY',
    code: null,
    name,
    description: null,
    order_index: order,
    level_depth: 3,
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
    children: [],
  }
}

function makeSector(
  id: string,
  order: number,
  activities: MatrixNodeTreeApi[],
): MatrixNodeTreeApi {
  return {
    id,
    parent_id: 't1',
    root_id: 'item',
    node_type: 'SECTOR',
    code: null,
    name: `Sector ${id}`,
    description: null,
    order_index: order,
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
    children: activities.map((a) => ({
      ...a,
      parent_id: id,
    })),
  }
}

function makeTask(sectors: MatrixNodeTreeApi[]): MatrixNodeTreeApi {
  return {
    id: 't1',
    parent_id: 'item',
    root_id: 'item',
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
    children: sectors.map((s) => ({
      ...s,
      parent_id: 't1',
    })),
  }
}

function makeFixture(): MatrixNodeTreeApi {
  const a1 = makeActivity('a1', 0, 'Etapa 1')
  const a2 = makeActivity('a2', 1, 'Etapa 2')
  const a3 = makeActivity('a3', 2, 'Etapa 3')
  const s1 = makeSector('s1', 0, [a1, a2])
  const s2 = makeSector('s2', 1, [a3])
  return {
    id: 'item',
    parent_id: null,
    root_id: 'item',
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
    required: true,
    source_key: null,
    metadata_json: null,
    created_at: '',
    updated_at: '',
    deleted_at: null,
    children: [makeTask([s1, s2])],
  }
}

describe('matrixStructureReorder', () => {
  it('reorderItemChildTasksToOrder reindexes TASK children under ITEM', () => {
    const tX: MatrixNodeTreeApi = {
      id: 'ta',
      parent_id: 'item',
      root_id: 'item',
      node_type: 'TASK',
      code: null,
      name: 'A',
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
      children: [],
    }
    const tY: MatrixNodeTreeApi = {
      ...tX,
      id: 'tb',
      name: 'B',
      order_index: 1,
    }
    const root: MatrixNodeTreeApi = {
      id: 'item',
      parent_id: null,
      root_id: 'item',
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
      required: true,
      source_key: null,
      metadata_json: null,
      created_at: '',
      updated_at: '',
      deleted_at: null,
      children: [tX, tY],
    }
    const next = reorderItemChildTasksToOrder(root, 'item', ['tb', 'ta'])
    expect(next).not.toBeNull()
    const kids = findNodeById(next!, 'item')!.children.filter(
      (c) => c.node_type === 'TASK',
    )
    expect(kids.map((k) => k.id)).toEqual(['tb', 'ta'])
    expect(kids.map((k) => k.order_index)).toEqual([0, 1])
  })

  it('reorders activity within the same sector', () => {
    const tree = makeFixture()
    const base = snapshotOrderMap(tree)
    const next = reorderSiblingsRelativeToOver(tree, 'a2', 'a1')
    expect(next).not.toBeNull()
    const s1 = findNodeById(next!, 's1')!
    const acts = s1.children
      .filter((c) => c.node_type === 'ACTIVITY')
      .slice()
      .sort((a, b) => a.order_index - b.order_index)
    expect(acts.map((a) => a.id)).toEqual(['a2', 'a1'])
    expect(acts.map((a) => a.order_index)).toEqual([0, 1])
    expect(orderTreeMatchesBaseline(next!, base)).toBe(false)
  })

  it('reorders sector within the same task; activities stay under sector', () => {
    const tree = makeFixture()
    const next = reorderSiblingsRelativeToOver(tree, 's2', 's1')
    expect(next).not.toBeNull()
    const task = findNodeById(next!, 't1')!
    const secs = task.children
      .filter((c) => c.node_type === 'SECTOR')
      .slice()
      .sort((a, b) => a.order_index - b.order_index)
    expect(secs.map((s) => s.id)).toEqual(['s2', 's1'])
    expect(findParentIdOf(next!, 'a3')).toBe('s2')
    const s2 = findNodeById(next!, 's2')
    expect(s2?.children.some((c) => c.id === 'a3')).toBe(true)
  })

  it('does not move activity to another sector', () => {
    const tree = makeFixture()
    expect(reorderSiblingsRelativeToOver(tree, 'a1', 'a3')).toBeNull()
  })

  it('reorderSiblingStep matches swap up/down', () => {
    const tree = makeFixture()
    const up = reorderSiblingStep(tree, 'a2', 'up')
    expect(up).not.toBeNull()
    const s1 = findNodeById(up!, 's1')!
    const ordered = s1.children
      .filter((c) => c.node_type === 'ACTIVITY')
      .slice()
      .sort((a, b) => a.order_index - b.order_index)
    expect(ordered[0].id).toBe('a2')
  })

  it('computeOrderPatches lists nodes with changed order_index', () => {
    const tree = makeFixture()
    const base = snapshotOrderMap(tree)
    const next = reorderSiblingsRelativeToOver(tree, 'a2', 'a1')
    expect(next).not.toBeNull()
    const patches = computeOrderPatches(next!, base)
    const a1p = patches.find((p) => p.id === 'a1')
    const a2p = patches.find((p) => p.id === 'a2')
    expect(a2p?.orderIndex).toBe(0)
    expect(a1p?.orderIndex).toBe(1)
  })
})
