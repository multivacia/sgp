import type { MatrixNodeTreeApi } from '../../domain/operation-matrix/operation-matrix.types'

export const OPERATION_MATRIX_PREVIEW_SNAPSHOT_VERSION = 1 as const

const STORAGE_PREFIX = 'sgp:op-matrix-preview:'

export type MatrixEditorFormSnapshot = {
  formName: string
  formCode: string
  formDescription: string
  formActive: boolean
  formPlanned: string
  formResponsible: string
  formRequired: boolean
}

export type OperationMatrixPreviewSnapshot = {
  schemaVersion: typeof OPERATION_MATRIX_PREVIEW_SNAPSHOT_VERSION
  itemId: string
  tree: MatrixNodeTreeApi
  capturedAt: string
}

export function previewStorageKey(token: string): string {
  return `${STORAGE_PREFIX}${token}`
}

export function generatePreviewDraftToken(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
}

export function findNodeInTree(
  node: MatrixNodeTreeApi,
  id: string,
): MatrixNodeTreeApi | null {
  if (node.id === id) return node
  for (const c of node.children) {
    const f = findNodeInTree(c, id)
    if (f) return f
  }
  return null
}

export function deepCloneMatrixTree(tree: MatrixNodeTreeApi): MatrixNodeTreeApi {
  return JSON.parse(JSON.stringify(tree)) as MatrixNodeTreeApi
}

/**
 * Aplica o estado atual do formulário do editor ao clone da árvore (nó selecionado),
 * para o preview refletir alterações ainda não salvas.
 */
export function applyEditorFormToTreeClone(
  tree: MatrixNodeTreeApi,
  selectedId: string | null,
  form: MatrixEditorFormSnapshot,
): MatrixNodeTreeApi {
  const cloned = deepCloneMatrixTree(tree)
  if (!selectedId) return cloned
  const node = findNodeInTree(cloned, selectedId)
  if (!node) return cloned

  node.name = form.formName.trim()
  node.code = form.formCode.trim() || null
  node.description = form.formDescription.trim() || null

  if (node.node_type === 'ITEM' || node.node_type === 'TASK') {
    node.is_active = form.formActive
  }

  if (node.node_type === 'ACTIVITY') {
    const pm = form.formPlanned.trim()
    if (pm === '') {
      node.planned_minutes = null
    } else {
      const n = Number.parseInt(pm, 10)
      node.planned_minutes = Number.isNaN(n) ? node.planned_minutes : n
    }
    node.default_responsible_id = form.formResponsible.trim() || null
    node.required = form.formRequired
  }

  return cloned
}

export function buildOperationMatrixPreviewSnapshot(
  itemId: string,
  tree: MatrixNodeTreeApi,
  selectedId: string | null,
  form: MatrixEditorFormSnapshot,
): OperationMatrixPreviewSnapshot {
  return {
    schemaVersion: OPERATION_MATRIX_PREVIEW_SNAPSHOT_VERSION,
    itemId,
    tree: applyEditorFormToTreeClone(tree, selectedId, form),
    capturedAt: new Date().toISOString(),
  }
}

export function snapshotToJson(snapshot: OperationMatrixPreviewSnapshot): string {
  return JSON.stringify(snapshot)
}

export function parsePreviewSnapshotJson(raw: string | null): OperationMatrixPreviewSnapshot | null {
  if (raw == null || raw.trim() === '') return null
  try {
    const v = JSON.parse(raw) as unknown
    if (!v || typeof v !== 'object') return null
    const o = v as Record<string, unknown>
    if (o.schemaVersion !== OPERATION_MATRIX_PREVIEW_SNAPSHOT_VERSION) return null
    if (typeof o.itemId !== 'string' || o.itemId.trim() === '') return null
    if (!o.tree || typeof o.tree !== 'object') return null
    return o as unknown as OperationMatrixPreviewSnapshot
  } catch {
    return null
  }
}

export function readPreviewSnapshotFromSession(token: string): OperationMatrixPreviewSnapshot | null {
  if (typeof sessionStorage === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(previewStorageKey(token))
    return parsePreviewSnapshotJson(raw)
  } catch {
    return null
  }
}

export function writePreviewSnapshotToSession(
  token: string,
  snapshot: OperationMatrixPreviewSnapshot,
): { ok: true } | { ok: false; reason: 'quota' | 'unknown' } {
  if (typeof sessionStorage === 'undefined') {
    return { ok: false, reason: 'unknown' }
  }
  try {
    sessionStorage.setItem(previewStorageKey(token), snapshotToJson(snapshot))
    return { ok: true }
  } catch (e) {
    const name = e instanceof DOMException ? e.name : ''
    if (name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED') {
      return { ok: false, reason: 'quota' }
    }
    return { ok: false, reason: 'unknown' }
  }
}
