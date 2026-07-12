import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type { Env, PgPoolConfigBase } from '../../config/env.js'

const execFileAsync = promisify(execFile)

export type PgDumpTarget = {
  host: string
  port: number
  database: string
  user: string
  password: string
}

export function resolvePgDumpTarget(env: Env): PgDumpTarget {
  const fromPool = resolveFromPoolConfig(env.pgPoolConfig)
  return {
    host: env.backupDatabaseHost || fromPool.host,
    port: env.backupDatabasePort ?? fromPool.port,
    database: env.backupDatabaseName || fromPool.database,
    user: env.backupDatabaseUser || fromPool.user,
    password: fromPool.password,
  }
}

function resolveFromPoolConfig(cfg: PgPoolConfigBase): PgDumpTarget {
  if ('connectionString' in cfg) {
    const u = new URL(cfg.connectionString)
    return {
      host: u.hostname || 'localhost',
      port: u.port ? Number.parseInt(u.port, 10) : 5432,
      database: decodeURIComponent((u.pathname || '/').replace(/^\//, '') || 'postgres'),
      user: decodeURIComponent(u.username || 'postgres'),
      password: decodeURIComponent(u.password || ''),
    }
  }
  return {
    host: cfg.host,
    port: cfg.port,
    database: cfg.database,
    user: cfg.user,
    password: cfg.password,
  }
}

export type RunPgDumpInput = {
  pgDumpPath: string
  target: PgDumpTarget
  outputPath: string
  timeoutMs: number
}

export type RunPgRestoreListInput = {
  pgRestorePath: string
  dumpPath: string
  timeoutMs: number
}

/** Spawn pg_dump --format=custom; senha apenas via PGPASSWORD no env do filho. */
export async function runPgDumpCustom(input: RunPgDumpInput): Promise<void> {
  const args = [
    '--format=custom',
    '--file',
    input.outputPath,
    '--host',
    input.target.host,
    '--port',
    String(input.target.port),
    '--username',
    input.target.user,
    '--dbname',
    input.target.database,
    '--no-password',
  ]
  await execFileAsync(input.pgDumpPath, args, {
    timeout: input.timeoutMs,
    env: {
      ...process.env,
      PGPASSWORD: input.target.password,
    },
    maxBuffer: 10 * 1024 * 1024,
  })
}

/** Validação de dump via pg_restore --list (não restaura dados). */
export async function runPgRestoreList(
  input: RunPgRestoreListInput,
): Promise<void> {
  await execFileAsync(
    input.pgRestorePath,
    ['--list', input.dumpPath],
    {
      timeout: input.timeoutMs,
      env: { ...process.env },
      maxBuffer: 20 * 1024 * 1024,
    },
  )
}

/** Injetável em testes. */
export const pgTools = {
  runPgDumpCustom,
  runPgRestoreList,
}
