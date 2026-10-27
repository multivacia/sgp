import { readFile, readdir, stat } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const moduleDir = dirname(fileURLToPath(import.meta.url))
/** Diretório `server/` (vale para `src/` com tsx e para `dist/`). */
const serverRoot = join(moduleDir, '../../..')
const workspaceRoot = join(serverRoot, '..')

export const BACKUP_REASONS = ['scheduled', 'manual', 'pre-deploy', 'pre-restore'] as const
export type BackupReason = (typeof BACKUP_REASONS)[number]

/** Mesmo padrão de nome usado por `scripts/db/backup/sgp-db-backup.sh`. */
export const BACKUP_DUMP_NAME_RE =
  /^sgp_(\d{8})-(\d{6})_(scheduled|manual|pre-deploy|pre-restore)\.dump$/

export type DatabaseBackupsConfig = {
  backupDir: string
  logFile: string
  scriptPath: string
  serverEnvFile: string
}

/** Lido a cada uso: permite configurar por `server/.env` e ajustar em testes. */
export function getDatabaseBackupsConfig(): DatabaseBackupsConfig {
  const isHomol = process.env.APP_ENV === 'homologation'
  const backupDir = process.env.SGP_BACKUP_DIR?.trim() ||
    (isHomol ? '/opt/sgp/backups/hml' : '/opt/sgp/backups/db')
  return {
    backupDir,
    logFile: process.env.SGP_BACKUP_LOG?.trim() || join(backupDir, 'backup-log.jsonl'),
    scriptPath:
      process.env.SGP_BACKUP_SCRIPT?.trim() ||
      join(workspaceRoot, 'scripts/db/backup/sgp-db-backup.sh'),
    serverEnvFile: process.env.SGP_SERVER_ENV_FILE?.trim() || join(serverRoot, '.env'),
  }
}

export type BackupLogEvent = {
  event?: string
  status?: string
  reason?: string
  file?: string
  sha256?: string
  startedAt?: string
  finishedAt?: string
  confirmedAt?: string
  errorMessage?: string | null
  files?: { name: string; sizeBytes: number; sha256: string }[]
}

export async function readBackupLog(logFile: string): Promise<BackupLogEvent[]> {
  let text: string
  try {
    text = await readFile(logFile, 'utf-8')
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw e
  }
  const out: BackupLogEvent[] = []
  for (const line of text.split('\n')) {
    const t = line.trim()
    if (!t) continue
    try {
      const parsed = JSON.parse(t) as unknown
      if (parsed && typeof parsed === 'object') out.push(parsed as BackupLogEvent)
    } catch {
      // Linha corrompida não derruba a leitura do restante.
    }
  }
  return out
}

/** Data/hora do nome (horário de São Paulo, UTC−3 fixo desde 2019) em ISO UTC. */
export function backupDateFromName(fileName: string): string | null {
  const m = BACKUP_DUMP_NAME_RE.exec(fileName)
  if (!m) return null
  const d = m[1]!
  const t = m[2]!
  const iso = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}T${t.slice(0, 2)}:${t.slice(2, 4)}:${t.slice(4, 6)}-03:00`
  const ms = Date.parse(iso)
  return Number.isNaN(ms) ? null : new Date(ms).toISOString()
}

export type DatabaseBackupItem = {
  fileName: string
  createdAt: string
  reason: BackupReason
  sizeBytes: number
  copyConfirmedAt: string
}

/**
 * Backups disponíveis na tela: `.dump` presente no diretório, com `.sha256` ao lado,
 * e com cópia confirmada no log (`copy-confirm`) para o mesmo SHA-256.
 */
export async function listConfirmedBackups(
  config: DatabaseBackupsConfig,
): Promise<DatabaseBackupItem[]> {
  const events = await readBackupLog(config.logFile)
  const confirmed = new Map<string, { sha256: string; confirmedAt: string }>()
  for (const ev of events) {
    if (ev.event !== 'copy-confirm' || ev.status !== 'success') continue
    if (!ev.file || !ev.sha256) continue
    confirmed.set(`${ev.file}|${ev.sha256}`, {
      sha256: ev.sha256,
      confirmedAt: ev.confirmedAt ?? ev.finishedAt ?? '',
    })
  }

  let names: string[]
  try {
    names = await readdir(config.backupDir)
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw e
  }

  const items: DatabaseBackupItem[] = []
  for (const name of names) {
    const m = BACKUP_DUMP_NAME_RE.exec(name)
    if (!m) continue
    const path = join(config.backupDir, name)
    let sha: string
    let sizeBytes: number
    try {
      const st = await stat(path)
      if (!st.isFile()) continue
      sizeBytes = st.size
      sha = (await readFile(`${path}.sha256`, 'utf-8')).split(/\s+/)[0] ?? ''
    } catch {
      continue
    }
    const conf = confirmed.get(`${name}|${sha}`)
    if (!conf) continue
    items.push({
      fileName: name,
      createdAt: backupDateFromName(name) ?? '',
      reason: m[3] as BackupReason,
      sizeBytes,
      copyConfirmedAt: conf.confirmedAt,
    })
  }
  items.sort((a, b) => (a.fileName < b.fileName ? 1 : -1))
  return items
}

export type LastBackupRun = {
  status: 'success' | 'failure'
  reason: string | null
  startedAt: string | null
  finishedAt: string | null
  errorMessage: string | null
}

export async function readLastBackupRun(
  config: DatabaseBackupsConfig,
): Promise<LastBackupRun | null> {
  const events = await readBackupLog(config.logFile)
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const ev = events[i]!
    if (ev.event !== 'backup') continue
    return {
      status: ev.status === 'success' ? 'success' : 'failure',
      reason: ev.reason ?? null,
      startedAt: ev.startedAt ?? null,
      finishedAt: ev.finishedAt ?? null,
      errorMessage: ev.status === 'success' ? null : (ev.errorMessage ?? null),
    }
  }
  return null
}
