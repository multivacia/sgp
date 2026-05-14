import { describe, expect, it } from 'vitest'
import type { MatrixNodeTreeApi } from '../../domain/operation-matrix/operation-matrix.types'
import {
  activityFieldsSignature,
  collectActivityFieldDiffs,
  collectPreviewStructureDeletions,
  collectStructureNameDiffs,
  isPreviewWorkingTreeDirty,
  matrixPreviewActivityInfoFlags,
  normalizePreviewStructureNodeName,
  patchActivityFieldsInTreeClone,
  patchNodeNameInTreeClone,
  previewStructureNodeNameIsValid,
  structureNamesSignature,
  validatePreviewActivityTree,
} from './operationMatrixPreviewEdits'
import {
  appendPreviewPendingStructureNode,
  removePreviewStructureNode,
} from './operationMatrixPreviewStructureCreate'
import { reorderSiblingsRelativeToOver, snapshotOrderMap } from './matrixStructureReorder'

function act(
  id: string,
  opts: Partial<{
    planned_minutes: number | null
    default_responsible_id: string | null
    team_ids: string[]
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
    team_ids: opts.team_ids ?? [],
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
      team_ids: ['550e8400-e29b-41d4-a716-446655440000'],
    })
    const node = next.children[0]?.children[0]?.children[0]
    expect(node?.planned_minutes).toBe(20)
    expect(node?.team_ids).toEqual(['550e8400-e29b-41d4-a716-446655440000'])
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

  it('matrixPreviewActivityInfoFlags detects missing time and default team', () => {
    expect(matrixPreviewActivityInfoFlags(0, [])).toEqual({
      missingEffectiveTime: true,
      missingDefaultTeam: true,
    })
    expect(matrixPreviewActivityInfoFlags(null, [])).toEqual({
      missingEffectiveTime: true,
      missingDefaultTeam: true,
    })
    expect(matrixPreviewActivityInfoFlags(15, [])).toEqual({
      missingEffectiveTime: false,
      missingDefaultTeam: true,
    })
    expect(matrixPreviewActivityInfoFlags(10, ['550e8400-e29b-41d4-a716-446655440000'])).toEqual({
      missingEffectiveTime: false,
      missingDefaultTeam: false,
    })
    expect(
      matrixPreviewActivityInfoFlags(0, ['550e8400-e29b-41d4-a716-446655440000']),
    ).toEqual({ missingEffectiveTime: true, missingDefaultTeam: false })
  })

  it('collectActivityFieldDiffs lists changed activities only', () => {
    const base = itemWithActivity(act('a1', { planned_minutes: 10, default_responsible_id: null }))
    const work = patchActivityFieldsInTreeClone(base, 'a1', {
      planned_minutes: 12,
      team_ids: ['550e8400-e29b-41d4-a716-446655440001'],
    })
    const diffs = collectActivityFieldDiffs(base, work)
    expect(diffs).toHaveLength(1)
    expect(diffs[0]?.id).toBe('a1')
    expect(diffs[0]?.patch.planned_minutes).toBe(12)
    expect(diffs[0]?.patch.team_ids).toEqual(['550e8400-e29b-41d4-a716-446655440001'])
  })

  it('collectActivityFieldDiffs detecta mudança em team_ids (normaliza para uma equipe)', () => {
    const base = itemWithActivity(
      act('a1', { planned_minutes: 10, default_responsible_id: null, team_ids: [] }),
    )
    const work = patchActivityFieldsInTreeClone(base, 'a1', { team_ids: ['t1', 't2'] })
    const diffs = collectActivityFieldDiffs(base, work)
    expect(diffs).toHaveLength(1)
    expect(diffs[0]?.patch.team_ids).toEqual(['t1'])
  })

  it('isPreviewWorkingTreeDirty detecta reordenação de tarefas sem alterar atividades', () => {
    const taskA: MatrixNodeTreeApi = {
      ...act('task-a'),
      parent_id: 'root',
      node_type: 'TASK',
      name: 'Tarefa A',
      order_index: 0,
      level_depth: 1,
      children: [],
    }
    const taskB: MatrixNodeTreeApi = {
      ...taskA,
      id: 'task-b',
      name: 'Tarefa B',
      order_index: 1,
    }
    const root: MatrixNodeTreeApi = {
      ...itemWithActivity(act('a1')).children[0]!,
      id: 'root',
      parent_id: null,
      node_type: 'ITEM',
      name: 'Matriz',
      order_index: 0,
      level_depth: 0,
      children: [taskA, taskB],
    }
    const baselineSig = activityFieldsSignature(root)
    const baselineOrder = snapshotOrderMap(root)
    const baselineNames = structureNamesSignature(root)
    const reordered = reorderSiblingsRelativeToOver(root, 'task-b', 'task-a')

    expect(reordered).not.toBeNull()
    expect(isPreviewWorkingTreeDirty(root, baselineSig, baselineOrder, baselineNames)).toBe(false)
    expect(isPreviewWorkingTreeDirty(reordered!, baselineSig, baselineOrder, baselineNames)).toBe(true)
  })

  it('isPreviewWorkingTreeDirty detecta reordenação de atividades sem alterar tarefas ou setores', () => {
    const activityA = { ...act('activity-a'), order_index: 0, parent_id: 'sector' }
    const activityB = { ...act('activity-b'), order_index: 1, parent_id: 'sector' }
    const sector: MatrixNodeTreeApi = {
      ...itemWithActivity(activityA).children[0]!.children[0]!,
      children: [activityA, activityB],
    }
    const root: MatrixNodeTreeApi = {
      ...itemWithActivity(activityA),
      children: [
        {
          ...itemWithActivity(activityA).children[0]!,
          children: [sector],
        },
      ],
    }
    const baselineSig = activityFieldsSignature(root)
    const baselineOrder = snapshotOrderMap(root)
    const baselineNames = structureNamesSignature(root)
    const reordered = reorderSiblingsRelativeToOver(root, 'activity-b', 'activity-a')

    expect(reordered).not.toBeNull()
    expect(isPreviewWorkingTreeDirty(root, baselineSig, baselineOrder, baselineNames)).toBe(false)
    expect(isPreviewWorkingTreeDirty(reordered!, baselineSig, baselineOrder, baselineNames)).toBe(true)
  })

  it('patchNodeNameInTreeClone atualiza nomes de tarefa, setor e atividade com trim', () => {
    const tree = itemWithActivity(act('a1'))
    const renamedTask = patchNodeNameInTreeClone(tree, 'task', '  Nova tarefa  ')
    expect(renamedTask.children[0]?.name).toBe('Nova tarefa')

    const renamedSector = patchNodeNameInTreeClone(renamedTask, 'sector', ' Setor ')
    expect(renamedSector.children[0]?.children[0]?.name).toBe('Setor')

    const renamedActivity = patchNodeNameInTreeClone(renamedSector, 'a1', ' Atividade ')
    expect(renamedActivity.children[0]?.children[0]?.children[0]?.name).toBe('Atividade')
  })

  it('rejeita nome vazio e aceita nome normalizado', () => {
    expect(previewStructureNodeNameIsValid('   ')).toBe(false)
    expect(normalizePreviewStructureNodeName('  Nome  ')).toBe('Nome')
  })

  it('collectStructureNameDiffs retorna apenas nós renomeados', () => {
    const base = itemWithActivity(act('a1'))
    const work = patchNodeNameInTreeClone(
      patchNodeNameInTreeClone(patchNodeNameInTreeClone(base, 'task', 'Tarefa 2'), 'sector', 'Setor 2'),
      'a1',
      'Atividade 2',
    )
    expect(collectStructureNameDiffs(base, work)).toEqual([
      { id: 'task', name: 'Tarefa 2' },
      { id: 'sector', name: 'Setor 2' },
      { id: 'a1', name: 'Atividade 2' },
    ])
    expect(collectStructureNameDiffs(base, base)).toEqual([])
  })

  it('isPreviewWorkingTreeDirty detecta renomeação sem alterar ordem ou atividades', () => {
    const base = itemWithActivity(act('a1'))
    const work = patchNodeNameInTreeClone(base, 'task', 'Tarefa renomeada')
    const baselineSig = activityFieldsSignature(base)
    const baselineOrder = snapshotOrderMap(base)
    const baselineNames = structureNamesSignature(base)

    expect(isPreviewWorkingTreeDirty(base, baselineSig, baselineOrder, baselineNames)).toBe(false)
    expect(isPreviewWorkingTreeDirty(work, baselineSig, baselineOrder, baselineNames)).toBe(true)
  })

  it('validatePreviewActivityTree bloqueia nomes vazios em tarefa, setor e atividade', () => {
    const base = itemWithActivity(act('a1'))
    expect(validatePreviewActivityTree(patchNodeNameInTreeClone(base, 'task', '   ')).ok).toBe(false)
    expect(validatePreviewActivityTree(patchNodeNameInTreeClone(base, 'sector', '   ')).ok).toBe(false)
    expect(validatePreviewActivityTree(patchNodeNameInTreeClone(base, 'a1', '   ')).ok).toBe(false)
  })

  it('isPreviewWorkingTreeDirty detecta inclusão local pendente e volta ao baseline ao cancelar', () => {
    const base = itemWithActivity(act('a1'))
    const appended = appendPreviewPendingStructureNode(base, 'root', 'TASK')
    expect(appended).not.toBeNull()
    const named = patchNodeNameInTreeClone(appended!.tree, appended!.node.id, 'Nova tarefa')
    const baselineSig = activityFieldsSignature(base)
    const baselineOrder = snapshotOrderMap(base)
    const baselineNames = structureNamesSignature(base)

    expect(isPreviewWorkingTreeDirty(named, baselineSig, baselineOrder, baselineNames)).toBe(true)

    const restored = removePreviewStructureNode(named, appended!.node.id)
    expect(isPreviewWorkingTreeDirty(restored, baselineSig, baselineOrder, baselineNames)).toBe(false)
  })

  it('collectPreviewStructureDeletions lista apenas nós removidos diretamente', () => {
    const base = itemWithActivity(act('a1'))
    const working = removePreviewStructureNode(base, 'task')
    expect(collectPreviewStructureDeletions(base, working)).toEqual(['task'])
    expect(collectPreviewStructureDeletions(base, removePreviewStructureNode(base, 'a1'))).toEqual([
      'a1',
    ])
  })
})
