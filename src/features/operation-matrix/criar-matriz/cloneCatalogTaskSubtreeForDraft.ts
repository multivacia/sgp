import type { MatrixNodeTreeApi } from '../../../domain/operation-matrix/operation-matrix.types'

export function sortMatrixChildNodes(node: MatrixNodeTreeApi): MatrixNodeTreeApi[] {
  return [...node.children].sort((a, b) => a.order_index - b.order_index)
}

function sortChildren(node: MatrixNodeTreeApi): MatrixNodeTreeApi[] {
  return sortMatrixChildNodes(node)
}

/**
 * Deep clone de uma subárvore TASK (catálogo) com novos IDs client-side.
 * Garante que o draft não partilha identidade com nós da matriz de origem.
 */
export function cloneTaskSubtreeWithNewIds(taskRoot: MatrixNodeTreeApi): MatrixNodeTreeApi {
  if (taskRoot.node_type !== 'TASK') {
    throw new Error('cloneTaskSubtreeWithNewIds: raiz deve ser TASK')
  }

  const idMap = new Map<string, string>()

  function collectIds(node: MatrixNodeTreeApi): void {
    idMap.set(node.id, globalThis.crypto.randomUUID())
    for (const ch of node.children) collectIds(ch)
  }
  collectIds(taskRoot)

  const newTaskId = idMap.get(taskRoot.id)!

  function rebuild(node: MatrixNodeTreeApi): MatrixNodeTreeApi {
    const newId = idMap.get(node.id)!
    const mappedParent =
      node.parent_id != null && idMap.has(node.parent_id)
        ? idMap.get(node.parent_id)!
        : null

    return {
      ...node,
      id: newId,
      parent_id: mappedParent,
      root_id: newTaskId,
      children: sortChildren(node).map(rebuild),
    }
  }

  return rebuild(taskRoot)
}

export type CatalogOpcaoDraftInstance = {
  /** Identidade da instância no assistente (não confundir com taskId da origem). */
  instanceId: string
  sourceTaskId: string
  sourceMatrixItemId: string
  sourceMatrixItemName: string
  sourceTaskName: string
  /** Raiz TASK editável (IDs temporários). */
  draftRoot: MatrixNodeTreeApi
}
