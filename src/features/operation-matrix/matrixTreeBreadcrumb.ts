import type { MatrixNodeTreeApi } from '../../domain/operation-matrix/operation-matrix.types'
import { getPathIdsFromRoot } from './matrixTreeSelection'

export type BreadcrumbSegment = {
  id: string
  name: string
}

/** Uma travessia O(n) para índice id→nó; caminho O(h). */
export function buildBreadcrumbSegments(
  tree: MatrixNodeTreeApi,
  selectedId: string | null,
  parentMap: ReadonlyMap<string, string | null>,
): BreadcrumbSegment[] {
  if (!selectedId) return []
  const byId = new Map<string, MatrixNodeTreeApi>()

  function index(n: MatrixNodeTreeApi) {
    byId.set(n.id, n)
    for (const c of n.children) index(c)
  }
  index(tree)

  const ids = getPathIdsFromRoot(selectedId, parentMap)
  return ids.map((id) => {
    const n = byId.get(id)
    return { id, name: n?.name ?? '…' }
  })
}

export function breadcrumbLabel(
  segments: BreadcrumbSegment[],
  separator = ' › ',
): string {
  return segments.map((s) => s.name).join(separator)
}
