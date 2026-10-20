/**
 * Estado em memória do processo da API: modo manutenção e acompanhamento do restore.
 * A API roda em um único processo (PM2 `sgp-api`); o estado não precisa ser compartilhado.
 */

export type RestorePhase = 'starting' | 'pre-restore-backup' | 'restore' | 'done'

export type RestoreJob = {
  status: 'running' | 'success' | 'failure'
  phase: RestorePhase
  fileName: string
  startedByUserId: string
  startedAt: string
  finishedAt: string | null
  preRestoreBackup: string | null
  errorMessage: string | null
  /** Preenchido ao concluir com sucesso: reaplicar migrations manualmente, se necessário. */
  migrationsNotice: string | null
  auditRecorded: boolean | null
}

export const MIGRATIONS_NOTICE =
  'Restauração concluída. Nenhuma migration foi executada. Se o backup for anterior a migrations já aplicadas, ' +
  'reaplique-as manualmente com "npm run migrate:file", na ordem, conforme docs/backup-restore-runbook.md.'

let maintenanceActive = false
let restoreJob: RestoreJob | null = null

export function isMaintenanceActive(): boolean {
  return maintenanceActive
}

export function setMaintenanceActive(active: boolean): void {
  maintenanceActive = active
}

export function getRestoreJob(): RestoreJob | null {
  return restoreJob ? { ...restoreJob } : null
}

export function setRestoreJob(job: RestoreJob | null): void {
  restoreJob = job
}

export function updateRestoreJob(patch: Partial<RestoreJob>): void {
  if (restoreJob) restoreJob = { ...restoreJob, ...patch }
}

export function resetDatabaseBackupsStateForTests(): void {
  maintenanceActive = false
  restoreJob = null
}
