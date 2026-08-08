import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../lib/api/apiErrors'
import { createMatrixNode } from '../../../services/operation-matrix/operationMatrixApiService'
import { cloneTaskSubtreeUnderItem } from './cloneMatrixTaskSubtree'

vi.mock('../../../services/operation-matrix/operationMatrixApiService', () => ({
  createMatrixNode: vi.fn(),
}))

const RESPONSIBLE_INVALID_MESSAGE =
  'O colaborador responsável deve ser um colaborador ativo e membro ativo da equipe informada.'

function buildTaskWithSingleActivity(overrides: {
  taskId: string
  activityId: string
  defaultResponsibleId: string | null
  teamIds?: string[]
}) {
  return {
    id: overrides.taskId,
    parent_id: null,
    root_id: overrides.taskId,
    node_type: 'TASK' as const,
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
        id: overrides.activityId,
        parent_id: overrides.taskId,
        root_id: overrides.taskId,
        node_type: 'ACTIVITY' as const,
        code: null,
        name: 'Atividade com responsável',
        description: null,
        order_index: 0,
        level_depth: 2,
        is_active: true,
        planned_minutes: 15,
        default_responsible_id: overrides.defaultResponsibleId,
        team_ids: overrides.teamIds ?? (overrides.defaultResponsibleId ? ['team-1'] : []),
        required: true,
        source_key: null,
        metadata_json: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
        children: [],
      },
    ],
  }
}

describe('cloneTaskSubtreeUnderItem', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('persiste apenas a primeira equipe padrão ao criar ACTIVITY', async () => {
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
        teamIds: ['team-1'],
        sourceKey: 'activity-1',
        defaultResponsibleId: 'collab-1',
      }),
    )
  })

  it('envia defaultResponsibleId null quando a atividade de origem não tem responsável', async () => {
    const mockedCreate = vi.mocked(createMatrixNode)
    mockedCreate
      .mockResolvedValueOnce({ id: 'task-created' } as never)
      .mockResolvedValueOnce({ id: 'activity-created' } as never)

    await cloneTaskSubtreeUnderItem('item-1', {
      id: 'task-2',
      parent_id: null,
      root_id: 'task-2',
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
          id: 'activity-2',
          parent_id: 'task-2',
          root_id: 'task-2',
          node_type: 'ACTIVITY',
          code: null,
          name: 'Activity sem responsável',
          description: null,
          order_index: 0,
          level_depth: 2,
          is_active: true,
          planned_minutes: 20,
          default_responsible_id: null,
          team_ids: [],
          required: true,
          source_key: null,
          metadata_json: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null,
          children: [],
        },
      ],
    })

    expect(mockedCreate).toHaveBeenLastCalledWith(
      expect.objectContaining({
        nodeType: 'ACTIVITY',
        defaultResponsibleId: null,
      }),
    )
  })

  it('clona ACTIVITY com responsável válido sem retry e sem warning', async () => {
    const mockedCreate = vi.mocked(createMatrixNode)
    mockedCreate
      .mockResolvedValueOnce({ id: 'task-created' } as never)
      .mockResolvedValueOnce({ id: 'activity-created' } as never)

    const result = await cloneTaskSubtreeUnderItem(
      'item-1',
      buildTaskWithSingleActivity({
        taskId: 'task-3',
        activityId: 'activity-3',
        defaultResponsibleId: 'collab-1',
      }),
    )

    expect(mockedCreate).toHaveBeenCalledTimes(2)
    expect(mockedCreate).toHaveBeenLastCalledWith(
      expect.objectContaining({
        nodeType: 'ACTIVITY',
        defaultResponsibleId: 'collab-1',
      }),
    )
    expect(result.warnings).toEqual([])
  })

  it('retenta sem responsável quando o backend rejeita com 422 por responsável inválido, e retorna um warning', async () => {
    const mockedCreate = vi.mocked(createMatrixNode)
    const invalidResponsibleError = new ApiError(
      RESPONSIBLE_INVALID_MESSAGE,
      422,
      { code: 'VALIDATION_ERROR' },
    )
    mockedCreate
      .mockResolvedValueOnce({ id: 'task-created' } as never)
      .mockRejectedValueOnce(invalidResponsibleError)
      .mockResolvedValueOnce({ id: 'activity-created-without-responsible' } as never)

    const result = await cloneTaskSubtreeUnderItem(
      'item-1',
      buildTaskWithSingleActivity({
        taskId: 'task-4',
        activityId: 'activity-4',
        defaultResponsibleId: 'collab-invalido',
      }),
    )

    expect(mockedCreate).toHaveBeenCalledTimes(3)
    expect(mockedCreate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        nodeType: 'ACTIVITY',
        defaultResponsibleId: 'collab-invalido',
      }),
    )
    expect(mockedCreate).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        nodeType: 'ACTIVITY',
        defaultResponsibleId: null,
      }),
    )
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0]).toMatchObject({
      code: 'MATRIX_ACTIVITY_RESPONSIBLE_NOT_COPIED',
      sourceActivityId: 'activity-4',
      duplicatedActivityId: 'activity-created-without-responsible',
      activityName: 'Atividade com responsável',
      sourceResponsibleId: 'collab-invalido',
      reason: 'RESPONSIBLE_NOT_IN_TEAM',
    })
    expect(result.warnings[0].message).toContain('clonada sem responsável')
  })

  it('propaga o erro sem retry quando a falha do POST não é sobre responsável inválido', async () => {
    const mockedCreate = vi.mocked(createMatrixNode)
    const otherError = new ApiError('Nome é obrigatório.', 422, {
      code: 'VALIDATION_ERROR',
    })
    mockedCreate
      .mockResolvedValueOnce({ id: 'task-created' } as never)
      .mockRejectedValueOnce(otherError)

    await expect(
      cloneTaskSubtreeUnderItem(
        'item-1',
        buildTaskWithSingleActivity({
          taskId: 'task-5',
          activityId: 'activity-5',
          defaultResponsibleId: 'collab-1',
        }),
      ),
    ).rejects.toBe(otherError)

    expect(mockedCreate).toHaveBeenCalledTimes(2)
  })
})
