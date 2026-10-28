import type {
  DatabaseBackupReason,
  DatabaseRestorePhase,
} from '../../../domain/database-backups/databaseBackups.types'

export const BACKUP_REASON_LABEL: Record<DatabaseBackupReason, string> = {
  scheduled: 'Agendado',
  manual: 'Manual',
  'pre-deploy': 'Antes do deploy',
  'pre-restore': 'Antes de restauração',
}

export function backupReasonLabel(reason: string | null): string {
  if (!reason) return '—'
  return BACKUP_REASON_LABEL[reason as DatabaseBackupReason] ?? reason
}

export const RESTORE_PHASE_LABEL: Record<DatabaseRestorePhase, string> = {
  starting: 'Iniciando a restauração…',
  'pre-restore-backup': 'Fazendo backup de segurança da base atual…',
  restore: 'Restaurando a base a partir do backup escolhido…',
  done: 'Finalizando…',
}

export function formatBackupSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`
}

export function formatBackupDateTime(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  })
}

/** O botão de restaurar só libera quando o nome digitado é exatamente o da base. */
export function restoreConfirmationMatches(typed: string, databaseName: string): boolean {
  return databaseName.length > 0 && typed.trim() === databaseName
}
