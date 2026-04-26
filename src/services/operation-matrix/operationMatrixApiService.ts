import { ApiError } from '../../lib/api/apiErrors'
import { requestJson } from '../../lib/api/client'
import type { MatrixSuggestionCatalogData } from '../../catalog/matrixSuggestion/types'
import type {
  MatrixDeleteResult,
  MatrixNodeApi,
  MatrixNodeTreeApi,
  MatrixNodeType,
  MatrixRestoreResult,
} from '../../domain/operation-matrix/operation-matrix.types'

const base = '/api/v1'

export type ListMatrixItemsParams = {
  search?: string
  isActive?: boolean
}

export async function listMatrixItems(
  params?: ListMatrixItemsParams,
): Promise<MatrixNodeApi[]> {
  const q = new URLSearchParams()
  const s = params?.search?.trim()
  if (s) q.set('search', s)
  if (params?.isActive === true) q.set('is_active', 'true')
  if (params?.isActive === false) q.set('is_active', 'false')
  const qs = q.toString()
  return requestJson<MatrixNodeApi[]>(
    'GET',
    `${base}/operation-matrix/items${qs ? `?${qs}` : ''}`,
  )
}

export async function getMatrixTree(itemId: string): Promise<MatrixNodeTreeApi> {
  return requestJson<MatrixNodeTreeApi>(
    'GET',
    `${base}/operation-matrix/items/${encodeURIComponent(itemId)}/tree`,
  )
}

export async function getMatrixSuggestionCatalog(): Promise<MatrixSuggestionCatalogData> {
  return requestJson<MatrixSuggestionCatalogData>(
    'GET',
    `${base}/operation-matrix/suggestion-catalog`,
  )
}

export type CreateMatrixNodeInput = {
  nodeType: MatrixNodeType
  parentId?: string | null
  name: string
  code?: string | null
  description?: string | null
  orderIndex?: number
  isActive?: boolean
  plannedMinutes?: number | null
  defaultResponsibleId?: string | null
  teamIds?: string[]
  required?: boolean
  sourceKey?: string | null
  metadataJson?: unknown
}

export async function createMatrixNode(
  input: CreateMatrixNodeInput,
): Promise<MatrixNodeApi> {
  return requestJson<MatrixNodeApi>('POST', `${base}/operation-matrix/nodes`, {
    body: input,
  })
}

export type PatchMatrixNodeInput = {
  name?: string
  code?: string | null
  description?: string | null
  orderIndex?: number
  isActive?: boolean
  plannedMinutes?: number | null
  defaultResponsibleId?: string | null
  teamIds?: string[]
  required?: boolean
  sourceKey?: string | null
  metadataJson?: unknown
}

export async function patchMatrixNode(
  id: string,
  input: PatchMatrixNodeInput,
): Promise<MatrixNodeApi> {
  return requestJson<MatrixNodeApi>(
    'PATCH',
    `${base}/operation-matrix/nodes/${encodeURIComponent(id)}`,
    { body: input },
  )
}

export async function deleteMatrixNode(id: string): Promise<MatrixDeleteResult> {
  return requestJson<MatrixDeleteResult>(
    'DELETE',
    `${base}/operation-matrix/nodes/${encodeURIComponent(id)}`,
  )
}

export async function reorderMatrixNode(
  id: string,
  direction: 'up' | 'down',
): Promise<MatrixNodeApi> {
  return requestJson<MatrixNodeApi>(
    'POST',
    `${base}/operation-matrix/nodes/${encodeURIComponent(id)}/reorder`,
    { body: { direction } },
  )
}

export async function duplicateMatrixNode(
  id: string,
): Promise<MatrixNodeTreeApi> {
  return requestJson<MatrixNodeTreeApi>(
    'POST',
    `${base}/operation-matrix/nodes/${encodeURIComponent(id)}/duplicate`,
  )
}

export async function restoreMatrixNode(
  id: string,
): Promise<MatrixRestoreResult> {
  return requestJson<MatrixRestoreResult>(
    'POST',
    `${base}/operation-matrix/nodes/${encodeURIComponent(id)}/restore`,
  )
}

export function isApiNotFound(e: unknown): boolean {
  return e instanceof ApiError && e.status === 404
}
