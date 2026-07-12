import { mkdtempSync, symlinkSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { AppError } from '../../shared/errors/AppError.js'
import {
  absoluteFromStorageKey,
  assertFileInsideRoot,
  buildFullLogicalFileName,
  isValidWalSegmentName,
  resolvePathInsideRoot,
  sanitizeLogicalFileName,
} from './backups.pathSafe.js'

describe('backups.pathSafe', () => {
  it('sanitiza logical file name e bloqueia path traversal no nome', () => {
    expect(sanitizeLogicalFileName('../../etc/passwd')).toBe('passwd')
    expect(buildFullLogicalFileName('sgp', 'development', new Date('2026-07-12T14:30:45Z'))).toBe(
      'sgp_development_FULL_2026-07-12_143045.dump',
    )
  })

  it('valida nomes WAL e rejeita inválidos', () => {
    expect(isValidWalSegmentName('000000010000000000000001')).toBe(true)
    expect(isValidWalSegmentName('00000001.history')).toBe(true)
    expect(isValidWalSegmentName('../evil')).toBe(false)
    expect(isValidWalSegmentName('not-a-wal')).toBe(false)
    expect(isValidWalSegmentName('subdir/000000010000000000000001')).toBe(false)
  })

  it('bloqueia path fora do diretório e symlink escape', () => {
    const root = mkdtempSync(join(tmpdir(), 'sgp-backup-root-'))
    const outside = mkdtempSync(join(tmpdir(), 'sgp-backup-out-'))
    writeFileSync(join(outside, 'secret.dump'), 'x')
    writeFileSync(join(root, 'ok.dump'), 'ok')

    // absolute escape
    expect(() => resolvePathInsideRoot(root, join(outside, 'secret.dump'))).toThrow(AppError)

    const link = join(root, 'escape.dump')
    symlinkSync(join(outside, 'secret.dump'), link)
    expect(() => assertFileInsideRoot(root, link)).toThrow(AppError)

    expect(absoluteFromStorageKey(root, 'ok.dump')).toContain('ok.dump')
  })

  it('bloqueia storage_key com separadores após sanitização indireta', () => {
    const root = mkdtempSync(join(tmpdir(), 'sgp-backup-root2-'))
    mkdirSync(root, { recursive: true })
    writeFileSync(join(root, 'safe.dump'), 'data')
    const abs = absoluteFromStorageKey(root, 'safe.dump')
    assertFileInsideRoot(root, abs)
  })
})
