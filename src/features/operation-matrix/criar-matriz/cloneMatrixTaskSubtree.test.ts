import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMatrixNode } from '../../../services/operation-matrix/operationMatrixApiService'
import { cloneTaskSubtreeUnderItem } from './cloneMatrixTaskSubtree'

vi.mock('../../../services/operation-matrix/operationMatrixApiService', () => ({
  createMatrixNode: vi.fn(),
}))

describe('cloneTaskSubtreeUnderItem', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('preserva team_ids do draft ao criar ACTIVITY', async () => {
    const mockedCreate = vi.mocked(createMatrixNode)
    mockedCreate
      .mockResolvedValueOnce({ id: 'task-created' } as never)
      .mockResolvedValueOnce({ id: 'sector-created' } as never)
      .mockResolvedValueOnce({ id: 'activity-created' } as never)

    await cloneTaskSubtreeUnderItem('item-1', {
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
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
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
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null,
          children: [
            {
              id: 'activity-1',
              parent_id: 'sector-1',
              root_id: 'task-1',
              node_type: 'ACTIVITY',
              code: null,
              name: 'Activity',
              description: null,
              order_index: 0,
              level_depth: 3,
              is_active: true,
              planned_minutes: 30,
              default_responsible_id: 'collab-1',
              team_ids: ['team-1', 'team-2'],
              required: true,
              source_key: null,
              metadata_json: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              deleted_at: null,
              children: [],
            },
          ],
        },
      ],
    })

    expect(mockedCreate).toHaveBeenCalledTimes(3)
    expect(mockedCreate).toHaveBeenLastCalledWith(
      expect.objectContaining({
        nodeType: 'ACTIVITY',
        teamIds: ['team-1', 'team-2'],
      }),
    )
  })
})
