import { createReadStream, type ReadStream } from 'node:fs'
import { join } from 'node:path'
import type pg from 'pg'
import type { Logger } from 'pino'
import type { Env } from '../../config/env.js'
import { AppError } from '../../shared/errors/AppError.js'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'
import {
  getDatabaseBackupsConfig,
  listConfirmedBackups,
  readLastBackupRun,
  type DatabaseBackupItem,
  type LastBackupRun,
} from './database-backups.files.js'
import { insertDatabaseRestoredAuditEvent } from './database-backups.repository.js'
import { lastStderrLine, runBackupScript } from './database-backups.runner.js'
import {
  MIGRATIONS_NOTICE,
  getRestoreJob,
  isMaintenanceActive,
  setMaintenanceActive,
  setRestoreJob,
  updateRestoreJob,
  type RestoreJob,
  type RestorePhase,
} from './database-backups.state.js'

const LOCK_BUSY_MESSAGE =
  'Já existe um backup ou restauração em andamento. Aguarde a conclusão e tente novamente.'

/** Nome da base da aplicação (o mesmo que o script lê do `.env`). */
export function resolveDatabaseName(env: Env): string {
  const cfg = env.pgPoolConfig
  if ('database' in cfg) return cfg.database
  try {
    return decodeURIComponent(new URL(cfg.connectionString).pathname.replace(/^\//, ''))
  } catch {
    return ''
  }
}

export async function serviceListDatabaseBackups(): Promise<DatabaseBackupItem[]> {
  return listConfirmedBackups(getDatabaseBackupsConfig())
}

export async function serviceGetDatabaseBackupsStatus(
  env: Env,
): Promise<{ databaseName: string; lastRun: LastBackupRun | null; restore: RestoreJob | null }> {
  return {
    databaseName: resolveDatabaseName(env),
    lastRun: await readLastBackupRun(getDatabaseBackupsConfig()),
    restore: getRestoreJob(),
  }
}

export function serviceGetRestoreStatus(): RestoreJob | null {
  return getRestoreJob()
}

async function findListedBackup(fileName: string): Promise<DatabaseBackupItem> {
  const items = await serviceListDatabaseBackups()
  const item = items.find((i) => i.fileName === fileName)
  if (!item) {
    throw new AppError(
      'Backup não encontrado na lista (é preciso estar na VPS e com cópia confirmada no OneDrive).',
      404,
      ErrorCodes.NOT_FOUND,
    )
  }
  return item
}

export async function serviceOpenBackupDownload(
  fileName: string,
): Promise<{ stream: ReadStream; sizeBytes: number; fileName: string }> {
  const item = await findListedBackup(fileName)
  const config = getDatabaseBackupsConfig()
  return {
    stream: createReadStream(join(config.backupDir, item.fileName)),
    sizeBytes: item.sizeBytes,
    fileName: item.fileName,
  }
}

function assertNoRestoreRunning(): void {
  if (isMaintenanceActive() || getRestoreJob()?.status === 'running') {
    throw new AppError(LOCK_BUSY_MESSAGE, 409, ErrorCodes.CONFLICT)
  }
}

/** Dispara `--reason manual` em segundo plano. 409 se a trava estiver ocupada. */
export async function serviceStartManualBackup(logger: Logger): Promise<void> {
  assertNoRestoreRunning()
  const run = runBackupScript(getDatabaseBackupsConfig(), ['--reason', 'manual'])
  const lock = await run.lock
  if (lock === 'busy') {
    throw new AppError(LOCK_BUSY_MESSAGE, 409, ErrorCodes.CONFLICT)
  }
  if (lock === 'failed') {
    const { stderr } = await run.done
    throw new AppError(
      `Não foi possível iniciar o backup: ${lastStderrLine(stderr) || 'erro desconhecido.'}`,
      500,
      ErrorCodes.INTERNAL,
    )
  }
  void run.done.then(({ code, stderr }) => {
    if (code === 0) logger.info('database backup (manual) concluído')
    else logger.error({ code, stderr: lastStderrLine(stderr) }, 'database backup (manual) falhou')
  })
}

/**
 * Restore em produção:
 * 1. confere o nome da base digitado (422) e se o arquivo está na lista (404);
 * 2. ativa o modo manutenção (demais requisições recebem 503);
 * 3. o script faz o backup `pre-restore` e o `pg_restore --single-transaction`;
 * 4. sai do modo manutenção e registra o restore em `admin_audit_events`.
 * Não executa migrations.
 */
export async function serviceStartRestore(
  pool: pg.Pool,
  env: Env,
  logger: Logger,
  input: { fileName: string; databaseName: string; actorUserId: string; actorEmail: string },
): Promise<RestoreJob> {
  const expected = resolveDatabaseName(env)
  if (!expected || input.databaseName !== expected) {
    throw new AppError(
      'O nome digitado não confere com o nome da base de produção. Restauração não iniciada.',
      422,
      ErrorCodes.VALIDATION_ERROR,
    )
  }
  await findListedBackup(input.fileName)
  assertNoRestoreRunning()

  setMaintenanceActive(true)
  setRestoreJob({
    status: 'running',
    phase: 'starting',
    fileName: input.fileName,
    startedByUserId: input.actorUserId,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    preRestoreBackup: null,
    errorMessage: null,
    migrationsNotice: null,
    auditRecorded: null,
  })

  const run = runBackupScript(getDatabaseBackupsConfig(), ['--restore', input.fileName], (line) => {
    if (line.startsWith('PHASE ')) {
      updateRestoreJob({ phase: line.slice('PHASE '.length) as RestorePhase })
    } else if (line.startsWith('PRE_RESTORE_BACKUP ')) {
      updateRestoreJob({ preRestoreBackup: line.slice('PRE_RESTORE_BACKUP '.length) })
    }
  })

  const lock = await run.lock
  if (lock !== 'acquired') {
    const { stderr } = await run.done
    setRestoreJob(null)
    setMaintenanceActive(false)
    if (lock === 'busy') {
      throw new AppError(LOCK_BUSY_MESSAGE, 409, ErrorCodes.CONFLICT)
    }
    throw new AppError(
      `Não foi possível iniciar a restauração: ${lastStderrLine(stderr) || 'erro desconhecido.'}`,
      500,
      ErrorCodes.INTERNAL,
    )
  }

  void run.done.then(async ({ code, stderr }) => {
    const success = code === 0
    const errorMessage = success
      ? null
      : lastStderrLine(stderr) || 'Restauração falhou; a base não foi alterada.'
    updateRestoreJob({
      status: success ? 'success' : 'failure',
      phase: 'done',
      finishedAt: new Date().toISOString(),
      errorMessage,
      migrationsNotice: success ? MIGRATIONS_NOTICE : null,
    })
    setMaintenanceActive(false)

    const job = getRestoreJob()
    try {
      await insertDatabaseRestoredAuditEvent(pool, {
        actorUserId: input.actorUserId,
        resultStatus: success ? 'success' : 'failure',
        metadata: {
          backup_file: input.fileName,
          pre_restore_backup: job?.preRestoreBackup ?? null,
          actor_email: input.actorEmail,
          error_message: errorMessage,
        },
      })
      updateRestoreJob({ auditRecorded: true })
    } catch (err) {
      updateRestoreJob({ auditRecorded: false })
      logger.error({ err }, 'database restore: falha ao registrar admin_audit_events')
    }
    if (success) logger.warn({ file: input.fileName }, 'database restore concluído')
    else logger.error({ file: input.fileName, code, errorMessage }, 'database restore falhou')
  })

  return getRestoreJob()!
}
