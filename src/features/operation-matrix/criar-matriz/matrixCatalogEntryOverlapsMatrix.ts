import type { MatrixNodeTreeApi } from '../../../domain/operation-matrix/operation-matrix.types'
import type { MatrixCatalogTaskEntry } from './extractMatrixTasksForCatalog'

/**
 * Detecta se uma entrada do catálogo de reaproveitamento já tem contraparte provável
 * na matriz atual (evita inclusão acidental duplicada quando `source_key` ou nome coincidem).
 */
export function matrixCatalogEntryOverlapsCurrentMatrix(
  entry: MatrixCatalogTaskEntry,
  currentItemTree: MatrixNodeTreeApi | null,
): boolean {
  if (!currentItemTree || currentItemTree.node_type !== 'ITEM') return false
  const tasks = currentItemTree.children.filter((c) => c.node_type === 'TASK')
  const sk = entry.taskSubtree.source_key?.trim()
  if (sk) {
    return tasks.some((t) => (t.source_key?.trim() ?? '') === sk)
  }
  const nameLc = entry.taskSubtree.name.trim().toLowerCase()
  if (!nameLc) return false
  return tasks.some((t) => t.name.trim().toLowerCase() === nameLc)
}
