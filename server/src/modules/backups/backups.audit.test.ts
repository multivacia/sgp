import { describe, expect, it } from 'vitest'
import { buildSanitizedMetadata } from '../admin-audit/admin-audit.metadata.js'

describe('admin-audit backup metadata', () => {
  it('aceita metadata de backup_run_completed sem path absoluto', () => {
    const meta = buildSanitizedMetadata('backup_run_completed', {
      backup_run_id: '11111111-1111-1111-1111-111111111111',
      trigger_type: 'MANUAL',
      status: 'COMPLETED',
      size_bytes: 100,
      integrity_status: 'VALID',
      logical_file_name: 'sgp_dev_FULL_2026-07-12_020000.dump',
      environment: 'development',
      database_name: 'sgp',
      result: 'ok',
    })
    expect(meta).toMatchObject({ status: 'COMPLETED', result: 'ok' })
    expect(JSON.stringify(meta)).not.toMatch(/\/var\//)
  })

  it('rejeita logical_file_name com path', () => {
    expect(() =>
      buildSanitizedMetadata('backup_downloaded', {
        backup_run_id: '11111111-1111-1111-1111-111111111111',
        status: 'COMPLETED',
        size_bytes: 1,
        integrity_status: 'VALID',
        logical_file_name: '/etc/passwd',
        environment: 'development',
        database_name: 'sgp',
        result: 'ok',
      }),
    ).toThrow(/path inválido/)
  })
})
