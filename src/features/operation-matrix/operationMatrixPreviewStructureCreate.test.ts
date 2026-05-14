import { describe, expect, it } from 'vitest'
import type { MatrixNodeTreeApi } from '../../domain/operation-matrix/operation-matrix.types'
import {
  appendPreviewPendingStructureNode,
  collectPreviewPendingCreateNodes,
  hasPreviewPendingCreateNodes,
  isPreviewPendingNodeId,
  removePreviewStructureNode,
} from './operationMatrixPreviewStructureCreate'
import { snapshotOrderMap } from './matrixStructureReorder'

function itemRoot(children: MatrixNodeTreeApi[] = []): MatrixNodeTreeApi {
  return {
    id: 'root',
    parent_id: null,
    root_id: 'root',
    node_type: 'ITEM',
    code: null,
    name: 'Matriz',
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
    children,
  }
}

describe('operationMatrixPreviewStructureCreate', () => {
  it('cria ids pendentes e anexa tarefa, setor e atividade no final do grupo', () => {
    const root = itemRoot()
    const taskAppend = appendPreviewPendingStructureNode(root, 'root', 'TASK')
    expect(taskAppend).not.toBeNull()
    expect(isPreviewPendingNodeId(taskAppend!.node.id)).toBe(true)
    expect(taskAppend!.node.order_index).toBe(0)

    const task = taskAppend!.tree.children[0]!
    const sectorAppend = appendPreviewPendingStructureNode(taskAppend!.tree, task.id, 'SECTOR')
    expect(sectorAppend!.node.order_index).toBe(0)

    const sector = sectorAppend!.tree.children[0]!.children[0]!
    const activityAppend = appendPreviewPendingStructureNode(
      sectorAppend!.tree,
      sector.id,
      'ACTIVITY',
    )
    expect(activityAppend!.node.order_index).toBe(0)
    expect(activityAppend!.node.node_type).toBe('ACTIVITY')
  })

  it('remove nó pendente recém-criado sem alterar irmãos existentes', () => {
    const root = itemRoot()
    const first = appendPreviewPendingStructureNode(root, 'root', 'TASK')!
    const removed = removePreviewStructureNode(first.tree, first.node.id)

    expect(removed.children).toHaveLength(0)
    expect(hasPreviewPendingCreateNodes(removed)).toBe(false)
  })

  it('lista nós pendentes por profundidade e ordem', () => {
    const root = itemRoot()
    const task = appendPreviewPendingStructureNode(root, 'root', 'TASK')!
    const sector = appendPreviewPendingStructureNode(task.tree, task.node.id, 'SECTOR')!
    const activity = appendPreviewPendingStructureNode(sector.tree, sector.node.id, 'ACTIVITY')!

    const pending = collectPreviewPendingCreateNodes(activity.tree)
    expect(pending.map((node) => node.node_type)).toEqual(['TASK', 'SECTOR', 'ACTIVITY'])
    expect(snapshotOrderMap(activity.tree).size).toBeGreaterThan(snapshotOrderMap(root).size)
  })

  it('reindexa irmãos restantes após remover tarefa intermediária', () => {
    const taskA: MatrixNodeTreeApi = {
      id: 'task-a',
      parent_id: 'root',
      root_id: 'root',
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
      required: false,
      source_key: null,
      metadata_json: null,
      created_at: '',
      updated_at: '',
      deleted_at: null,
      children: [],
    }
    const taskB: MatrixNodeTreeApi = {
      ...taskA,
      id: 'task-b',
      name: 'B',
      order_index: 1,
    }
    const taskC: MatrixNodeTreeApi = {
      ...taskA,
      id: 'task-c',
      name: 'C',
      order_index: 2,
    }
    const root = itemRoot([taskA, taskB, taskC])
    const removed = removePreviewStructureNode(root, 'task-b')

    expect(removed.children.map((task) => [task.id, task.order_index])).toEqual([
      ['task-a', 0],
      ['task-c', 1],
    ])
  })
})
