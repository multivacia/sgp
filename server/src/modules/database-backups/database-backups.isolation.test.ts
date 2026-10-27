import { afterEach, describe, expect, it } from 'vitest'
import { getDatabaseBackupsConfig } from './database-backups.files.js'

const original = {
  APP_ENV: process.env.APP_ENV,
  SGP_BACKUP_DIR: process.env.SGP_BACKUP_DIR,
  SGP_BACKUP_LOG: process.env.SGP_BACKUP_LOG,
}
function restore(name: keyof typeof original) {
  const value = original[name]
  if (value === undefined) delete process.env[name]
  else process.env[name] = value
}
afterEach(() => {
  restore('APP_ENV')
  restore('SGP_BACKUP_DIR')
  restore('SGP_BACKUP_LOG')
})

describe('isolamento da configuração de backup', () => {
  it('usa diretório exclusivo da homologação quando não há override', () => {
    process.env.APP_ENV = 'homologation'
    delete process.env.SGP_BACKUP_DIR
    delete process.env.SGP_BACKUP_LOG
    const cfg = getDatabaseBackupsConfig()
    expect(cfg.backupDir).toBe('/opt/sgp/backups/hml')
    expect(cfg.logFile).toBe('/opt/sgp/backups/hml/backup-log.jsonl')
  })

  it('não altera o caminho padrão da produção', () => {
    process.env.APP_ENV = 'production'
    delete process.env.SGP_BACKUP_DIR
    delete process.env.SGP_BACKUP_LOG
    expect(getDatabaseBackupsConfig().backupDir).toBe('/opt/sgp/backups/db')
  })
})
