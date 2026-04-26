import type { MatrixNodeTreeApi } from '../../domain/operation-matrix/operation-matrix.types'

function norm(s: string): string {
  return s.trim().toLowerCase()
}

/** Nó casa com a busca (nome, código, descrição). */
export function nodeMatchesQuery(node: MatrixNodeTreeApi, query: string): boolean {
  const q = norm(query)
  if (!q) return false
  if (norm(node.name).includes(q)) return true
  if (node.code && norm(node.code).includes(q)) return true
  if (node.description && norm(node.description).includes(q)) return true
  return false
}

/** IDs de nós que casam com a query (próprio nó ou algum descendente casa). Para expandir e destacar. */
export function collectMatchingNodeIds(
  tree: MatrixNodeTreeApi,
  query: string,
): Set<string> {
  const q = norm(query)
  const ids = new Set<string>()
  if (!q) return ids

  function dfs(node: MatrixNodeTreeApi): boolean {
    let childHit = false
    for (const c of node.children) {
      if (dfs(c)) childHit = true
    }
    const selfMatch = nodeMatchesQuery(node, query)
    if (selfMatch || childHit) ids.add(node.id)
    return selfMatch || childHit
  }

  dfs(tree)
  return ids
}

/** Fecha o conjunto com todos os ancestrais dos ids dados. */
export function addAncestors(
  ids: Iterable<string>,
  parentMap: ReadonlyMap<string, string | null>,
): Set<string> {
  const s = new Set<string>()
  for (const id of ids) {
    let cur: string | null | undefined = id
    while (cur) {
      s.add(cur)
      cur = parentMap.get(cur) ?? null
    }
  }
  return s
}

/**
 * Filtro “só sem responsável”: caminhos até atividades sem default_responsible_id.
 * Se `activitySearchQuery` estiver preenchido, restringe a atividades sem responsável que também casem com a busca.
 */
export function buildVisibleIdsForNoResponsibleFilter(
  tree: MatrixNodeTreeApi,
  parentMap: ReadonlyMap<string, string | null>,
  activitySearchQuery?: string,
): Set<string> {
  const activityIds: string[] = []
  const q = activitySearchQuery?.trim()

  function walk(node: MatrixNodeTreeApi) {
    if (node.node_type === 'ACTIVITY') {
      const dr = node.default_responsible_id?.trim() ?? ''
      if (!dr) {
        if (!q || nodeMatchesQuery(node, q)) {
          activityIds.push(node.id)
        }
      }
    }
    for (const c of node.children) walk(c)
  }

  walk(tree)
  return addAncestors(activityIds, parentMap)
}

export function buildAllNodeIds(tree: MatrixNodeTreeApi): Set<string> {
  const s = new Set<string>()
  function walk(n: MatrixNodeTreeApi) {
    s.add(n.id)
    for (const c of n.children) walk(c)
  }
  walk(tree)
  return s
}

/** Árvore podada: só nós cujo id está em `visible`. */
export function pruneTreeByVisibleIds(
  node: MatrixNodeTreeApi,
  visible: ReadonlySet<string>,
): MatrixNodeTreeApi | null {
  if (!visible.has(node.id)) return null
  const children = node.children
    .map((c) => pruneTreeByVisibleIds(c, visible))
    .filter((x): x is MatrixNodeTreeApi => x != null)
  return { ...node, children }
}

/** IDs de nós ancestrais dos matches (para expandir e revelar ocorrências). */
export function expansionIdsForMatches(
  matchIds: ReadonlySet<string>,
  parentMap: ReadonlyMap<string, string | null>,
): Set<string> {
  const need = new Set<string>()
  for (const id of matchIds) {
    let cur: string | null | undefined = parentMap.get(id) ?? null
    while (cur) {
      need.add(cur)
      cur = parentMap.get(cur) ?? null
    }
  }
  return need
}
