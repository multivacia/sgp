import type { DbExecutor } from '../../shared/db/dbExecutor.js'
import type {
  BackupIntegrityStatus,
  BackupKind,
  BackupRunRow,
  BackupStatus,
  BackupTriggerType,
  BackupWalSegmentRow,
} from './backups.types.js'

const RUN_SELECT = `
  id, environment, database_name, backup_kind, trigger_type, status,
  started_at, finished_at, size_bytes, storage_key, logical_file_name,
  checksum_sha256, integrity_status, error_code, error_message,
  created_by_user_id, created_at, updated_at
`

export async function listBackupRuns(
  db: DbExecutor,
  limit = 100,
): Promise<BackupRunRow[]> {
  const { rows } = await db.query<BackupRunRow>(
    `
    SELECT ${RUN_SELECT}
    FROM backup_runs
    ORDER BY COALESCE(started_at, created_at) DESC
    LIMIT $1
    `,
    [limit],
  )
  return rows
}

export async function findBackupRunById(
  db: DbExecutor,
  id: string,
): Promise<BackupRunRow | null> {
  const { rows } = await db.query<BackupRunRow>(
    `SELECT ${RUN_SELECT} FROM backup_runs WHERE id = $1::uuid`,
    [id],
  )
  return rows[0] ?? null
}

export async function countActiveBackupRuns(db: DbExecutor): Promise<number> {
  const { rows } = await db.query<{ c: string }>(
    `
    SELECT COUNT(*)::text AS c
    FROM backup_runs
    WHERE status IN ('REQUESTED', 'RUNNING')
    `,
  )
  return Number.parseInt(rows[0]?.c ?? '0', 10)
}

export async function findLastCompletedBackup(
  db: DbExecutor,
): Promise<BackupRunRow | null> {
  const { rows } = await db.query<BackupRunRow>(
    `
    SELECT ${RUN_SELECT}
    FROM backup_runs
    WHERE status = 'COMPLETED'
    ORDER BY finished_at DESC NULLS LAST
    LIMIT 1
    `,
  )
  return rows[0] ?? null
}

export async function findLastValidBackup(
  db: DbExecutor,
): Promise<BackupRunRow | null> {
  const { rows } = await db.query<BackupRunRow>(
    `
    SELECT ${RUN_SELECT}
    FROM backup_runs
    WHERE status = 'COMPLETED' AND integrity_status = 'VALID'
    ORDER BY finished_at DESC NULLS LAST
    LIMIT 1
    `,
  )
  return rows[0] ?? null
}

export type InsertBackupRunInput = {
  environment: string
  databaseName: string
  backupKind: BackupKind
  triggerType: BackupTriggerType
  status: BackupStatus
  storageKey: string
  logicalFileName: string
  createdByUserId: string | null
}

export async function insertBackupRun(
  db: DbExecutor,
  input: InsertBackupRunInput,
): Promise<BackupRunRow> {
  const { rows } = await db.query<BackupRunRow>(
    `
    INSERT INTO backup_runs (
      environment, database_name, backup_kind, trigger_type, status,
      storage_key, logical_file_name, created_by_user_id, started_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8::uuid, NOW())
    RETURNING ${RUN_SELECT}
    `,
    [
      input.environment,
      input.databaseName,
      input.backupKind,
      input.triggerType,
      input.status,
      input.storageKey,
      input.logicalFileName,
      input.createdByUserId,
    ],
  )
  return rows[0]!
}

export async function markBackupRunning(
  db: DbExecutor,
  id: string,
): Promise<void> {
  await db.query(
    `
    UPDATE backup_runs
    SET status = 'RUNNING', started_at = COALESCE(started_at, NOW()), updated_at = NOW()
    WHERE id = $1::uuid
    `,
    [id],
  )
}

export type CompleteBackupInput = {
  id: string
  sizeBytes: number
  checksumSha256: string
  integrityStatus: BackupIntegrityStatus
  storageKey: string
  logicalFileName: string
}

export async function markBackupCompleted(
  db: DbExecutor,
  input: CompleteBackupInput,
): Promise<void> {
  await db.query(
    `
    UPDATE backup_runs
    SET status = 'COMPLETED',
        finished_at = NOW(),
        size_bytes = $2,
        checksum_sha256 = $3,
        integrity_status = $4,
        storage_key = $5,
        logical_file_name = $6,
        error_code = NULL,
        error_message = NULL,
        updated_at = NOW()
    WHERE id = $1::uuid
    `,
    [
      input.id,
      input.sizeBytes,
      input.checksumSha256,
      input.integrityStatus,
      input.storageKey,
      input.logicalFileName,
    ],
  )
}

export async function markBackupFailed(
  db: DbExecutor,
  id: string,
  errorCode: string,
  errorMessage: string,
  integrityStatus: BackupIntegrityStatus = 'INVALID',
): Promise<void> {
  await db.query(
    `
    UPDATE backup_runs
    SET status = 'FAILED',
        finished_at = NOW(),
        error_code = $2,
        error_message = $3,
        integrity_status = $4,
        updated_at = NOW()
    WHERE id = $1::uuid
    `,
    [id, errorCode, errorMessage, integrityStatus],
  )
}

export async function listExpiredCandidates(
  db: DbExecutor,
  olderThan: Date,
): Promise<BackupRunRow[]> {
  const { rows } = await db.query<BackupRunRow>(
    `
    SELECT ${RUN_SELECT}
    FROM backup_runs
    WHERE backup_kind = 'FULL_LOGICAL'
      AND trigger_type IN ('SCHEDULED', 'MANUAL')
      AND status = 'COMPLETED'
      AND finished_at IS NOT NULL
      AND finished_at < $1::timestamptz
    ORDER BY finished_at ASC
    `,
    [olderThan.toISOString()],
  )
  return rows
}

export async function markBackupExpired(
  db: DbExecutor,
  id: string,
): Promise<void> {
  await db.query(
    `
    UPDATE backup_runs
    SET status = 'EXPIRED', updated_at = NOW()
    WHERE id = $1::uuid
    `,
    [id],
  )
}

export async function markBackupMissingFile(
  db: DbExecutor,
  id: string,
): Promise<void> {
  await db.query(
    `
    UPDATE backup_runs
    SET status = 'MISSING_FILE', updated_at = NOW()
    WHERE id = $1::uuid
    `,
    [id],
  )
}

const WAL_SELECT = `
  id, environment, database_name, segment_name, storage_key, size_bytes,
  checksum_sha256, archived_at, available_for_download, created_at
`

export async function listWalSegments(
  db: DbExecutor,
  limit = 200,
): Promise<BackupWalSegmentRow[]> {
  const { rows } = await db.query<BackupWalSegmentRow>(
    `
    SELECT ${WAL_SELECT}
    FROM backup_wal_segments
    ORDER BY archived_at DESC NULLS LAST, created_at DESC
    LIMIT $1
    `,
    [limit],
  )
  return rows
}

export async function countWalSegments(db: DbExecutor): Promise<number> {
  const { rows } = await db.query<{ c: string }>(
    `SELECT COUNT(*)::text AS c FROM backup_wal_segments`,
  )
  return Number.parseInt(rows[0]?.c ?? '0', 10)
}

export async function findWalSegmentById(
  db: DbExecutor,
  id: string,
): Promise<BackupWalSegmentRow | null> {
  const { rows } = await db.query<BackupWalSegmentRow>(
    `SELECT ${WAL_SELECT} FROM backup_wal_segments WHERE id = $1::uuid`,
    [id],
  )
  return rows[0] ?? null
}

export type UpsertWalSegmentInput = {
  environment: string
  databaseName: string
  segmentName: string
  storageKey: string
  sizeBytes: number
  checksumSha256: string | null
  archivedAt: Date | null
}

export async function upsertWalSegment(
  db: DbExecutor,
  input: UpsertWalSegmentInput,
): Promise<BackupWalSegmentRow> {
  const { rows } = await db.query<BackupWalSegmentRow>(
    `
    INSERT INTO backup_wal_segments (
      environment, database_name, segment_name, storage_key,
      size_bytes, checksum_sha256, archived_at, available_for_download
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, true)
    ON CONFLICT (environment, segment_name) DO UPDATE SET
      storage_key = EXCLUDED.storage_key,
      size_bytes = EXCLUDED.size_bytes,
      checksum_sha256 = EXCLUDED.checksum_sha256,
      archived_at = EXCLUDED.archived_at,
      available_for_download = true,
      database_name = EXCLUDED.database_name
    RETURNING ${WAL_SELECT}
    `,
    [
      input.environment,
      input.databaseName,
      input.segmentName,
      input.storageKey,
      input.sizeBytes,
      input.checksumSha256,
      input.archivedAt,
    ],
  )
  return rows[0]!
}
