import { getApiBaseUrl } from '../../lib/api/env'
import { requestJson } from '../../lib/api/client'
import { ApiError } from '../../lib/api/apiErrors'
import type {
  BackupListResponse,
  BackupRun,
  BackupSummary,
  BackupWalListResponse,
  BackupWalSegment,
} from '../../domain/backups/backups.types'

const base = '/api/v1/admin/backups'

function filenameFromContentDisposition(header: string | null): string | null {
  if (!header) return null
  const utf = /filename\*=UTF-8''([^;]+)/i.exec(header)
  if (utf?.[1]) {
    try {
      return decodeURIComponent(utf[1].trim())
    } catch {
      return utf[1].trim()
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(header)
  return plain?.[1]?.trim() || null
}

async function downloadAttachment(pathPart: string, fallbackName: string): Promise<void> {
  const baseUrl = getApiBaseUrl()
  const url = baseUrl ? `${baseUrl}${pathPart}` : pathPart

  let res: Response
  try {
    res = await fetch(url, { method: 'GET', credentials: 'include' })
  } catch (e) {
    throw new ApiError('Falha de rede ao baixar backup.', 503, {
      code: 'NETWORK_ERROR',
      cause: e,
    })
  }

  if (!res.ok) {
    throw new ApiError('Não foi possível baixar o arquivo.', res.status)
  }

  const blob = await res.blob()
  const filename =
    filenameFromContentDisposition(res.headers.get('Content-Disposition')) ??
    fallbackName
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

export async function fetchBackupSummary(): Promise<BackupSummary> {
  return requestJson<BackupSummary>('GET', `${base}/summary`)
}

export async function fetchBackupList(): Promise<BackupListResponse> {
  return requestJson<BackupListResponse>('GET', base)
}

export async function triggerManualBackup(): Promise<BackupRun> {
  return requestJson<BackupRun>('POST', base)
}

export async function downloadBackup(id: string, fallbackName: string): Promise<void> {
  await downloadAttachment(
    `${base}/${encodeURIComponent(id)}/download`,
    fallbackName,
  )
}

export async function fetchWalList(): Promise<BackupWalListResponse> {
  return requestJson<BackupWalListResponse>('GET', `${base}/wal`)
}

export async function syncWalSegments(): Promise<{
  segmentsUpserted: number
  items: BackupWalSegment[]
}> {
  return requestJson('POST', `${base}/wal/sync`)
}

export async function downloadWalSegment(
  id: string,
  fallbackName: string,
): Promise<void> {
  await downloadAttachment(
    `${base}/wal/${encodeURIComponent(id)}/download`,
    fallbackName,
  )
}
