export type BackupKind = 'FULL_LOGICAL' | 'PRE_RESTORE_SNAPSHOT'
export type BackupTriggerType = 'SCHEDULED' | 'MANUAL' | 'PRE_RESTORE'
export type BackupStatus =
  | 'REQUESTED'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'MISSING_FILE'
  | 'EXPIRED'
export type BackupIntegrityStatus = 'NOT_CHECKED' | 'VALID' | 'INVALID'
export type PitrStatus = 'PENDING_CONFIGURATION' | 'NOT_VALIDATED'

export type BackupRun = {
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

export type BackupSummary = {
  configured: boolean
  enabled: boolean
  scheduleCron: string | null
  retentionDays: number | null
  environment: string | null
  databaseName: string | null
  lastCompleted: BackupRun | null
  lastValid: BackupRun | null
  activeOrQueuedCount: number
  pitrStatus: PitrStatus
  pitrNote: string
  walConfigured: boolean
  walSegmentCount: number
}

export type BackupWalSegment = {
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

export type BackupListResponse = {
  configured: boolean
  items: BackupRun[]
}

export type BackupWalListResponse = {
  configured: boolean
  pitrStatus: PitrStatus
  items: BackupWalSegment[]
}

export const BACKUP_STATUS_LABELS: Record<BackupStatus, string> = {
  REQUESTED: 'Solicitado',
  RUNNING: 'Em execução',
  COMPLETED: 'Concluído',
  FAILED: 'Falhou',
  MISSING_FILE: 'Arquivo ausente',
  EXPIRED: 'Expirado',
}

export const BACKUP_KIND_LABELS: Record<BackupKind, string> = {
  FULL_LOGICAL: 'Lógico completo',
  PRE_RESTORE_SNAPSHOT: 'Snapshot pré-restauração',
}

export const BACKUP_TRIGGER_LABELS: Record<BackupTriggerType, string> = {
  SCHEDULED: 'Agendado',
  MANUAL: 'Manual',
  PRE_RESTORE: 'Pré-restauração',
}

export const BACKUP_INTEGRITY_LABELS: Record<BackupIntegrityStatus, string> = {
  NOT_CHECKED: 'Não verificado',
  VALID: 'Íntegro',
  INVALID: 'Inválido',
}

export function formatBackupSize(bytes: number | null): string {
  if (bytes == null || !Number.isFinite(bytes)) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}
