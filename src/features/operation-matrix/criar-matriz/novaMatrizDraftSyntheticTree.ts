import type { MatrixNodeTreeApi } from '../../../domain/operation-matrix/operation-matrix.types'
import type { CatalogOpcaoDraftInstance } from './cloneCatalogTaskSubtreeForDraft'
import { sortMatrixChildNodes } from './cloneCatalogTaskSubtreeForDraft'

/** ITEM sintético para reordenar opções (TASK) do rascunho da Nova Matriz com os mesmos helpers da árvore API. */
export const NOVA_MATRIZ_DRAFT_SYNTHETIC_ITEM_ID =
  '__nova_matriz_draft_synthetic_item__' as const

const NOW_PLACEHOLDER = '1970-01-01T00:00:00.000Z'

export function buildSyntheticItemTreeFromDrafts(
  drafts: readonly CatalogOpcaoDraftInstance[],
): MatrixNodeTreeApi {
  const orderedDrafts = drafts.slice().sort((a, b) => {
    const ai = a.draftRoot.order_index
    const bi = b.draftRoot.order_index
    if (ai !== bi) return ai - bi
    return a.draftRoot.name.localeCompare(b.draftRoot.name, 'pt-BR')
  })

  const children: MatrixNodeTreeApi[] = orderedDrafts.map((d, i) => ({
    ...d.draftRoot,
    parent_id: NOVA_MATRIZ_DRAFT_SYNTHETIC_ITEM_ID,
    order_index: i,
  }))

  return {
    id: NOVA_MATRIZ_DRAFT_SYNTHETIC_ITEM_ID,
    parent_id: null,
    root_id: NOVA_MATRIZ_DRAFT_SYNTHETIC_ITEM_ID,
    node_type: 'ITEM',
    code: null,
    name: '',
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
    created_at: NOW_PLACEHOLDER,
    updated_at: NOW_PLACEHOLDER,
    deleted_at: null,
    children,
  }
}

export function reorderDraftInstancesAfterTaskReorder(
  prev: readonly CatalogOpcaoDraftInstance[],
  orderedTaskRoots: MatrixNodeTreeApi[],
): CatalogOpcaoDraftInstance[] {
  const byTaskId = new Map(prev.map((d) => [d.draftRoot.id, d]))
  return orderedTaskRoots.map((t, idx) => {
    const inst = byTaskId.get(t.id)
    if (!inst) {
      throw new Error(`reorderDraftInstancesAfterTaskReorder: instância não encontrada para ${t.id}`)
    }
    return {
      ...inst,
      draftRoot: {
        ...t,
        order_index: idx,
      },
    }
  })
}

export function orderedTaskRootsFromSyntheticItem(
  itemRoot: MatrixNodeTreeApi,
): MatrixNodeTreeApi[] {
  return sortMatrixChildNodes(itemRoot).filter((c) => c.node_type === 'TASK')
}
