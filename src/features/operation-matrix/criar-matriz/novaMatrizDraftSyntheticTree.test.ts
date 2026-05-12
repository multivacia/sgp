import { describe, expect, it } from 'vitest'
import type { MatrixNodeTreeApi } from '../../../domain/operation-matrix/operation-matrix.types'
import { reorderSiblingsRelativeToOver } from '../matrixStructureReorder'
import type { CatalogOpcaoDraftInstance } from './cloneCatalogTaskSubtreeForDraft'
import {
  NOVA_MATRIZ_DRAFT_SYNTHETIC_ITEM_ID,
  buildSyntheticItemTreeFromDrafts,
  orderedTaskRootsFromSyntheticItem,
  reorderDraftInstancesAfterTaskReorder,
} from './novaMatrizDraftSyntheticTree'

function minimalTask(id: string, order: number, name: string): MatrixNodeTreeApi {
  return {
    id,
    parent_id: null,
    root_id: id,
    node_type: 'TASK',
    code: null,
    name,
    description: null,
    order_index: order,
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
}

function instFor(task: MatrixNodeTreeApi): CatalogOpcaoDraftInstance {
  return {
    instanceId: `inst-${task.id}`,
    sourceTaskId: 'src',
    sourceMatrixItemId: 'm',
    sourceMatrixItemName: 'X',
    sourceTaskName: 'Y',
    draftRoot: task,
  }
}

describe('novaMatrizDraftSyntheticTree', () => {
  it('builds synthetic ITEM whose TASK children match draft roots', () => {
    const t0 = minimalTask('a', 0, 'A')
    const t1 = minimalTask('b', 1, 'B')
    const drafts = [instFor(t0), instFor(t1)]
    const root = buildSyntheticItemTreeFromDrafts(drafts)
    expect(root.id).toBe(NOVA_MATRIZ_DRAFT_SYNTHETIC_ITEM_ID)
    expect(root.children).toHaveLength(2)
    expect(root.children.every((c) => c.parent_id === NOVA_MATRIZ_DRAFT_SYNTHETIC_ITEM_ID)).toBe(
      true,
    )
  })

  it('reorders draft TASK siblings via reorderSiblingsRelativeToOver on synthetic tree', () => {
    const t0 = minimalTask('a', 0, 'A')
    const t1 = minimalTask('b', 1, 'B')
    const drafts = [instFor(t0), instFor(t1)]
    const synth = buildSyntheticItemTreeFromDrafts(drafts)
    const next = reorderSiblingsRelativeToOver(synth, 'b', 'a')
    expect(next).not.toBeNull()
    const ordered = orderedTaskRootsFromSyntheticItem(next!)
    expect(ordered.map((t) => t.id)).toEqual(['b', 'a'])
    expect(ordered.map((t) => t.order_index)).toEqual([0, 1])
    const nextDrafts = reorderDraftInstancesAfterTaskReorder(drafts, ordered)
    expect(nextDrafts.map((d) => d.draftRoot.id)).toEqual(['b', 'a'])
  })
})
