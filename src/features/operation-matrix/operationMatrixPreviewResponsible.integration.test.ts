import { describe, expect, it } from 'vitest'
import type { MatrixNodeTreeApi } from '../../domain/operation-matrix/operation-matrix.types'
import { buildMatrixTreeAggregateMaps } from './matrixTreeAggregates'
import { buildOperationMatrixMacroPreviewModel } from './operationMatrixPreviewMapper'
import {
  applyEditorFormToTreeClone,
  deepCloneMatrixTree,
} from './operationMatrixPreviewSnapshot'

function activityNode(
  overrides: Partial<MatrixNodeTreeApi> = {},
): MatrixNodeTreeApi {
  return {
    id: 'act-1',
    parent_id: 'sec-1',
    root_id: 'item-1',
    node_type: 'ACTIVITY',
    code: null,
    name: 'Atividade',
    description: null,
    order_index: 0,
    level_depth: 3,
    is_active: true,
    planned_minutes: 10,
    default_responsible_id: null,
    team_ids: [],
    required: false,
    source_key: null,
    metadata_json: null,
    created_at: '',
    updated_at: '',
    deleted_at: null,
    children: [],
    ...overrides,
  }
}

function itemTree(activity: MatrixNodeTreeApi): MatrixNodeTreeApi {
  return {
    id: 'item-1',
    parent_id: null,
    root_id: 'item-1',
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
    children: [
      {
        id: 'task-1',
        parent_id: 'item-1',
        root_id: 'item-1',
        node_type: 'TASK',
        code: null,
        name: 'Tarefa',
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
            id: 'sec-1',
            parent_id: 'task-1',
            root_id: 'item-1',
            node_type: 'SECTOR',
            code: null,
            name: 'Setor',
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

describe('preview mapper + snapshot responsável', () => {
  it('mapper expõe defaultResponsibleId da atividade', () => {
    const teamId = '550e8400-e29b-41d4-a716-446655440001'
    const respId = '550e8400-e29b-41d4-a716-446655440002'
    const tree = itemTree(
      activityNode({
        team_ids: [teamId],
        default_responsible_id: respId,
      }),
    )
    const maps = buildMatrixTreeAggregateMaps(tree, new Set([teamId]))
    const model = buildOperationMatrixMacroPreviewModel(
      tree,
      maps.global,
      new Map([[teamId, 'Costura']]),
    )
    const row = model.tasks[0]?.sectors[0]?.activities[0]
    expect(row?.teamIds).toEqual([teamId])
    expect(row?.defaultResponsibleId).toBe(respId)
  })

  it('applyEditorFormToTreeClone persiste formResponsibleId no rascunho do preview', () => {
    const teamId = '550e8400-e29b-41d4-a716-446655440001'
    const respId = '550e8400-e29b-41d4-a716-446655440002'
    const tree = itemTree(activityNode({ id: 'act-1', team_ids: [] }))
    const next = applyEditorFormToTreeClone(tree, 'act-1', {
      formName: 'Atividade',
      formCode: '',
      formDescription: '',
      formActive: true,
      formPlanned: '15',
      formTeamIds: [teamId],
      formResponsibleId: respId,
      formRequired: false,
    })
    const act = next.children[0]!.children[0]!.children[0]!
    expect(act.planned_minutes).toBe(15)
    expect(act.team_ids).toEqual([teamId])
    expect(act.default_responsible_id).toBe(respId)
  })

  it('applyEditorFormToTreeClone permite remover responsável no snapshot', () => {
    const tree = itemTree(
      activityNode({
        id: 'act-1',
        default_responsible_id: '550e8400-e29b-41d4-a716-446655440002',
        team_ids: ['550e8400-e29b-41d4-a716-446655440001'],
      }),
    )
    const next = applyEditorFormToTreeClone(deepCloneMatrixTree(tree), 'act-1', {
      formName: 'Atividade',
      formCode: '',
      formDescription: '',
      formActive: true,
      formPlanned: '10',
      formTeamIds: ['550e8400-e29b-41d4-a716-446655440001'],
      formResponsibleId: null,
      formRequired: false,
    })
    expect(next.children[0]!.children[0]!.children[0]!.default_responsible_id).toBeNull()
  })
})
