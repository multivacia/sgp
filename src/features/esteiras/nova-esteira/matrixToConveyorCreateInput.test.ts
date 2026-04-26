import { describe, expect, it } from 'vitest'
import {
  buildCreateConveyorFromMatrixInput,
  listMatrixActivitySlots,
  mapMatrixTreeToConveyorOptions,
  matrixHasRunnableStructure,
} from './matrixToConveyorCreateInput'
import type { MatrixNodeTreeApi } from '../../../domain/operation-matrix/operation-matrix.types'

function node(
  partial: Partial<MatrixNodeTreeApi> & Pick<MatrixNodeTreeApi, 'id' | 'node_type' | 'name' | 'order_index' | 'children'>,
): MatrixNodeTreeApi {
  return {
    parent_id: null,
    root_id: 'root',
    code: null,
    description: null,
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
    ...partial,
  } as MatrixNodeTreeApi
}

describe('matrixToConveyorCreateInput', () => {
  it('matrixHasRunnableStructure exige ACTIVITY', () => {
    const emptyItem = node({
      id: 'i1',
      node_type: 'ITEM',
      name: 'I',
      order_index: 0,
      children: [],
    })
    expect(matrixHasRunnableStructure(emptyItem)).toBe(false)

    const tree = node({
      id: 'i1',
      node_type: 'ITEM',
      name: 'I',
      order_index: 0,
      children: [
        node({
          id: 't1',
          node_type: 'TASK',
          name: 'T',
          order_index: 1,
          children: [
            node({
              id: 's1',
              node_type: 'SECTOR',
              name: 'S',
              order_index: 1,
              children: [
                node({
                  id: 'a1',
                  node_type: 'ACTIVITY',
                  name: 'A',
                  order_index: 1,
                  planned_minutes: 10,
                  children: [],
                }),
              ],
            }),
          ],
        }),
      ],
    })
    expect(matrixHasRunnableStructure(tree)).toBe(true)
  })

  it('mapMatrixTreeToConveyorOptions injeta assignees por id de ACTIVITY', () => {
    const actId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    const tree = node({
      id: 'i1',
      node_type: 'ITEM',
      name: 'I',
      order_index: 0,
      children: [
        node({
          id: 't1',
          node_type: 'TASK',
          name: 'T',
          order_index: 1,
          children: [
            node({
              id: 's1',
              node_type: 'SECTOR',
              name: 'S',
              order_index: 1,
              children: [
                node({
                  id: actId,
                  node_type: 'ACTIVITY',
                  name: 'A',
                  order_index: 1,
                  planned_minutes: 15,
                  children: [],
                }),
              ],
            }),
          ],
        }),
      ],
    })
    const cid = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
    const opts = mapMatrixTreeToConveyorOptions(tree, {
      [actId]: [
        {
          collaboratorId: cid,
          isPrimary: true,
          assignmentOrigin: 'base',
          orderIndex: 0,
        },
      ],
    })
    expect(opts).toHaveLength(1)
    expect(opts[0]!.areas[0]!.steps[0]!.assignees?.[0]?.collaboratorId).toBe(
      cid,
    )
  })

  it('buildCreateConveyorFromMatrixInput inclui matrixRootItemId', () => {
    const tree = node({
      id: 'root-id',
      node_type: 'ITEM',
      name: 'I',
      order_index: 0,
      children: [],
    })
    const input = buildCreateConveyorFromMatrixInput(
      tree,
      { nome: 'X', prioridade: 'media' },
      {},
    )
    expect(input.matrixRootItemId).toBe('root-id')
  })

  it('listMatrixActivitySlots achata ordem', () => {
    const tree = node({
      id: 'i1',
      node_type: 'ITEM',
      name: 'I',
      order_index: 0,
      children: [
        node({
          id: 't1',
          node_type: 'TASK',
          name: 'Op',
          order_index: 1,
          children: [
            node({
              id: 's1',
              node_type: 'SECTOR',
              name: 'Ar',
              order_index: 1,
              children: [
                node({
                  id: 'a1',
                  node_type: 'ACTIVITY',
                  name: 'St',
                  order_index: 1,
                  planned_minutes: 10,
                  children: [],
                }),
              ],
            }),
          ],
        }),
      ],
    })
    const slots = listMatrixActivitySlots(tree)
    expect(slots).toHaveLength(1)
    expect(slots[0]!.pathLabel).toContain('Op')
    expect(slots[0]!.pathLabel).toContain('Ar')
    expect(slots[0]!.compositionOrigin).toBe('base')
  })
})
