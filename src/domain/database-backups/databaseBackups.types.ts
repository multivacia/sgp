export type DatabaseBackupReason = 'scheduled' | 'manual' | 'pre-deploy' | 'pre-restore'

export type DatabaseBackupItem = {
  fileName: string
  createdAt: string
  reason: DatabaseBackupReason
  sizeBytes: number
  copyConfirmedAt: string
}

export type DatabaseBackupLastRun = {
  status: 'success' | 'failure'
  reason: string | null
  startedAt: string | null
  finishedAt: string | null
  errorMessage: string | null
}

export type DatabaseRestorePhase = 'starting' | 'pre-restore-backup' | 'restore' | 'done'

export type DatabaseRestoreJob = {
  status: 'running' | 'success' | 'failure'
  phase: DatabaseRestorePhase
  fileName: string
  startedAt: string
  finishedAt: string | null
  preRestoreBackup: string | null
  errorMessage: string | null
  migrationsNotice: string | null
  auditRecorded: boolean | null
}

export type DatabaseBackupsStatus = {
  databaseName: string
  lastRun: DatabaseBackupLastRun | null
  restore: DatabaseRestoreJob | null
}
