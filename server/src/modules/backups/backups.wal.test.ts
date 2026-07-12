import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Env } from '../../config/env.js'
import { resetBackupLockForTests, serviceSyncWal } from './backups.service.js'

vi.mock('../admin-audit/admin-audit.repository.js', () => ({
  insertAdminAuditEvent: vi.fn(async () => undefined),
}))

const upserted: string[] = []

vi.mock('./backups.repository.js', () => ({
  listBackupRuns: vi.fn(),
  findBackupRunById: vi.fn(),
  countActiveBackupRuns: vi.fn(async () => 0),
  findLastCompletedBackup: vi.fn(),
  findLastValidBackup: vi.fn(),
  countWalSegments: vi.fn(async () => 0),
  insertBackupRun: vi.fn(),
  markBackupRunning: vi.fn(),
  markBackupCompleted: vi.fn(),
  markBackupFailed: vi.fn(),
  listExpiredCandidates: vi.fn(async () => []),
  markBackupExpired: vi.fn(),
  markBackupMissingFile: vi.fn(),
  listWalSegments: vi.fn(async () => []),
  findWalSegmentById: vi.fn(),
  upsertWalSegment: vi.fn(async (_db: unknown, input: { segmentName: string }) => {
    upserted.push(input.segmentName)
    return {
      id: '33333333-3333-3333-3333-333333333333',
      environment: 'test',
      database_name: 'sgp',
      segment_name: input.segmentName,
      storage_key: input.segmentName,
      size_bytes: 16,
      checksum_sha256: 'a'.repeat(64),
      archived_at: new Date(),
      available_for_download: true,
      created_at: new Date(),
    }
  }),
}))

function envFor(walDir: string): Env {
  return {
    nodeEnv: 'test',
    port: 4000,
    pgPoolConfig: {
      host: 'localhost',
      port: 5432,
      database: 'sgp',
      user: 'postgres',
      password: 'x',
    },
    corsOrigin: '*',
    logLevel: 'error',
    jwtSecret: 'test-secret-16chars',
    jwtExpiresDays: 7,
    authCookieName: 'sgp',
    loginMaxFailedAttempts: 5,
    loginLockoutMinutes: 15,
    sessionAbsoluteTimeoutHours: 8,
    productionAuthCookieName: 'p',
    productionJwtSecret: 'test-secret-16chars',
    productionSessionIdleTimeoutMinutes: 30,
    productionSessionAbsoluteTimeoutHours: 12,
    productionPinMaxFailedAttempts: 5,
    productionPinLockoutMinutes: 15,
    documentDraftAdapter: 'local',
    argosPolicyMode: 'balanced',
    argosIngestTimeoutMs: 1,
    argosConveyorHealthAnalyzePath: '/',
    argosHealthTimeoutMs: 1,
    documentDraftMaxFileBytes: 1000,
    argosRemoteRequired: false,
    argosUseMinimalStub: false,
    supportEmailSubjectPrefix: '[SGP]',
    smtpPort: 587,
    smtpSecure: false,
    smtpRequireTls: false,
    backupEnabled: true,
    backupDirectory: '/tmp',
    backupRetentionDays: 14,
    backupScheduleCron: '0 2 * * *',
    backupFilePrefix: 'sgp',
    backupWalDirectory: walDir,
    backupCommandTimeoutSeconds: 60,
    backupPgDumpPath: 'pg_dump',
    backupPgRestorePath: 'pg_restore',
  } as Env
}

describe('WAL sync', () => {
  beforeEach(() => {
    upserted.length = 0
    resetBackupLockForTests()
  })

  it('não cataloga nomes WAL inválidos', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'sgp-wal-'))
    writeFileSync(join(dir, '0000000100000000000000AA'), 'wal-data-content!')
    writeFileSync(join(dir, 'evil.txt'), 'nope')
    writeFileSync(join(dir, '..hidden'), 'nope')

    const result = await serviceSyncWal(
      {} as never,
      envFor(dir),
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    )
    expect(upserted).toEqual(['0000000100000000000000AA'])
    expect(result.segmentsUpserted).toBe(1)
  })
})
