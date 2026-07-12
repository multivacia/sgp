import {
  existsSync,
  mkdirSync,
  readdirSync,
  realpathSync,
  renameSync,
  unlinkSync,
} from 'node:fs'
import { pipeline } from 'node:stream/promises'
import type { Response } from 'express'
import type { Logger } from 'pino'
import type pg from 'pg'
import type { Env } from '../../config/env.js'
import { resolveAppVersionMetadata } from '../../config/env.js'
import { insertAdminAuditEvent } from '../admin-audit/admin-audit.repository.js'
import { AppError } from '../../shared/errors/AppError.js'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'
import {
  absoluteFromStorageKey,
  assertFileInsideRoot,
  buildFullLogicalFileName,
  fileSizeBytes,
  isValidWalSegmentName,
  joinUnderRoot,
  resolvePathInsideRoot,
  sanitizeLogicalFileName,
  sha256File,
  toRelativeStorageKey,
} from './backups.pathSafe.js'
import { pgTools, resolvePgDumpTarget } from './backups.pgDump.js'
import {
  countActiveBackupRuns,
  countWalSegments,
  findBackupRunById,
  findLastCompletedBackup,
  findLastValidBackup,
  findWalSegmentById,
  insertBackupRun,
  listBackupRuns,
  listExpiredCandidates,
  listWalSegments,
  markBackupCompleted,
  markBackupExpired,
  markBackupFailed,
  markBackupMissingFile,
  markBackupRunning,
  upsertWalSegment,
} from './backups.repository.js'
import type {
  BackupRunPublic,
  BackupSummaryPublic,
  BackupTriggerType,
  BackupWalSegmentPublic,
} from './backups.types.js'
import { toBackupRunPublic, toWalSegmentPublic } from './backups.types.js'

function sanitizeErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err)
  return raw
    .replace(/PGPASSWORD=\S+/gi, 'PGPASSWORD=***')
    .replace(/password[=:]\s*\S+/gi, 'password=***')
    .replace(/\/\/([^:@/]+):([^@/]+)@/g, '//$1:***@')
    .slice(0, 500)
}

function isBackupConfigured(env: Env): boolean {
  return env.backupEnabled && env.backupDirectory.trim().length > 0
}

function environmentLabel(env: Env): string {
  const meta = resolveAppVersionMetadata(process.env, env.nodeEnv)
  return meta.environment === 'unknown' ? env.nodeEnv : meta.environment
}

function notConfiguredSummary(env: Env): BackupSummaryPublic {
  return {
    configured: false,
    enabled: env.backupEnabled,
    scheduleCron: env.backupScheduleCron || null,
    retentionDays: env.backupRetentionDays,
    environment: environmentLabel(env),
    databaseName: null,
    lastCompleted: null,
    lastValid: null,
    activeOrQueuedCount: 0,
    pitrStatus: 'PENDING_CONFIGURATION',
    pitrNote:
      'PITR não está ativo nesta versão. pg_dump lógico não serve como base para replay de WAL.',
    walConfigured: false,
    walSegmentCount: 0,
  }
}

export async function serviceGetBackupSummary(
  pool: pg.Pool,
  env: Env,
): Promise<BackupSummaryPublic> {
  if (!isBackupConfigured(env)) {
    return notConfiguredSummary(env)
  }

  const target = resolvePgDumpTarget(env)
  const [lastCompleted, lastValid, activeOrQueuedCount, walSegmentCount] =
    await Promise.all([
      findLastCompletedBackup(pool),
      findLastValidBackup(pool),
      countActiveBackupRuns(pool),
      env.backupWalDirectory.trim()
        ? countWalSegments(pool)
        : Promise.resolve(0),
    ])

  const walConfigured = env.backupWalDirectory.trim().length > 0

  return {
    configured: true,
    enabled: true,
    scheduleCron: env.backupScheduleCron || null,
    retentionDays: env.backupRetentionDays,
    environment: environmentLabel(env),
    databaseName: target.database,
    lastCompleted: lastCompleted ? toBackupRunPublic(lastCompleted) : null,
    lastValid: lastValid ? toBackupRunPublic(lastValid) : null,
    activeOrQueuedCount,
    pitrStatus: walConfigured ? 'NOT_VALIDATED' : 'PENDING_CONFIGURATION',
    pitrNote:
      'PITR nunca é afirmado como ativo nesta versão. Catálogo WAL é inventário; pg_dump não serve para replay.',
    walConfigured,
    walSegmentCount,
  }
}

export async function serviceListBackups(
  pool: pg.Pool,
  env: Env,
): Promise<{ configured: boolean; items: BackupRunPublic[] }> {
  if (!isBackupConfigured(env)) {
    return { configured: false, items: [] }
  }
  const rows = await listBackupRuns(pool)
  return { configured: true, items: rows.map(toBackupRunPublic) }
}

export type TriggerFullBackupOptions = {
  triggerType: BackupTriggerType
  actorUserId: string | null
  logger?: Logger
  /** Quando true, aguarda conclusão (CLI). */
  wait?: boolean
}

let inMemoryLock = false

export async function serviceTriggerFullBackup(
  pool: pg.Pool,
  env: Env,
  options: TriggerFullBackupOptions,
): Promise<BackupRunPublic> {
  if (!isBackupConfigured(env)) {
    throw new AppError(
      'Backup não configurado.',
      503,
      ErrorCodes.SERVICE_UNAVAILABLE,
    )
  }

  if (options.triggerType === 'PRE_RESTORE') {
    throw new AppError(
      'Trigger PRE_RESTORE não disponível nesta versão.',
      400,
      ErrorCodes.VALIDATION_ERROR,
    )
  }

  if (inMemoryLock) {
    throw new AppError(
      'Já existe um backup em andamento.',
      409,
      ErrorCodes.CONFLICT,
    )
  }

  // Adquire o lock antes do INSERT para evitar corrida entre dois POST simultâneos.
  inMemoryLock = true
  let backgroundStarted = false

  try {
    const active = await countActiveBackupRuns(pool)
    if (active > 0) {
      throw new AppError(
        'Já existe um backup em andamento.',
        409,
        ErrorCodes.CONFLICT,
      )
    }

    const target = resolvePgDumpTarget(env)
    const envLabel = environmentLabel(env)
    const logicalFileName = buildFullLogicalFileName(
      env.backupFilePrefix,
      envLabel,
    )
    const storageKey = toRelativeStorageKey(logicalFileName)

    const run = await insertBackupRun(pool, {
      environment: envLabel,
      databaseName: target.database,
      backupKind: 'FULL_LOGICAL',
      triggerType: options.triggerType,
      status: 'REQUESTED',
      storageKey,
      logicalFileName,
      createdByUserId: options.actorUserId,
    })

    if (options.actorUserId) {
      await insertAdminAuditEvent(pool, {
        eventType: 'backup_run_requested',
        actorUserId: options.actorUserId,
        targetUserId: null,
        targetCollaboratorId: null,
        metadata: {
          backup_run_id: run.id,
          trigger_type: options.triggerType,
          status: 'REQUESTED',
          logical_file_name: logicalFileName,
          environment: envLabel,
          database_name: target.database,
        },
      })
    }

    const work = executeFullBackup(pool, env, run.id, options.logger)
    backgroundStarted = true

    if (options.wait) {
      await work
      const refreshed = await findBackupRunById(pool, run.id)
      if (!refreshed) {
        throw new AppError(
          'Backup não encontrado após execução.',
          500,
          ErrorCodes.INTERNAL,
        )
      }
      if (refreshed.status !== 'COMPLETED') {
        throw new AppError(
          refreshed.error_message || 'Backup falhou.',
          500,
          ErrorCodes.INTERNAL,
        )
      }
      return toBackupRunPublic(refreshed)
    }

    void work.catch((err) => {
      options.logger?.error({ err }, 'backup_run_background_failed')
    })

    return toBackupRunPublic(run)
  } catch (err) {
    if (!backgroundStarted) {
      inMemoryLock = false
    }
    throw err
  }
}

async function executeFullBackup(
  pool: pg.Pool,
  env: Env,
  runId: string,
  logger?: Logger,
): Promise<void> {
  // Lock já adquirido em serviceTriggerFullBackup; liberado no finally.
  let tempPath: string | null = null
  let finalPath: string | null = null

  try {
    await markBackupRunning(pool, runId)
    const run = await findBackupRunById(pool, runId)
    if (!run) return

    mkdirSync(env.backupDirectory, { recursive: true })
    const logicalFileName = run.logical_file_name
    const storageKey = toRelativeStorageKey(logicalFileName)
    tempPath = joinUnderRoot(env.backupDirectory, `${logicalFileName}.tmp`)
    finalPath = joinUnderRoot(env.backupDirectory, logicalFileName)

    // Remove temp residual
    try {
      if (existsSync(tempPath)) unlinkSync(tempPath)
    } catch {
      /* ignore */
    }

    const target = resolvePgDumpTarget(env)
    const timeoutMs = env.backupCommandTimeoutSeconds * 1000

    await pgTools.runPgDumpCustom({
      pgDumpPath: env.backupPgDumpPath,
      target,
      outputPath: tempPath,
      timeoutMs,
    })

    if (!existsSync(tempPath)) {
      throw new Error('Arquivo temporário de backup não foi criado.')
    }

    const size = fileSizeBytes(tempPath)
    if (size <= 0) {
      throw new Error('Arquivo de backup vazio rejeitado.')
    }

    const checksum = await sha256File(tempPath)

    try {
      await pgTools.runPgRestoreList({
        pgRestorePath: env.backupPgRestorePath,
        dumpPath: tempPath,
        timeoutMs,
      })
    } catch (listErr) {
      try {
        unlinkSync(tempPath)
      } catch {
        /* ignore */
      }
      tempPath = null
      await markBackupFailed(
        pool,
        runId,
        'INTEGRITY_INVALID',
        sanitizeErrorMessage(listErr),
        'INVALID',
      )
      if (run.created_by_user_id) {
        await insertAdminAuditEvent(pool, {
          eventType: 'backup_run_failed',
          actorUserId: run.created_by_user_id,
          targetUserId: null,
          targetCollaboratorId: null,
          metadata: {
            backup_run_id: runId,
            trigger_type: run.trigger_type,
            status: 'FAILED',
            integrity_status: 'INVALID',
            logical_file_name: logicalFileName,
            environment: run.environment,
            database_name: run.database_name,
            result: 'integrity_list_failed',
          },
        })
      }
      return
    }

    renameSync(tempPath, finalPath)
    tempPath = null
    assertFileInsideRoot(env.backupDirectory, finalPath)

    await markBackupCompleted(pool, {
      id: runId,
      sizeBytes: size,
      checksumSha256: checksum,
      integrityStatus: 'VALID',
      storageKey,
      logicalFileName,
    })

    if (run.created_by_user_id) {
      await insertAdminAuditEvent(pool, {
        eventType: 'backup_run_completed',
        actorUserId: run.created_by_user_id,
        targetUserId: null,
        targetCollaboratorId: null,
        metadata: {
          backup_run_id: runId,
          trigger_type: run.trigger_type,
          status: 'COMPLETED',
          size_bytes: size,
          integrity_status: 'VALID',
          logical_file_name: logicalFileName,
          environment: run.environment,
          database_name: run.database_name,
          result: 'ok',
        },
      })
    } else {
      // CLI / scheduled — auditoria sem actor: log apenas
      logger?.info(
        { backup_run_id: runId, status: 'COMPLETED', size_bytes: size },
        'backup_run_completed',
      )
    }

    await applyRetention(pool, env, runId, logger)
  } catch (err) {
    logger?.error({ err, runId }, 'backup_run_failed')
    if (tempPath) {
      try {
        if (existsSync(tempPath)) unlinkSync(tempPath)
      } catch {
        /* ignore */
      }
    }
    await markBackupFailed(
      pool,
      runId,
      'BACKUP_FAILED',
      sanitizeErrorMessage(err),
      'INVALID',
    )
    const run = await findBackupRunById(pool, runId)
    if (run?.created_by_user_id) {
      await insertAdminAuditEvent(pool, {
        eventType: 'backup_run_failed',
        actorUserId: run.created_by_user_id,
        targetUserId: null,
        targetCollaboratorId: null,
        metadata: {
          backup_run_id: runId,
          trigger_type: run.trigger_type,
          status: 'FAILED',
          integrity_status: 'INVALID',
          logical_file_name: run.logical_file_name,
          environment: run.environment,
          database_name: run.database_name,
          result: 'failed',
        },
      })
    }
  } finally {
    inMemoryLock = false
  }
}

/** Retenção: remove FULL_LOGICAL SCHEDULED/MANUAL antigos; nunca PRE_RESTORE_SNAPSHOT nem o recém-criado. */
export async function applyRetention(
  pool: pg.Pool,
  env: Env,
  keepRunId: string,
  logger?: Logger,
): Promise<void> {
  const cutoff = new Date(
    Date.now() - env.backupRetentionDays * 24 * 60 * 60 * 1000,
  )
  const candidates = await listExpiredCandidates(pool, cutoff)
  for (const row of candidates) {
    if (row.id === keepRunId) continue
    if (row.backup_kind === 'PRE_RESTORE_SNAPSHOT') continue
    try {
      const abs = absoluteFromStorageKey(env.backupDirectory, row.storage_key)
      if (existsSync(abs)) {
        assertFileInsideRoot(env.backupDirectory, abs)
        unlinkSync(abs)
      }
      await markBackupExpired(pool, row.id)
      logger?.info(
        { backup_run_id: row.id, logical_file_name: row.logical_file_name },
        'backup_retention_expired',
      )
    } catch (err) {
      logger?.warn({ err, backup_run_id: row.id }, 'backup_retention_skip')
    }
  }
}

export async function serviceDownloadBackup(
  pool: pg.Pool,
  env: Env,
  backupId: string,
  actorUserId: string,
  res: Response,
): Promise<void> {
  if (!isBackupConfigured(env)) {
    throw new AppError(
      'Backup não configurado.',
      503,
      ErrorCodes.SERVICE_UNAVAILABLE,
    )
  }

  const run = await findBackupRunById(pool, backupId)
  if (!run) {
    throw new AppError('Backup não encontrado.', 404, ErrorCodes.NOT_FOUND)
  }

  if (run.status !== 'COMPLETED' || run.integrity_status !== 'VALID') {
    throw new AppError(
      'Backup indisponível para download (status ou integridade inválidos).',
      409,
      ErrorCodes.CONFLICT,
    )
  }

  let abs: string
  try {
    abs = absoluteFromStorageKey(env.backupDirectory, run.storage_key)
    if (!existsSync(abs)) {
      await markBackupMissingFile(pool, run.id)
      throw new AppError(
        'Arquivo de backup não encontrado no armazenamento.',
        404,
        ErrorCodes.NOT_FOUND,
      )
    }
    assertFileInsideRoot(env.backupDirectory, abs)
  } catch (e) {
    if (e instanceof AppError) throw e
    throw new AppError(
      'Arquivo de backup inválido.',
      400,
      ErrorCodes.VALIDATION_ERROR,
    )
  }

  const size = fileSizeBytes(abs)
  if (
    env.backupMaxDownloadSizeBytes != null &&
    size > env.backupMaxDownloadSizeBytes
  ) {
    throw new AppError(
      'Arquivo excede o limite de download configurado.',
      413,
      ErrorCodes.VALIDATION_ERROR,
    )
  }

  const safeName = sanitizeLogicalFileName(run.logical_file_name)

  await insertAdminAuditEvent(pool, {
    eventType: 'backup_downloaded',
    actorUserId,
    targetUserId: null,
    targetCollaboratorId: null,
    metadata: {
      backup_run_id: run.id,
      status: run.status,
      size_bytes: size,
      integrity_status: run.integrity_status,
      logical_file_name: safeName,
      environment: run.environment,
      database_name: run.database_name,
      result: 'ok',
    },
  })

  res.setHeader('Content-Type', 'application/octet-stream')
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(safeName)}`,
  )
  res.setHeader('Content-Length', String(size))

  const { createReadStream } = await import('node:fs')
  await pipeline(createReadStream(abs), res)
}

export async function serviceListWal(
  pool: pg.Pool,
  env: Env,
): Promise<{
  configured: boolean
  pitrStatus: 'PENDING_CONFIGURATION' | 'NOT_VALIDATED'
  items: BackupWalSegmentPublic[]
}> {
  if (!env.backupEnabled || !env.backupWalDirectory.trim()) {
    return {
      configured: false,
      pitrStatus: 'PENDING_CONFIGURATION',
      items: [],
    }
  }
  const rows = await listWalSegments(pool)
  return {
    configured: true,
    pitrStatus: 'NOT_VALIDATED',
    items: rows.map(toWalSegmentPublic),
  }
}

export async function serviceSyncWal(
  pool: pg.Pool,
  env: Env,
  actorUserId: string,
): Promise<{ segmentsUpserted: number; items: BackupWalSegmentPublic[] }> {
  if (!env.backupEnabled || !env.backupWalDirectory.trim()) {
    throw new AppError(
      'Diretório WAL não configurado.',
      503,
      ErrorCodes.SERVICE_UNAVAILABLE,
    )
  }

  mkdirSync(env.backupWalDirectory, { recursive: true })
  const walRoot = realpathSync(env.backupWalDirectory)

  const entries = readdirSync(walRoot)
  const target = resolvePgDumpTarget(env)
  const envLabel = environmentLabel(env)
  let upserted = 0
  const items: BackupWalSegmentPublic[] = []

  for (const name of entries) {
    if (!isValidWalSegmentName(name)) continue
    let abs: string
    try {
      abs = resolvePathInsideRoot(walRoot, name)
      assertFileInsideRoot(walRoot, abs)
    } catch {
      continue
    }
    const size = fileSizeBytes(abs)
    const checksum = await sha256File(abs)
    const row = await upsertWalSegment(pool, {
      environment: envLabel,
      databaseName: target.database,
      segmentName: name,
      storageKey: toRelativeStorageKey(name),
      sizeBytes: size,
      checksumSha256: checksum,
      archivedAt: new Date(),
    })
    upserted += 1
    items.push(toWalSegmentPublic(row))
  }

  await insertAdminAuditEvent(pool, {
    eventType: 'backup_wal_synced',
    actorUserId,
    targetUserId: null,
    targetCollaboratorId: null,
    metadata: {
      segments_upserted: upserted,
      environment: envLabel,
      database_name: target.database,
      result: 'ok',
    },
  })

  return { segmentsUpserted: upserted, items }
}

export async function serviceDownloadWal(
  pool: pg.Pool,
  env: Env,
  walId: string,
  actorUserId: string,
  res: Response,
): Promise<void> {
  if (!env.backupEnabled || !env.backupWalDirectory.trim()) {
    throw new AppError(
      'Diretório WAL não configurado.',
      503,
      ErrorCodes.SERVICE_UNAVAILABLE,
    )
  }

  const seg = await findWalSegmentById(pool, walId)
  if (!seg || !seg.available_for_download) {
    throw new AppError('Segmento WAL não encontrado.', 404, ErrorCodes.NOT_FOUND)
  }

  if (!isValidWalSegmentName(seg.segment_name)) {
    throw new AppError(
      'Nome de segmento WAL inválido.',
      400,
      ErrorCodes.VALIDATION_ERROR,
    )
  }

  const abs = absoluteFromStorageKey(env.backupWalDirectory, seg.storage_key)
  if (!existsSync(abs)) {
    throw new AppError(
      'Arquivo WAL não encontrado no armazenamento.',
      404,
      ErrorCodes.NOT_FOUND,
    )
  }
  assertFileInsideRoot(env.backupWalDirectory, abs)

  const size = fileSizeBytes(abs)
  if (
    env.backupMaxDownloadSizeBytes != null &&
    size > env.backupMaxDownloadSizeBytes
  ) {
    throw new AppError(
      'Arquivo excede o limite de download configurado.',
      413,
      ErrorCodes.VALIDATION_ERROR,
    )
  }

  const safeName = sanitizeLogicalFileName(seg.segment_name)

  await insertAdminAuditEvent(pool, {
    eventType: 'backup_wal_downloaded',
    actorUserId,
    targetUserId: null,
    targetCollaboratorId: null,
    metadata: {
      wal_segment_id: seg.id,
      size_bytes: size,
      environment: seg.environment,
      database_name: seg.database_name,
      result: 'ok',
    },
  })

  res.setHeader('Content-Type', 'application/octet-stream')
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(safeName)}`,
  )
  res.setHeader('Content-Length', String(size))

  const { createReadStream } = await import('node:fs')
  await pipeline(createReadStream(abs), res)
}

/** Reset de lock em memória — apenas testes. */
export function resetBackupLockForTests(): void {
  inMemoryLock = false
}
