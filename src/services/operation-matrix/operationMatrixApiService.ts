import { ApiError } from '../../lib/api/apiErrors'
import { requestJson, requestJsonEnvelope } from '../../lib/api/client'
import { getApiBaseUrl } from '../../lib/api/env'
import type { MatrixSuggestionCatalogData } from '../../catalog/matrixSuggestion/types'
import type {
  DuplicateMatrixItemSummary,
  MatrixDeleteResult,
  MatrixDuplicationWarning,
  MatrixNodeApi,
  MatrixNodeTreeApi,
  MatrixNodeType,
  MatrixRestoreResult,
} from '../../domain/operation-matrix/operation-matrix.types'

function warningsFromMeta(meta: Record<string, unknown>): MatrixDuplicationWarning[] {
  return Array.isArray(meta.warnings) ? (meta.warnings as MatrixDuplicationWarning[]) : []
}

const base = '/api/v1'

export const EXPORT_MATRIX_ITEM_ACTION_LABEL = 'Exportar para Excel'
export const EXPORT_MATRIX_ITEM_FAIL_MESSAGE =
  'Não foi possível exportar a Matriz para Excel.'

function filenameFromContentDisposition(header: string | null): string | null {
  if (!header) return null
  const utfMatch = /filename\*=UTF-8''([^;]+)/i.exec(header)
  if (utfMatch?.[1]) {
    try {
      return decodeURIComponent(utfMatch[1])
    } catch {
      return utfMatch[1]
    }
  }
  const quoted = /filename="([^"]+)"/i.exec(header)
  if (quoted?.[1]) return quoted[1]
  const plain = /filename=([^;]+)/i.exec(header)
  const raw = plain?.[1]?.trim()
  return raw ? raw.replace(/^"|"$/g, '') : null
}

function sanitizeMatrixExportFilenamePart(value: string): string {
  const trimmed = value.trim()
  const sanitized = trimmed
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
  return sanitized || 'matriz'
}

function formatMatrixExportDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function buildMatrixExportFallbackFilename(
  matrixName: string,
  matrixCode: string | null | undefined,
  itemId: string,
  exportedAt = new Date(),
): string {
  const primary = matrixName.trim() || matrixCode?.trim() || itemId.trim()
  const part = sanitizeMatrixExportFilenamePart(primary)
  const datePart = formatMatrixExportDate(exportedAt)
  return `matriz-${part}-${datePart}.xlsx`
}

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

export type DuplicateMatrixItemResult = {
  data: DuplicateMatrixItemSummary
  warnings: MatrixDuplicationWarning[]
}

export async function duplicateMatrixItem(
  itemId: string,
): Promise<DuplicateMatrixItemResult> {
  const { data, meta } = await requestJsonEnvelope<DuplicateMatrixItemSummary>(
    'POST',
    `${base}/operation-matrix/items/${encodeURIComponent(itemId)}/duplicate`,
  )
  return { data, warnings: warningsFromMeta(meta) }
}

export type ExportMatrixItemToExcelOptions = {
  matrixName?: string
  matrixCode?: string | null
}

export async function exportMatrixItemToExcel(
  itemId: string,
  options?: ExportMatrixItemToExcelOptions,
): Promise<void> {
  const baseUrl = getApiBaseUrl()
  const pathPart = `${base}/operation-matrix/items/${encodeURIComponent(itemId)}/export.xlsx`
  const url = baseUrl ? `${baseUrl}${pathPart}` : pathPart

  let res: Response
  try {
    res = await fetch(url, { method: 'GET', credentials: 'include' })
  } catch (e) {
    throw new ApiError(EXPORT_MATRIX_ITEM_FAIL_MESSAGE, 503, {
      code: 'NETWORK_ERROR',
      cause: e,
    })
  }

  if (!res.ok) {
    throw new ApiError(EXPORT_MATRIX_ITEM_FAIL_MESSAGE, res.status)
  }

  const blob = await res.blob()
  const filename =
    filenameFromContentDisposition(res.headers.get('Content-Disposition')) ??
    buildMatrixExportFallbackFilename(
      options?.matrixName ?? '',
      options?.matrixCode,
      itemId,
    )
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = filename
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(objectUrl)
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
  plannedQuantity?: number
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
  plannedQuantity?: number
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

export type DuplicateMatrixNodeResult = {
  data: MatrixNodeTreeApi
  warnings: MatrixDuplicationWarning[]
}

export async function duplicateMatrixNode(
  id: string,
): Promise<DuplicateMatrixNodeResult> {
  const { data, meta } = await requestJsonEnvelope<MatrixNodeTreeApi>(
    'POST',
    `${base}/operation-matrix/nodes/${encodeURIComponent(id)}/duplicate`,
  )
  return { data, warnings: warningsFromMeta(meta) }
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
