import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline'
import type { DatabaseBackupsConfig } from './database-backups.files.js'

/** Código de saída do script quando a trava (`flock`) está ocupada. */
export const SCRIPT_EXIT_LOCK_BUSY = 75

export type ScriptLockResult = 'acquired' | 'busy' | 'failed'

export type ScriptRun = {
  /** Resolve quando o script obtém a trava, recusa por trava ocupada ou falha antes dela. */
  lock: Promise<ScriptLockResult>
  done: Promise<{ code: number | null; stderr: string }>
}

const STDERR_LIMIT = 4000

/**
 * Executa `sgp-db-backup.sh` via `bash`, sem senha na linha de comando:
 * o script lê as credenciais do mesmo `.env` da API.
 */
export function runBackupScript(
  config: DatabaseBackupsConfig,
  args: string[],
  onStdoutLine?: (line: string) => void,
): ScriptRun {
  let resolveLock!: (r: ScriptLockResult) => void
  const lock = new Promise<ScriptLockResult>((r) => {
    resolveLock = r
  })
  let lockSettled = false
  const settleLock = (r: ScriptLockResult) => {
    if (lockSettled) return
    lockSettled = true
    resolveLock(r)
  }

  const done = new Promise<{ code: number | null; stderr: string }>((resolveDone) => {
    let stderr = ''
    const child = spawn('bash', [config.scriptPath, ...args], {
      env: {
        ...process.env,
        SGP_BACKUP_DIR: config.backupDir,
        SGP_BACKUP_LOG: config.logFile,
        SGP_SERVER_ENV_FILE: config.serverEnvFile,
        SGP_BACKUP_ENV: process.env.APP_ENV === 'homologation' ? 'homologation' : 'production',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    createInterface({ input: child.stdout }).on('line', (line) => {
      if (line === 'LOCK_ACQUIRED') settleLock('acquired')
      onStdoutLine?.(line)
    })
    child.stderr.on('data', (chunk: Buffer) => {
      stderr = (stderr + chunk.toString('utf-8')).slice(-STDERR_LIMIT)
    })
    child.on('error', (err) => {
      settleLock('failed')
      resolveDone({ code: null, stderr: err.message })
    })
    child.on('close', (code) => {
      settleLock(code === SCRIPT_EXIT_LOCK_BUSY ? 'busy' : 'failed')
      resolveDone({ code, stderr: stderr.trim() })
    })
  })

  return { lock, done }
}

/** Última linha não vazia do stderr (mensagem em português gerada pelo script). */
export function lastStderrLine(stderr: string): string {
  const lines = stderr.split('\n').map((l) => l.trim()).filter(Boolean)
  return lines[lines.length - 1] ?? ''
}
