import type {
  DatabaseBackupItem,
  DatabaseBackupsStatus,
  DatabaseRestoreJob,
  DatabaseRestorePhase,
} from '../../domain/database-backups/databaseBackups.types'
import { ApiError } from '../../lib/api/apiErrors'
import { requestJson, requestJsonEnvelope } from '../../lib/api/client'
import { getApiBaseUrl } from '../../lib/api/env'

const BASE = '/api/v1/admin/database-backups'

export async function listDatabaseBackups(): Promise<DatabaseBackupItem[]> {
  const { data } = await requestJsonEnvelope<DatabaseBackupItem[]>('GET', BASE)
  return Array.isArray(data) ? data : []
}

export async function getDatabaseBackupsStatus(): Promise<DatabaseBackupsStatus> {
  return requestJson<DatabaseBackupsStatus>('GET', `${BASE}/status`)
}

export async function startDatabaseBackup(): Promise<void> {
  await requestJson<{ started: boolean }>('POST', BASE)
}

export async function startDatabaseRestore(input: {
  fileName: string
  databaseName: string
}): Promise<DatabaseRestoreJob> {
  return requestJson<DatabaseRestoreJob>('POST', `${BASE}/restore`, { body: input })
}

/**
 * Durante o restore a API responde 503 a tudo (modo manutenção), com a fase em `details`.
 * Devolve `{ maintenance: true, phase }` nesse caso; senão o resultado final do restore.
 */
export async function getDatabaseRestoreStatus(): Promise<
  | { maintenance: true; phase: DatabaseRestorePhase | null }
  | { maintenance: false; job: DatabaseRestoreJob | null }
> {
  try {
    const job = await requestJson<DatabaseRestoreJob | null>('GET', `${BASE}/restore/status`)
    return { maintenance: false, job }
  } catch (err) {
    if (err instanceof ApiError && err.status === 503) {
      const details = err.details as { maintenance?: boolean; restorePhase?: string | null } | undefined
      if (details?.maintenance) {
        return {
          maintenance: true,
          phase: (details.restorePhase as DatabaseRestorePhase | null) ?? null,
        }
      }
    }
    throw err
  }
}

/** URL do download (streaming direto do navegador, sem carregar o arquivo em memória). */
export function databaseBackupDownloadUrl(fileName: string): string {
  const path = `${BASE}/${encodeURIComponent(fileName)}/download`
  const base = getApiBaseUrl()
  return base ? `${base}${path}` : path
}
