import type {
  MatrixNodeType,
  MatrixNodeTreeApi,
} from '../../domain/operation-matrix/operation-matrix.types'

/** id do nó → id do pai (raiz: null). Uma travessia O(n). */
export function buildParentIdMap(
  tree: MatrixNodeTreeApi,
): Map<string, string | null> {
  const m = new Map<string, string | null>()

  function walk(node: MatrixNodeTreeApi, parentId: string | null) {
    m.set(node.id, parentId)
    for (const c of node.children) walk(c, node.id)
  }

  walk(tree, null)
  return m
}

/** Lista raiz → … → id (inclusive). O(h). */
export function getPathIdsFromRoot(
  nodeId: string,
  parentMap: ReadonlyMap<string, string | null>,
): string[] {
  const path: string[] = []
  let cur: string | null | undefined = nodeId
  while (cur) {
    path.push(cur)
    cur = parentMap.get(cur) ?? null
  }
  path.reverse()
  return path
}

/** Conjunto de ancestrais + o próprio nó (ramo ativo). O(h). */
export function getActiveBranchIdSet(
  selectedId: string | null,
  parentMap: ReadonlyMap<string, string | null>,
): Set<string> {
  const s = new Set<string>()
  if (!selectedId) return s
  let cur: string | null | undefined = selectedId
  while (cur) {
    s.add(cur)
    cur = parentMap.get(cur) ?? null
  }
  return s
}

/** id do nó → tipo (uma travessia O(n)). */
export function buildNodeTypeMap(
  tree: MatrixNodeTreeApi,
): Map<string, MatrixNodeType> {
  const m = new Map<string, MatrixNodeType>()
  function walk(node: MatrixNodeTreeApi) {
    m.set(node.id, node.node_type)
    for (const c of node.children) walk(c)
  }
  walk(tree)
  return m
}

/** Primeiro ancestral (incluindo o próprio nó) do tipo desejado. */
export function findAncestorOfType(
  nodeId: string,
  desiredType: MatrixNodeType,
  parentMap: ReadonlyMap<string, string | null>,
  nodeTypes: ReadonlyMap<string, MatrixNodeType>,
): string | null {
  let cur: string | null | undefined = nodeId
  while (cur) {
    if (nodeTypes.get(cur) === desiredType) return cur
    cur = parentMap.get(cur) ?? null
  }
  return null
}

/** Primeiro ancestral do tipo TASK (ou null se for ITEM / fora da árvore). */
export function findAncestorTaskId(
  nodeId: string,
  parentMap: ReadonlyMap<string, string | null>,
  nodeTypes: ReadonlyMap<string, MatrixNodeType>,
): string | null {
  return findAncestorOfType(nodeId, 'TASK', parentMap, nodeTypes)
}
