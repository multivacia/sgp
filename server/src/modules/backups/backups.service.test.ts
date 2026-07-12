import { createHash } from 'node:crypto'
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Env } from '../../config/env.js'
import { AppError } from '../../shared/errors/AppError.js'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'
import { pgTools } from './backups.pgDump.js'
import {
  applyRetention,
  resetBackupLockForTests,
  serviceGetBackupSummary,
  serviceListBackups,
  serviceTriggerFullBackup,
} from './backups.service.js'

vi.mock('../admin-audit/admin-audit.repository.js', () => ({
  insertAdminAuditEvent: vi.fn(async () => undefined),
}))

const runs = new Map<string, Record<string, unknown>>()
let walRows: Record<string, unknown>[] = []

vi.mock('./backups.repository.js', () => ({
  listBackupRuns: vi.fn(async () => [...runs.values()]),
  findBackupRunById: vi.fn(async (_db: unknown, id: string) => runs.get(id) ?? null),
  countActiveBackupRuns: vi.fn(async () =>
    [...runs.values()].filter((r) =>
      r.status === 'REQUESTED' || r.status === 'RUNNING',
    ).length,
  ),
  findLastCompletedBackup: vi.fn(async () => null),
  findLastValidBackup: vi.fn(async () => null),
  countWalSegments: vi.fn(async () => walRows.length),
  insertBackupRun: vi.fn(async (_db: unknown, input: Record<string, unknown>) => {
    const id = '11111111-1111-1111-1111-111111111111'
    const row = {
      id,
      environment: input.environment,
      database_name: input.databaseName,
      backup_kind: input.backupKind,
      trigger_type: input.triggerType,
      status: input.status,
      started_at: new Date(),
      finished_at: null,
      size_bytes: null,
      storage_key: input.storageKey,
      logical_file_name: input.logicalFileName,
      checksum_sha256: null,
      integrity_status: 'NOT_CHECKED',
      error_code: null,
      error_message: null,
      created_by_user_id: input.createdByUserId,
      created_at: new Date(),
      updated_at: new Date(),
    }
    runs.set(id, row)
    return row
  }),
  markBackupRunning: vi.fn(async (_db: unknown, id: string) => {
    const r = runs.get(id)
    if (r) r.status = 'RUNNING'
  }),
  markBackupCompleted: vi.fn(async (_db: unknown, input: Record<string, unknown>) => {
    const r = runs.get(String(input.id))
    if (!r) return
    r.status = 'COMPLETED'
    r.size_bytes = input.sizeBytes
    r.checksum_sha256 = input.checksumSha256
    r.integrity_status = input.integrityStatus
    r.storage_key = input.storageKey
    r.logical_file_name = input.logicalFileName
    r.finished_at = new Date()
  }),
  markBackupFailed: vi.fn(async (_db: unknown, id: string, code: string, msg: string, integrity: string) => {
    const r = runs.get(id)
    if (!r) return
    r.status = 'FAILED'
    r.error_code = code
    r.error_message = msg
    r.integrity_status = integrity
    r.finished_at = new Date()
  }),
  listExpiredCandidates: vi.fn(async () =>
    [...runs.values()].filter(
      (r) =>
        r.backup_kind === 'FULL_LOGICAL' &&
        r.status === 'COMPLETED' &&
        r.id !== 'keep',
    ),
  ),
  markBackupExpired: vi.fn(async (_db: unknown, id: string) => {
    const r = runs.get(id)
    if (r) r.status = 'EXPIRED'
  }),
  markBackupMissingFile: vi.fn(async () => undefined),
  listWalSegments: vi.fn(async () => walRows),
  findWalSegmentById: vi.fn(async () => null),
  upsertWalSegment: vi.fn(async (_db: unknown, input: Record<string, unknown>) => {
    const row = {
      id: '22222222-2222-2222-2222-222222222222',
      environment: input.environment,
      database_name: input.databaseName,
      segment_name: input.segmentName,
      storage_key: input.storageKey,
      size_bytes: input.sizeBytes,
      checksum_sha256: input.checksumSha256,
      archived_at: input.archivedAt,
      available_for_download: true,
      created_at: new Date(),
    }
    walRows.push(row)
    return row
  }),
}))

function baseEnv(dir: string): Env {
  return {
    nodeEnv: 'test',
    port: 4000,
    pgPoolConfig: {
      host: 'localhost',
      port: 5432,
      database: 'sgp_test',
      user: 'postgres',
      password: 'secret',
    },
    corsOrigin: 'http://localhost:5173',
    logLevel: 'error',
    jwtSecret: 'test-secret-16chars',
    jwtExpiresDays: 7,
    authCookieName: 'sgp_auth',
    loginMaxFailedAttempts: 5,
    loginLockoutMinutes: 15,
    sessionAbsoluteTimeoutHours: 8,
    productionAuthCookieName: 'sgp_production_auth',
    productionJwtSecret: 'test-secret-16chars',
    productionSessionIdleTimeoutMinutes: 30,
    productionSessionAbsoluteTimeoutHours: 12,
    productionPinMaxFailedAttempts: 5,
    productionPinLockoutMinutes: 15,
    documentDraftAdapter: 'local',
    argosPolicyMode: 'balanced',
    argosIngestTimeoutMs: 120000,
    argosConveyorHealthAnalyzePath: '/x',
    argosHealthTimeoutMs: 120000,
    documentDraftMaxFileBytes: 15_000_000,
    argosRemoteRequired: false,
    argosUseMinimalStub: false,
    supportEmailSubjectPrefix: '[SGP]',
    smtpPort: 587,
    smtpSecure: false,
    smtpRequireTls: true,
    backupEnabled: true,
    backupDirectory: dir,
    backupRetentionDays: 14,
    backupScheduleCron: '0 2 * * *',
    backupFilePrefix: 'sgp',
    backupWalDirectory: '',
    backupCommandTimeoutSeconds: 60,
    backupPgDumpPath: 'pg_dump',
    backupPgRestorePath: 'pg_restore',
  } as Env
}

describe('backups.service', () => {
  let dir: string

  beforeEach(() => {
    runs.clear()
    walRows = []
    resetBackupLockForTests()
    dir = mkdtempSync(join(tmpdir(), 'sgp-backup-svc-'))
    vi.spyOn(pgTools, 'runPgDumpCustom').mockImplementation(async (input) => {
      writeFileSync(input.outputPath, 'FAKE_DUMP_CONTENT_NOT_EMPTY')
    })
    vi.spyOn(pgTools, 'runPgRestoreList').mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    resetBackupLockForTests()
  })

  it('summary retorna configured:false quando backup desligado', async () => {
    const env = baseEnv('')
    env.backupEnabled = false
    const summary = await serviceGetBackupSummary({} as never, env)
    expect(summary.configured).toBe(false)
    expect(summary.pitrStatus).toBe('PENDING_CONFIGURATION')
  })

  it('lista vazia sem configurar', async () => {
    const env = baseEnv('')
    env.backupEnabled = false
    const list = await serviceListBackups({} as never, env)
    expect(list.configured).toBe(false)
    expect(list.items).toEqual([])
  })

  it('concorrência retorna 409', async () => {
    const env = baseEnv(dir)
    runs.set('busy', {
      id: 'busy',
      status: 'RUNNING',
      backup_kind: 'FULL_LOGICAL',
    })
    await expect(
      serviceTriggerFullBackup({} as never, env, {
        triggerType: 'MANUAL',
        actorUserId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        wait: false,
      }),
    ).rejects.toMatchObject({ statusCode: 409, code: ErrorCodes.CONFLICT })
  })

  it('executa dump, gera checksum e marca COMPLETED+VALID', async () => {
    const env = baseEnv(dir)
    const result = await serviceTriggerFullBackup({} as never, env, {
      triggerType: 'MANUAL',
      actorUserId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      wait: true,
    })
    expect(result.status).toBe('COMPLETED')
    expect(result.integrityStatus).toBe('VALID')
    expect(result.checksumSha256).toMatch(/^[a-f0-9]{64}$/)
    expect(result.sizeBytes).toBeGreaterThan(0)
    const json = JSON.stringify(result)
    expect(json).not.toContain('secret')
    expect(json).not.toContain(dir)
    expect(json.toLowerCase()).not.toContain('storage_key')
  })

  it('pg_dump falha → FAILED', async () => {
    vi.spyOn(pgTools, 'runPgDumpCustom').mockRejectedValue(new Error('pg_dump boom'))
    const env = baseEnv(dir)
    await expect(
      serviceTriggerFullBackup({} as never, env, {
        triggerType: 'SCHEDULED',
        actorUserId: null,
        wait: true,
      }),
    ).rejects.toBeInstanceOf(AppError)
    const row = [...runs.values()][0]
    expect(row?.status).toBe('FAILED')
  })

  it('arquivo vazio é rejeitado', async () => {
    vi.spyOn(pgTools, 'runPgDumpCustom').mockImplementation(async (input) => {
      writeFileSync(input.outputPath, '')
    })
    const env = baseEnv(dir)
    await expect(
      serviceTriggerFullBackup({} as never, env, {
        triggerType: 'MANUAL',
        actorUserId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        wait: true,
      }),
    ).rejects.toBeInstanceOf(AppError)
  })

  it('pg_restore --list falha → FAILED + INVALID e remove arquivo', async () => {
    vi.spyOn(pgTools, 'runPgRestoreList').mockRejectedValue(new Error('list fail'))
    const env = baseEnv(dir)
    // wait:true throws because status !== COMPLETED after execute
    await expect(
      serviceTriggerFullBackup({} as never, env, {
        triggerType: 'MANUAL',
        actorUserId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        wait: true,
      }),
    ).rejects.toBeInstanceOf(AppError)
    const row = [...runs.values()][0]
    expect(row?.status).toBe('FAILED')
    expect(row?.integrity_status).toBe('INVALID')
    const dumps = [...runs.values()].map((r) => join(dir, String(r.logical_file_name)))
    for (const p of dumps) {
      expect(existsSync(p)).toBe(false)
    }
  })

  it('retenção não remove PRE_RESTORE_SNAPSHOT', async () => {
    const env = baseEnv(dir)
    const snapPath = join(dir, 'snap.dump')
    writeFileSync(snapPath, 'snap')
    runs.set('snap', {
      id: 'snap',
      backup_kind: 'PRE_RESTORE_SNAPSHOT',
      trigger_type: 'PRE_RESTORE',
      status: 'COMPLETED',
      storage_key: 'snap.dump',
      logical_file_name: 'snap.dump',
      finished_at: new Date(0),
    })
    const { listExpiredCandidates } = await import('./backups.repository.js')
    vi.mocked(listExpiredCandidates).mockResolvedValueOnce([])
    await applyRetention({} as never, env, 'keep', undefined)
    expect(existsSync(snapPath)).toBe(true)
    expect(runs.get('snap')?.status).toBe('COMPLETED')
  })

  it('checksum sha256 bate com arquivo', async () => {
    const content = 'FAKE_DUMP_CONTENT_NOT_EMPTY'
    const expected = createHash('sha256').update(content).digest('hex')
    const env = baseEnv(dir)
    const result = await serviceTriggerFullBackup({} as never, env, {
      triggerType: 'MANUAL',
      actorUserId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      wait: true,
    })
    expect(result.checksumSha256).toBe(expected)
    const file = join(dir, result.logicalFileName)
    expect(readFileSync(file, 'utf8')).toBe(content)
  })
})
