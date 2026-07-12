export const BACKUP_KINDS = ['FULL_LOGICAL', 'PRE_RESTORE_SNAPSHOT'] as const
export type BackupKind = (typeof BACKUP_KINDS)[number]

export const BACKUP_TRIGGER_TYPES = ['SCHEDULED', 'MANUAL', 'PRE_RESTORE'] as const
export type BackupTriggerType = (typeof BACKUP_TRIGGER_TYPES)[number]

export const BACKUP_STATUSES = [
  'REQUESTED',
  'RUNNING',
  'COMPLETED',
  'FAILED',
  'MISSING_FILE',
  'EXPIRED',
] as const
export type BackupStatus = (typeof BACKUP_STATUSES)[number]

export const BACKUP_INTEGRITY_STATUSES = [
  'NOT_CHECKED',
  'VALID',
  'INVALID',
] as const
export type BackupIntegrityStatus = (typeof BACKUP_INTEGRITY_STATUSES)[number]

export const PITR_STATUSES = [
  'PENDING_CONFIGURATION',
  'NOT_VALIDATED',
] as const
export type PitrStatus = (typeof PITR_STATUSES)[number]

export type BackupRunRow = {
  id: string
  environment: string
  database_name: string
  backup_kind: BackupKind
  trigger_type: BackupTriggerType
  status: BackupStatus
  started_at: Date | null
  finished_at: Date | null
  size_bytes: string | number | null
  storage_key: string
  logical_file_name: string
  checksum_sha256: string | null
  integrity_status: BackupIntegrityStatus
  error_code: string | null
  error_message: string | null
  created_by_user_id: string | null
  created_at: Date
  updated_at: Date
}

/** DTO público — nunca inclui storage_key, path absoluto ou segredos. */
export type BackupRunPublic = {
  id: string
  environment: string
  databaseName: string
  backupKind: BackupKind
  triggerType: BackupTriggerType
  status: BackupStatus
  startedAt: string | null
  finishedAt: string | null
  sizeBytes: number | null
  logicalFileName: string
  checksumSha256: string | null
  integrityStatus: BackupIntegrityStatus
  errorCode: string | null
  createdByUserId: string | null
  createdAt: string
}

export type BackupWalSegmentRow = {
  id: string
  environment: string
  database_name: string
  segment_name: string
  storage_key: string
  size_bytes: string | number | null
  checksum_sha256: string | null
  archived_at: Date | null
  available_for_download: boolean
  created_at: Date
}

export type BackupWalSegmentPublic = {
  id: string
  environment: string
  databaseName: string
  segmentName: string
  sizeBytes: number | null
  checksumSha256: string | null
  archivedAt: string | null
  availableForDownload: boolean
  createdAt: string
}

export type BackupSummaryPublic = {
  configured: boolean
  enabled: boolean
  scheduleCron: string | null
  retentionDays: number | null
  environment: string | null
  databaseName: string | null
  lastCompleted: BackupRunPublic | null
  lastValid: BackupRunPublic | null
  activeOrQueuedCount: number
  pitrStatus: PitrStatus
  pitrNote: string
  walConfigured: boolean
  walSegmentCount: number
}

export function toBackupRunPublic(row: BackupRunRow): BackupRunPublic {
  const size =
    row.size_bytes === null || row.size_bytes === undefined
      ? null
      : typeof row.size_bytes === 'number'
        ? row.size_bytes
        : Number(row.size_bytes)
  return {
    id: row.id,
    environment: row.environment,
    databaseName: row.database_name,
    backupKind: row.backup_kind,
    triggerType: row.trigger_type,
    status: row.status,
    startedAt: row.started_at ? row.started_at.toISOString() : null,
    finishedAt: row.finished_at ? row.finished_at.toISOString() : null,
    sizeBytes: Number.isFinite(size) ? size : null,
    logicalFileName: row.logical_file_name,
    checksumSha256: row.checksum_sha256,
    integrityStatus: row.integrity_status,
    errorCode: row.error_code,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at.toISOString(),
  }
}

export function toWalSegmentPublic(row: BackupWalSegmentRow): BackupWalSegmentPublic {
  const size =
    row.size_bytes === null || row.size_bytes === undefined
      ? null
      : typeof row.size_bytes === 'number'
        ? row.size_bytes
        : Number(row.size_bytes)
  return {
    id: row.id,
    environment: row.environment,
    databaseName: row.database_name,
    segmentName: row.segment_name,
    sizeBytes: Number.isFinite(size) ? size : null,
    checksumSha256: row.checksum_sha256,
    archivedAt: row.archived_at ? row.archived_at.toISOString() : null,
    availableForDownload: row.available_for_download,
    createdAt: row.created_at.toISOString(),
  }
}
