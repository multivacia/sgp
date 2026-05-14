import { arrayMove } from '@dnd-kit/sortable'
import type {
  MatrixNodeTreeApi,
  MatrixNodeType,
} from '../../domain/operation-matrix/operation-matrix.types'

export function snapshotOrderMap(root: MatrixNodeTreeApi): Map<string, number> {
  const m = new Map<string, number>()
  function walk(n: MatrixNodeTreeApi) {
    m.set(n.id, n.order_index)
    for (const c of n.children) walk(c)
  }
  walk(root)
  return m
}

export function orderTreeMatchesBaseline(
  tree: MatrixNodeTreeApi,
  baseline: ReadonlyMap<string, number>,
): boolean {
  const cur = snapshotOrderMap(tree)
  if (cur.size !== baseline.size) return false
  for (const [id, idx] of cur) {
    if (baseline.get(id) !== idx) return false
  }
  return true
}

export function computeOrderPatches(
  tree: MatrixNodeTreeApi,
  baseline: Map<string, number>,
): { id: string; orderIndex: number }[] {
  const cur = snapshotOrderMap(tree)
  const out: { id: string; orderIndex: number }[] = []
  for (const [id, idx] of cur) {
    if (!baseline.has(id) || baseline.get(id) !== idx) {
      out.push({ id, orderIndex: idx })
    }
  }
  return out
}

export function findNodeById(
  root: MatrixNodeTreeApi,
  id: string,
): MatrixNodeTreeApi | null {
  if (root.id === id) return root
  for (const c of root.children) {
    const f = findNodeById(c, id)
    if (f) return f
  }
  return null
}

export function findParentIdOf(
  root: MatrixNodeTreeApi,
  childId: string,
): string | null {
  for (const c of root.children) {
    if (c.id === childId) return root.id
    const p = findParentIdOf(c, childId)
    if (p !== null) return p
  }
  return null
}

function sortTypedSiblings(
  parent: MatrixNodeTreeApi,
  nodeType: MatrixNodeType,
): MatrixNodeTreeApi[] {
  return parent.children
    .filter((c) => c.node_type === nodeType)
    .slice()
    .sort(
      (a, b) =>
        a.order_index - b.order_index ||
        a.name.localeCompare(b.name, 'pt-BR'),
    )
}

function replaceParentChildrenInTree(
  root: MatrixNodeTreeApi,
  parentId: string,
  nextChildren: MatrixNodeTreeApi[],
): MatrixNodeTreeApi {
  if (root.id === parentId) {
    return { ...root, children: nextChildren }
  }
  return {
    ...root,
    children: root.children.map((c) =>
      replaceParentChildrenInTree(c, parentId, nextChildren),
    ),
  }
}

/**
 * Reordena nós irmãos do mesmo tipo sob o mesmo pai; atualiza `order_index` sequencialmente.
 * Não altera pai nem tipo. Retorna `null` se a operação for inválida (ex.: pais diferentes).
 */
export function reorderSiblingsRelativeToOver(
  root: MatrixNodeTreeApi,
  activeId: string,
  overId: string,
): MatrixNodeTreeApi | null {
  if (activeId === overId) return root
  const activeNode = findNodeById(root, activeId)
  const overNode = findNodeById(root, overId)
  if (!activeNode || !overNode) return null
  if (activeNode.node_type !== overNode.node_type) return null

  const parentIdA = findParentIdOf(root, activeId)
  const parentIdO = findParentIdOf(root, overId)
  if (parentIdA === null || parentIdA !== parentIdO) return null

  const parent = findNodeById(root, parentIdA)
  if (!parent) return null

  const siblings = sortTypedSiblings(parent, activeNode.node_type)
  const fromIdx = siblings.findIndex((s) => s.id === activeId)
  const toIdx = siblings.findIndex((s) => s.id === overId)
  if (fromIdx < 0 || toIdx < 0) return null

  const moved = arrayMove(siblings, fromIdx, toIdx)
  const reindexed = moved.map((n, i) => ({
    ...n,
    order_index: i,
  }))

  return replaceParentChildrenInTree(root, parentIdA, reindexed)
}

/**
 * Reordena apenas filhos `TASK` do ITEM raiz numa sequência explícita e reindexa
 * `order_index` como 0…n−1 (outros tipos como filhos do ITEM ficam atrás das tarefas).
 */
export function reorderItemChildTasksToOrder(
  root: MatrixNodeTreeApi,
  itemRootId: string,
  orderedTaskIds: readonly string[],
): MatrixNodeTreeApi | null {
  const item = findNodeById(root, itemRootId)
  if (!item || item.node_type !== 'ITEM') return null
  const taskById = new Map<string, MatrixNodeTreeApi>()
  const others: MatrixNodeTreeApi[] = []
  for (const ch of item.children) {
    if (ch.node_type === 'TASK') taskById.set(ch.id, ch)
    else others.push(ch)
  }
  if (orderedTaskIds.length !== taskById.size) return null
  const nextTasks: MatrixNodeTreeApi[] = []
  for (let i = 0; i < orderedTaskIds.length; i++) {
    const id = orderedTaskIds[i]
    if (!id) return null
    const n = taskById.get(id)
    if (!n) return null
    nextTasks.push({ ...n, order_index: i })
  }
  return replaceParentChildrenInTree(root, itemRootId, [...nextTasks, ...others])
}

export function reorderSiblingStep(
  root: MatrixNodeTreeApi,
  nodeId: string,
  dir: 'up' | 'down',
): MatrixNodeTreeApi | null {
  const node = findNodeById(root, nodeId)
  if (!node) return null
  const parentId = findParentIdOf(root, nodeId)
  if (parentId === null) return null
  const parent = findNodeById(root, parentId)
  if (!parent) return null
  const siblings = sortTypedSiblings(parent, node.node_type)
  const idx = siblings.findIndex((s) => s.id === nodeId)
  if (idx < 0) return null
  const newIdx = dir === 'up' ? idx - 1 : idx + 1
  if (newIdx < 0 || newIdx >= siblings.length) return null
  return reorderSiblingsRelativeToOver(root, nodeId, siblings[newIdx].id)
}
