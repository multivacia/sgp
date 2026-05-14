import { describe, expect, it, vi } from 'vitest'
import type { MatrixNodeTreeApi } from '../../domain/operation-matrix/operation-matrix.types'
import {
  patchNodeNameInTreeClone,
  validatePreviewActivityTree,
} from './operationMatrixPreviewEdits'
import { appendPreviewPendingStructureNode } from './operationMatrixPreviewStructureCreate'
import {
  createInlineNameSaveRegistry,
  evaluateInlineNameSaveDraft,
} from './macroPreviewInlineNameSave'

function itemTree(): MatrixNodeTreeApi {
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
    children: [
      {
        id: 'task',
        parent_id: 'root',
        root_id: 'root',
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
            id: 'sector',
            parent_id: 'task',
            root_id: 'root',
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
            children: [],
          },
        ],
      },
    ],
  }
}

describe('macroPreviewInlineNameSave', () => {
  it('aceita draft válido diferente do nome confirmado', () => {
    expect(evaluateInlineNameSaveDraft(' Nova atividade ', '')).toEqual({ ok: true })
  })

  it('rejeita draft vazio', () => {
    expect(evaluateInlineNameSaveDraft('   ', '')).toEqual({
      ok: false,
      message: 'Informe um nome.',
      nodeId: '',
    })
  })

  it('commitAllForSave confirma edições abertas antes de prosseguir', () => {
    const registry = createInlineNameSaveRegistry()
    const commit = vi.fn().mockReturnValue({ ok: true as const })
    const focus = vi.fn()

    registry.register({
      nodeId: 'activity-1',
      tryCommitForSave: commit,
      focusInvalidDraft: focus,
    })

    expect(registry.commitAllForSave()).toEqual({ ok: true })
    expect(commit).toHaveBeenCalledTimes(1)
    expect(focus).not.toHaveBeenCalled()
  })

  it('commitAllForSave bloqueia e foca o primeiro draft inválido', () => {
    const registry = createInlineNameSaveRegistry()
    const focusInvalid = vi.fn()

    registry.register({
      nodeId: 'activity-1',
      tryCommitForSave: () => ({
        ok: false,
        message: 'Informe um nome.',
        nodeId: 'activity-1',
      }),
      focusInvalidDraft: focusInvalid,
    })

    expect(registry.commitAllForSave()).toEqual({
      ok: false,
      message: 'Informe um nome.',
      nodeId: 'activity-1',
    })
    expect(focusInvalid).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['ACTIVITY', 'sector', 'Nova atividade'],
    ['SECTOR', 'task', 'Novo setor'],
    ['TASK', 'root', 'Nova tarefa'],
  ] as const)(
    'commit antes do save grava nome válido de %s pendente',
    (nodeType, parentId, draftName) => {
      let tree = itemTree()
      const appended = appendPreviewPendingStructureNode(tree, parentId, nodeType)
      expect(appended).not.toBeNull()
      tree = appended!.tree
      const pendingId = appended!.node.id
      expect(tree).toEqual(
        expect.objectContaining({
          children: expect.any(Array),
        }),
      )
      expect(validatePreviewActivityTree(tree).ok).toBe(false)

      const registry = createInlineNameSaveRegistry()
      let workingTree = tree
      registry.register({
        nodeId: pendingId,
        tryCommitForSave: () => {
          const validation = evaluateInlineNameSaveDraft(draftName, '')
          if (!validation.ok) return { ...validation, nodeId: pendingId }
          workingTree = patchNodeNameInTreeClone(workingTree, pendingId, draftName)
          return { ok: true as const }
        },
        focusInvalidDraft: () => {},
      })

      expect(registry.commitAllForSave()).toEqual({ ok: true })
      expect(validatePreviewActivityTree(workingTree).ok).toBe(true)
    },
  )

  it('commit antes do save bloqueia draft vazio sem alterar a árvore', () => {
    const appended = appendPreviewPendingStructureNode(itemTree(), 'sector', 'ACTIVITY')
    expect(appended).not.toBeNull()
    const pendingId = appended!.node.id
    let workingTree = appended!.tree
    const registry = createInlineNameSaveRegistry()
    const focusInvalid = vi.fn()

    registry.register({
      nodeId: pendingId,
      tryCommitForSave: () => ({
        ok: false,
        message: 'Informe um nome.',
        nodeId: pendingId,
      }),
      focusInvalidDraft: focusInvalid,
    })

    expect(registry.commitAllForSave()).toEqual({
      ok: false,
      message: 'Informe um nome.',
      nodeId: pendingId,
    })
    expect(focusInvalid).toHaveBeenCalledTimes(1)
    expect(validatePreviewActivityTree(workingTree).ok).toBe(false)
    workingTree = patchNodeNameInTreeClone(workingTree, pendingId, ' ')
    expect(validatePreviewActivityTree(workingTree).ok).toBe(false)
  })
})
