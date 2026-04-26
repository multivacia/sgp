import type { MatrixNodeTreeApi } from '../../../domain/operation-matrix/operation-matrix.types'
import type { CatalogOpcaoDraftInstance } from './cloneCatalogTaskSubtreeForDraft'

/** Raiz ITEM sintética para alinhar UX ao editor (lista de TASKs = instâncias do draft). */
export const NM_CATALOG_DRAFT_ITEM_ID = 'nm-catalog-draft-item-root'

function setSubtreeRootId(node: MatrixNodeTreeApi, rootId: string): MatrixNodeTreeApi {
  return {
    ...node,
    root_id: rootId,
    children: node.children.map((c) => setSubtreeRootId(c, rootId)),
  }
}

/**
 * Monta uma árvore ITEM → TASK* compatível com `OperationMatrixTaskGrid` / agregados.
 */
export function buildDraftCatalogItemTree(
  instances: CatalogOpcaoDraftInstance[],
): MatrixNodeTreeApi {
  const itemId = NM_CATALOG_DRAFT_ITEM_ID
  const now = new Date().toISOString()

  const children: MatrixNodeTreeApi[] = instances.map((inst, i) => {
    const t = inst.draftRoot
    const underItem = setSubtreeRootId(
      {
        ...t,
        parent_id: itemId,
        order_index: i,
      },
      itemId,
    )
    return underItem
  })

  return {
    id: itemId,
    parent_id: null,
    root_id: itemId,
    node_type: 'ITEM',
    code: null,
    name: 'Nova matriz (rascunho)',
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
    created_at: now,
    updated_at: now,
    deleted_at: null,
    children,
  }
}
