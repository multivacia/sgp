/**
 * CLI: executa backup FULL_LOGICAL com trigger SCHEDULED.
 * Exit 0 em sucesso; exit != 0 em falha.
 *
 * Uso: npm --prefix server run backup:full
 * Cron sugerido: 0 2 * * *
 */
import { loadEnv } from '../config/env.js'
import { closePool, getPool } from '../plugins/db.js'
import { serviceTriggerFullBackup } from '../modules/backups/backups.service.js'
import pino from 'pino'

async function main(): Promise<void> {
  const env = loadEnv()
  const logger = pino({ level: env.logLevel })
  const pool = getPool(env)

  try {
    if (!env.backupEnabled || !env.backupDirectory.trim()) {
      logger.error('Backup não configurado (BACKUP_ENABLED / BACKUP_DIRECTORY).')
      process.exitCode = 2
      return
    }

    const result = await serviceTriggerFullBackup(pool, env, {
      triggerType: 'SCHEDULED',
      actorUserId: null,
      logger,
      wait: true,
    })

    logger.info(
      {
        backup_run_id: result.id,
        status: result.status,
        size_bytes: result.sizeBytes,
        integrity_status: result.integrityStatus,
      },
      'backup_full_ok',
    )
    process.exitCode = 0
  } catch (err) {
    logger.error({ err }, 'backup_full_failed')
    process.exitCode = 1
  } finally {
    await closePool()
  }
}

void main()
