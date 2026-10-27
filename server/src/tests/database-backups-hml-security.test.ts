import { spawnSync } from 'node:child_process'
import { chmodSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

// Linux-only: the application is deployed on Ubuntu; Windows bash.exe may not launch WSL.
const linuxIt = process.platform === 'linux' ? it : it.skip
const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const sourcePath = join(root, 'scripts/db/backup/sgp-db-backup.sh')
let tempDir: string
let sourcedScript: string
let mockBin: string
let invoked: string

function target(env: Record<string, string> = {}) {
  const cmd = [
    'source "$1"',
    'SGP_BACKUP_ENV=homologation',
    'ENV_FILE=/opt/sgp/sgp-homol/server/.env',
    'BACKUP_DIR=/opt/sgp/backups/hml',
    'LOG_FILE=/opt/sgp/backups/hml/backup-log.jsonl',
    'PGHOST=127.0.0.1',
    'PGPORT=5434',
    'PGDATABASE=sgp_homol',
    'PGUSER=sgp_homol_app',
    ...Object.entries(env).map(([key, value]) => `${key}=${JSON.stringify(value)}`),
    'assert_hml_target',
  ].join('; ')
  return spawnSync('bash', ['-c', cmd, 'test', sourcedScript], { encoding: 'utf8' })
}

beforeAll(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'sgp-hml-backup-security-'))
  sourcedScript = join(tempDir, 'source-only.sh')
  const original = readFileSync(sourcePath, 'utf8')
  // Source functions without invoking main(). Never run a database command here.
  const withoutMain = original.replace(/\nmain "\$@"\s*$/, '\n')
  if (withoutMain === original) throw new Error('Could not remove main entrypoint')
  writeFileSync(sourcedScript, withoutMain)
  mockBin = join(tempDir, 'bin')
  mkdirSync(mockBin)
  invoked = join(tempDir, 'commands-invoked')
  for (const name of ['pg_dump', 'pg_dumpall', 'pg_restore', 'psql']) {
    const p = join(mockBin, name)
    writeFileSync(p, '#!/bin/sh\nprintf "%s\\n" "$0" >> "$MOCK_LOG"\nexit 88\n')
    chmodSync(p, 0o755)
  }
})

afterAll(() => {
  if (tempDir) rmSync(tempDir, { recursive: true, force: true })
})

describe('backup HML: fail closed, without PostgreSQL', () => {
  linuxIt('accepts only expected HML identity and paths', () => {
    expect(target().status).toBe(0)
  })

  linuxIt.each([
    ['database', { PGDATABASE: 'sgp_prod' }],
    ['port', { PGPORT: '5433' }],
    ['user', { PGUSER: 'postgres' }],
    ['host', { PGHOST: 'remote.example' }],
    ['environment file', { ENV_FILE: '/opt/sgp/sgp-main/server/.env' }],
    ['backup directory', { BACKUP_DIR: '/opt/sgp/backups/db' }],
    ['backup log', { LOG_FILE: '/opt/sgp/backups/db/backup-log.jsonl' }],
  ])('rejects unexpected %s', (_label, changed) => {
    expect(target(changed).status).not.toBe(0)
  })

  linuxIt('rejects HML restore before creating files or running database tools', () => {
    const r = spawnSync('bash', [sourcePath, '--restore', 'sgp_20261027-010000_manual.dump'], {
      env: {
        ...process.env,
        SGP_BACKUP_ENV: 'homologation',
        SGP_BACKUP_DIR: '/opt/sgp/backups/hml',
        SGP_BACKUP_LOG: '/opt/sgp/backups/hml/backup-log.jsonl',
        SGP_SERVER_ENV_FILE: '/opt/sgp/sgp-homol/server/.env',
        MOCK_LOG: invoked,
        PATH: `${mockBin}:${process.env.PATH ?? ''}`,
      },
      encoding: 'utf8',
    })
    expect(r.status).toBe(2)
    expect(r.stderr).toContain('Restauração HML desabilitada.')
    expect(existsSync(invoked)).toBe(false)
  })

  linuxIt('rejects HML backup paths before writing or accessing PostgreSQL', () => {
    const r = spawnSync('bash', [sourcePath, '--reason', 'manual'], {
      env: {
        ...process.env,
        SGP_BACKUP_ENV: 'homologation',
        SGP_BACKUP_DIR: join(tempDir, 'not-authorized'),
        SGP_BACKUP_LOG: join(tempDir, 'not-authorized', 'backup-log.jsonl'),
        SGP_SERVER_ENV_FILE: '/opt/sgp/sgp-homol/server/.env',
        MOCK_LOG: invoked,
        PATH: `${mockBin}:${process.env.PATH ?? ''}`,
      },
      encoding: 'utf8',
    })
    expect(r.status).toBe(2)
    expect(existsSync(join(tempDir, 'not-authorized'))).toBe(false)
    expect(existsSync(invoked)).toBe(false)
  })
})
