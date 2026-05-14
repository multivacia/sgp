import type {
  MatrixNodeTreeApi,
  MatrixNodeType,
} from '../../domain/operation-matrix/operation-matrix.types'
import { deepCloneMatrixTree, findNodeInTree } from './operationMatrixPreviewSnapshot'
import { normalizePreviewStructureNodeName } from './operationMatrixPreviewEdits'

export const PREVIEW_REMOVE_STRUCTURE_CONFIRM = {
  TASK: 'Remover esta tarefa também removerá seus setores e atividades. Deseja continuar?',
  SECTOR: 'Remover este setor também removerá suas atividades. Deseja continuar?',
  ACTIVITY: 'Deseja remover esta atividade?',
} as const

export function confirmPreviewStructureRemoval(
  nodeType: 'TASK' | 'SECTOR' | 'ACTIVITY',
): boolean {
  return window.confirm(PREVIEW_REMOVE_STRUCTURE_CONFIRM[nodeType])
}

function reindexTypedSiblingOrderIndices(
  parent: MatrixNodeTreeApi,
  nodeType: MatrixNodeType,
): void {
  const siblings = parent.children
    .filter((child) => child.node_type === nodeType)
    .slice()
    .sort(
      (a, b) =>
        a.order_index - b.order_index ||
        a.name.localeCompare(b.name, 'pt-BR'),
    )
  siblings.forEach((child, index) => {
    child.order_index = index
  })
}

export const PREVIEW_PENDING_NODE_ID_PREFIX = 'preview-pending:'

const PENDING_CREATE_NODE_TYPES = new Set<MatrixNodeType>(['TASK', 'SECTOR', 'ACTIVITY'])

export function isPreviewPendingNodeId(id: string): boolean {
  return id.startsWith(PREVIEW_PENDING_NODE_ID_PREFIX)
}

export function generatePreviewPendingNodeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${PREVIEW_PENDING_NODE_ID_PREFIX}${crypto.randomUUID()}`
  }
  return `${PREVIEW_PENDING_NODE_ID_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
}

function nextSiblingOrderIndex(parent: MatrixNodeTreeApi, nodeType: MatrixNodeType): number {
  const siblings = parent.children.filter((child) => child.node_type === nodeType)
  if (siblings.length === 0) return 0
  return Math.max(...siblings.map((child) => child.order_index), -1) + 1
}

export function createPreviewPendingStructureNode(
  nodeType: 'TASK' | 'SECTOR' | 'ACTIVITY',
  parent: MatrixNodeTreeApi,
): MatrixNodeTreeApi {
  const orderIndex = nextSiblingOrderIndex(parent, nodeType)
  return {
    id: generatePreviewPendingNodeId(),
    parent_id: parent.id,
    root_id: parent.root_id,
    node_type: nodeType,
    code: null,
    name: '',
    description: null,
    order_index: orderIndex,
    level_depth: parent.level_depth + 1,
    is_active: true,
    planned_minutes: nodeType === 'ACTIVITY' ? null : null,
    default_responsible_id: null,
    team_ids: [],
    required: nodeType === 'ACTIVITY' ? false : false,
    source_key: null,
    metadata_json: { previewPendingCreate: true },
    created_at: '',
    updated_at: '',
    deleted_at: null,
    children: [],
  }
}

export function appendPreviewPendingStructureNode(
  tree: MatrixNodeTreeApi,
  parentId: string,
  nodeType: 'TASK' | 'SECTOR' | 'ACTIVITY',
): { tree: MatrixNodeTreeApi; node: MatrixNodeTreeApi } | null {
  const next = deepCloneMatrixTree(tree)
  const parent = findNodeInTree(next, parentId)
  if (!parent) return null
  if (nodeType === 'TASK' && parent.node_type !== 'ITEM') return null
  if (nodeType === 'SECTOR' && parent.node_type !== 'TASK') return null
  if (nodeType === 'ACTIVITY' && parent.node_type !== 'SECTOR') return null

  const node = createPreviewPendingStructureNode(nodeType, parent)
  parent.children = [...parent.children, node]
  return { tree: next, node }
}

export function removePreviewStructureNode(
  tree: MatrixNodeTreeApi,
  nodeId: string,
): MatrixNodeTreeApi {
  const next = deepCloneMatrixTree(tree)
  let removedType: MatrixNodeType | null = null
  let parentId: string | null = null

  function detach(parent: MatrixNodeTreeApi): boolean {
    const index = parent.children.findIndex((child) => child.id === nodeId)
    if (index >= 0) {
      removedType = parent.children[index]!.node_type
      parentId = parent.id
      parent.children = parent.children.filter((child) => child.id !== nodeId)
      return true
    }
    for (const child of parent.children) {
      if (detach(child)) return true
    }
    return false
  }

  detach(next)

  if (removedType && parentId) {
    const parent = findNodeInTree(next, parentId)
    if (parent) reindexTypedSiblingOrderIndices(parent, removedType)
  }

  return next
}

export function hasPreviewPendingCreateNodes(tree: MatrixNodeTreeApi): boolean {
  let found = false
  function walk(node: MatrixNodeTreeApi) {
    if (isPreviewPendingNodeId(node.id)) {
      found = true
      return
    }
    for (const child of node.children) walk(child)
  }
  walk(tree)
  return found
}

export function collectPreviewPendingCreateNodes(
  tree: MatrixNodeTreeApi,
): MatrixNodeTreeApi[] {
  const out: MatrixNodeTreeApi[] = []
  function walk(node: MatrixNodeTreeApi) {
    if (isPreviewPendingNodeId(node.id) && PENDING_CREATE_NODE_TYPES.has(node.node_type)) {
      out.push(node)
    }
    for (const child of node.children) walk(child)
  }
  walk(tree)
  return out.sort(
    (a, b) =>
      a.level_depth - b.level_depth ||
      a.order_index - b.order_index ||
      normalizePreviewStructureNodeName(a.name).localeCompare(
        normalizePreviewStructureNodeName(b.name),
        'pt-BR',
      ),
  )
}
