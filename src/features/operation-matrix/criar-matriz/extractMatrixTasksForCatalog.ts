import type { MatrixNodeTreeApi } from '../../../domain/operation-matrix/operation-matrix.types'

/** Opção de serviço (TASK) listada para reaproveitamento na nova matriz. */
export type MatrixCatalogTaskEntry = {
  taskId: string
  taskName: string
  matrixItemId: string
  matrixItemName: string
  /** Subárvore enraizada no TASK (inclui setores e etapas). */
  taskSubtree: MatrixNodeTreeApi
}

/**
 * Extrai filhos diretos `TASK` do item raiz, com metadados da matriz de origem.
 */
export function extractCatalogTasksFromItemTree(
  matrixItemId: string,
  matrixItemName: string,
  tree: MatrixNodeTreeApi,
): MatrixCatalogTaskEntry[] {
  if (tree.node_type !== 'ITEM') return []
  const tasks = tree.children.filter((c) => c.node_type === 'TASK')
  return tasks.map((taskSubtree) => ({
    taskId: taskSubtree.id,
    taskName: taskSubtree.name,
    matrixItemId,
    matrixItemName,
    taskSubtree,
  }))
}
