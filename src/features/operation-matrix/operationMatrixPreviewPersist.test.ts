import { describe, expect, it, vi } from 'vitest'
import type { MatrixNodeTreeApi } from '../../domain/operation-matrix/operation-matrix.types'
import {
  appendPreviewPendingStructureNode,
  isPreviewPendingNodeId,
} from './operationMatrixPreviewStructureCreate'
import {
  patchActivityFieldsInTreeClone,
  patchNodeNameInTreeClone,
} from './operationMatrixPreviewEdits'
import { reorderSiblingsRelativeToOver } from './matrixStructureReorder'
import {
  persistOperationMatrixPreviewToApi,
  planOperationMatrixPreviewApiPersist,
} from './operationMatrixPreviewPersist'
import { removePreviewStructureNode } from './operationMatrixPreviewStructureCreate'

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

function act(
  id: string,
  parentId: string,
  opts: Partial<{
    team_ids: string[]
    default_responsible_id: string | null
    planned_minutes: number | null
  }> = {},
): MatrixNodeTreeApi {
  return {
    id,
    parent_id: parentId,
    root_id: 'root',
    node_type: 'ACTIVITY',
    code: null,
    name: 'Atividade',
    description: null,
    order_index: 0,
    level_depth: 3,
    is_active: true,
    planned_minutes: opts.planned_minutes ?? 10,
    default_responsible_id: opts.default_responsible_id ?? null,
    team_ids: opts.team_ids ?? [],
    required: false,
    source_key: null,
    metadata_json: null,
    created_at: '',
    updated_at: '',
    deleted_at: null,
    children: [],
  }
}

function task(id: string, sectors: MatrixNodeTreeApi[] = []): MatrixNodeTreeApi {
  return {
    id,
    parent_id: 'root',
    root_id: 'root',
    node_type: 'TASK',
    code: null,
    name: `Tarefa ${id}`,
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
    children: sectors,
  }
}

function sector(id: string, activities: MatrixNodeTreeApi[] = []): MatrixNodeTreeApi {
  return {
    id,
    parent_id: 'task-1',
    root_id: 'root',
    node_type: 'SECTOR',
    code: null,
    name: `Setor ${id}`,
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
    children: activities,
  }
}

describe('operationMatrixPreviewPersist', () => {
  it('planeja create → patch → order para nós pendentes e alterações existentes', () => {
    const baseline = itemRoot([task('task-1', [sector('sector-1', [act('activity-1', 'sector-1')])])])
  const working = patchNodeNameInTreeClone(
      patchActivityFieldsInTreeClone(baseline, 'activity-1', { planned_minutes: 20 }),
      'task-1',
      'Tarefa renomeada',
    )
    const withPending = appendPreviewPendingStructureNode(working, 'sector-1', 'ACTIVITY')!
    const pendingNamed = patchNodeNameInTreeClone(
      withPending.tree,
      withPending.node.id,
      'Nova atividade',
    )
    const reordered = reorderSiblingsRelativeToOver(pendingNamed, withPending.node.id, 'activity-1')!

    const calls = planOperationMatrixPreviewApiPersist(baseline, reordered!)
    expect(calls[0]?.kind).toBe('create')
    expect(calls.some((call) => call.kind === 'patch' && call.input.name === 'Tarefa renomeada')).toBe(
      true,
    )
    expect(
      calls.some(
        (call) =>
          call.kind === 'patch' &&
          call.input.plannedMinutes === 20 &&
          call.id === 'activity-1',
      ),
    ).toBe(true)
    const lastCall = calls.at(-1)
    expect(lastCall?.kind).toBe('patch')
    if (lastCall?.kind === 'patch') {
      expect(lastCall.input.orderIndex).toBeTypeOf('number')
    }
  })

  it('persiste na API na ordem create → patch → order', async () => {
    const baseline = itemRoot()
    const taskAppend = appendPreviewPendingStructureNode(baseline, 'root', 'TASK')!
    const namedTask = patchNodeNameInTreeClone(taskAppend.tree, taskAppend.node.id, 'Nova tarefa')
    const sectorAppend = appendPreviewPendingStructureNode(namedTask, taskAppend.node.id, 'SECTOR')!
    const namedSector = patchNodeNameInTreeClone(
      sectorAppend.tree,
      sectorAppend.node.id,
      'Novo setor',
    )
    const activityAppend = appendPreviewPendingStructureNode(
      namedSector,
      sectorAppend.node.id,
      'ACTIVITY',
    )!
    const working = patchNodeNameInTreeClone(
      activityAppend.tree,
      activityAppend.node.id,
      'Nova atividade',
    )

    const createNode = vi
      .fn()
      .mockResolvedValueOnce({ id: 'task-real' })
      .mockResolvedValueOnce({ id: 'sector-real' })
      .mockResolvedValueOnce({ id: 'activity-real' })
    const patchNode = vi.fn().mockResolvedValue({ id: 'patched' })
    const callKinds: string[] = []

    await persistOperationMatrixPreviewToApi(baseline, working, {
      createNode: async (input) => {
        callKinds.push('create')
        return createNode(input)
      },
      patchNode: async (id, input) => {
        callKinds.push('patch')
        return patchNode(id, input)
      },
      deleteNode: async () => {
        callKinds.push('delete')
        return { ok: true }
      },
    })

    expect(createNode).toHaveBeenCalledTimes(3)
    expect(createNode.mock.calls[0]?.[0]).toMatchObject({
      nodeType: 'TASK',
      parentId: 'root',
      name: 'Nova tarefa',
    })
    expect(createNode.mock.calls[1]?.[0]).toMatchObject({
      nodeType: 'SECTOR',
      parentId: 'task-real',
      name: 'Novo setor',
    })
    expect(createNode.mock.calls[2]?.[0]).toMatchObject({
      nodeType: 'ACTIVITY',
      parentId: 'sector-real',
      name: 'Nova atividade',
    })
    expect(callKinds.slice(0, 3)).toEqual(['create', 'create', 'create'])
    expect(callKinds.slice(3).every((kind) => kind === 'patch')).toBe(true)
    expect(patchNode.mock.calls.some((call) => call[0] === 'activity-real')).toBe(true)
    expect(
      working.children.some((child) => isPreviewPendingNodeId(child.id)),
    ).toBe(true)
  })

  it('planeja patch com defaultResponsibleId quando o responsável muda', () => {
    const baseline = itemRoot([task('task-1', [sector('sector-1', [act('activity-1', 'sector-1')])])])
    const working = patchActivityFieldsInTreeClone(baseline, 'activity-1', {
      default_responsible_id: '550e8400-e29b-41d4-a716-446655440009',
    })
    const calls = planOperationMatrixPreviewApiPersist(baseline, working)
    expect(
      calls.some(
        (call) =>
          call.kind === 'patch' &&
          call.id === 'activity-1' &&
          call.input.defaultResponsibleId === '550e8400-e29b-41d4-a716-446655440009',
      ),
    ).toBe(true)
  })

  it('na troca de equipe persiste teamIds com defaultResponsibleId null', () => {
    const teamOld = '550e8400-e29b-41d4-a716-446655440001'
    const teamNew = '550e8400-e29b-41d4-a716-446655440099'
    const respId = '550e8400-e29b-41d4-a716-446655440009'
    const baseline = itemRoot([
      task('task-1', [
        sector('sector-1', [
          act('activity-1', 'sector-1', {
            team_ids: [teamOld],
            default_responsible_id: respId,
          }),
        ]),
      ]),
    ])
    const working = patchActivityFieldsInTreeClone(baseline, 'activity-1', {
      team_ids: [teamNew],
      default_responsible_id: null,
    })
    const calls = planOperationMatrixPreviewApiPersist(baseline, working)
    const patchCall = calls.find(
      (call) => call.kind === 'patch' && call.id === 'activity-1',
    )
    expect(patchCall).toMatchObject({
      kind: 'patch',
      id: 'activity-1',
      input: {
        teamIds: [teamNew],
        defaultResponsibleId: null,
      },
    })
  })

  it('permite salvar atividade com equipe e sem responsável', () => {
    const teamId = '550e8400-e29b-41d4-a716-446655440001'
    const baseline = itemRoot([
      task('task-1', [sector('sector-1', [act('activity-1', 'sector-1')])]),
    ])
    const working = patchActivityFieldsInTreeClone(baseline, 'activity-1', {
      team_ids: [teamId],
      default_responsible_id: null,
    })
    const calls = planOperationMatrixPreviewApiPersist(baseline, working)
    const patchCall = calls.find(
      (call) => call.kind === 'patch' && call.id === 'activity-1',
    )
    expect(patchCall).toMatchObject({
      kind: 'patch',
      input: {
        teamIds: [teamId],
        defaultResponsibleId: null,
      },
    })
  })

  it('após limpar responsável na troca, seleção posterior gera patch só do responsável', () => {
    const teamNew = '550e8400-e29b-41d4-a716-446655440099'
    const respNew = '550e8400-e29b-41d4-a716-446655440088'
    const afterTeamChange = itemRoot([
      task('task-1', [
        sector('sector-1', [
          act('activity-1', 'sector-1', {
            team_ids: [teamNew],
            default_responsible_id: null,
          }),
        ]),
      ]),
    ])
    const withResp = patchActivityFieldsInTreeClone(afterTeamChange, 'activity-1', {
      default_responsible_id: respNew,
    })
    const calls = planOperationMatrixPreviewApiPersist(afterTeamChange, withResp)
    expect(
      calls.some(
        (call) =>
          call.kind === 'patch' &&
          call.id === 'activity-1' &&
          call.input.defaultResponsibleId === respNew &&
          JSON.stringify(call.input.teamIds) === JSON.stringify([teamNew]),
      ),
    ).toBe(true)
  })

  it('planeja delete após create, patch e order para nós removidos localmente', () => {
    const baseline = itemRoot([task('task-1', [sector('sector-1', [act('activity-1', 'sector-1')])])])
    const working = removePreviewStructureNode(baseline, 'activity-1')
    const calls = planOperationMatrixPreviewApiPersist(baseline, working)
    expect(calls.at(-1)).toEqual({ kind: 'delete', id: 'activity-1' })
  })
})
