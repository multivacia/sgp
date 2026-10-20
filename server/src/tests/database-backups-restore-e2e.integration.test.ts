import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp } from '../app.js'
import {
  hasDatabaseConnectionInEnv,
  loadDotenvFiles,
  loadEnv,
  type Env,
} from '../config/env.js'
import {
  getRestoreJob,
  isMaintenanceActive,
  resetDatabaseBackupsStateForTests,
} from '../modules/database-backups/database-backups.state.js'
import { createLogger } from '../plugins/logger.js'
import { sessionCookieForUser } from './sessionTestCookie.js'

loadDotenvFiles()

/**
 * Restore ponta a ponta com o script real, numa base descartável criada a partir da base de teste.
 * Exige PostgreSQL local (PG* no `server/.env`) e pg_dump/pg_restore/psql no PATH.
 */
const hasDb = hasDatabaseConnectionInEnv(process.env) && !process.env.DATABASE_URL?.trim()
const hasPgTools = ['pg_dump', 'pg_restore', 'pg_dumpall', 'flock'].every(
  (t) => spawnSync('bash', ['-c', `command -v ${t}`]).status === 0,
)

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const BACKUP_SCRIPT = join(repoRoot, 'scripts/db/backup/sgp-db-backup.sh')
const REMOTE_SCRIPT = join(repoRoot, 'scripts/db/backup/sgp-backup-remote.sh')

const E2E_DB = 'sgp_restore_e2e'
const SUPER_ADMIN_USER_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
const SUPER_ADMIN_EMAIL = 'super-admin-test@sgp-argos.local'
const SUPER_ADMIN_ROLE_ID = '66666666-6666-6666-6666-666666666666'
const MARK_BEFORE = 'E2E backup: setor original'
const MARK_AFTER = 'E2E backup: setor criado depois do backup'

async function waitFor(cond: () => boolean, timeoutMs = 60_000): Promise<void> {
  const t0 = Date.now()
  while (!cond()) {
    if (Date.now() - t0 > timeoutMs) throw new Error('timeout aguardando condição')
    await new Promise((r) => setTimeout(r, 100))
  }
}

describe.skipIf(!hasDb || !hasPgTools)('restore ponta a ponta (PostgreSQL local descartável)', () => {
  let admin: pg.Pool
  let pool: pg.Pool
  let app: ReturnType<typeof createApp>
  let root: string
  let dir: string
  let cookie: string
  const savedEnv = { ...process.env }

  function pgEnv(database: string): NodeJS.ProcessEnv {
    return { ...process.env, PGDATABASE: database }
  }

  function runScript(args: string[]): ReturnType<typeof spawnSync> {
    return spawnSync('bash', [BACKUP_SCRIPT, ...args], { env: process.env, encoding: 'utf-8' })
  }

  function remote(command: string): ReturnType<typeof spawnSync> {
    return spawnSync('bash', [REMOTE_SCRIPT], {
      env: { ...process.env, SSH_ORIGINAL_COMMAND: command },
      encoding: 'utf-8',
    })
  }

  async function sectorNames(): Promise<string[]> {
    const r = await pool.query<{ name: string }>(
      `SELECT name FROM sectors WHERE name LIKE 'E2E backup:%' ORDER BY name`,
    )
    return r.rows.map((x) => x.name)
  }

  async function startRestore(fileName: string) {
    return request(app)
      .post('/api/v1/admin/database-backups/restore')
      .set('Cookie', cookie)
      .send({ fileName, databaseName: E2E_DB })
  }

  beforeAll(async () => {
    const env = loadEnv()
    if (!('database' in env.pgPoolConfig)) throw new Error('teste exige Modo B (PG*)')
    const base = env.pgPoolConfig

    admin = new pg.Pool({ ...base, database: 'postgres', max: 1 })
    await admin.query(`DROP DATABASE IF EXISTS ${E2E_DB} WITH (FORCE)`)
    await admin.query(`CREATE DATABASE ${E2E_DB}`)
    const dump = spawnSync('pg_dump', ['-Fc'], { env: pgEnv(base.database), maxBuffer: 1 << 30 })
    expect(dump.status).toBe(0)
    const load = spawnSync('pg_restore', ['--no-owner', '--dbname', E2E_DB], {
      env: pgEnv(E2E_DB),
      input: dump.stdout,
    })
    expect(load.status, String(load.stderr)).toBe(0)

    root = mkdtempSync(join(tmpdir(), 'sgp-restore-e2e-'))
    dir = join(root, 'db')
    mkdirSync(dir)
    const envFile = join(root, 'server.env')
    writeFileSync(
      envFile,
      [
        `PGHOST=${base.host}`,
        `PGPORT=${base.port}`,
        `PGDATABASE=${E2E_DB}`,
        `PGUSER=${base.user}`,
        `PGPASSWORD=${base.password}`,
      ].join('\n') + '\n',
    )
    process.env.SGP_BACKUP_DIR = dir
    process.env.SGP_SERVER_ENV_FILE = envFile
    delete process.env.SGP_BACKUP_LOG
    delete process.env.SGP_BACKUP_SCRIPT

    const e2eEnv: Env = { ...env, pgPoolConfig: { ...base, database: E2E_DB } }
    pool = new pg.Pool({ ...base, database: E2E_DB, max: 4 })
    app = createApp(pool, createLogger('silent'), e2eEnv)

    await pool.query(
      `UPDATE app_users SET role_id = $2::uuid, is_active = true, deleted_at = NULL WHERE id = $1::uuid`,
      [SUPER_ADMIN_USER_ID, SUPER_ADMIN_ROLE_ID],
    )
    await pool.query(`DELETE FROM sectors WHERE name LIKE 'E2E backup:%'`)
    await pool.query(`INSERT INTO sectors (name) VALUES ($1)`, [MARK_BEFORE])
    cookie = await sessionCookieForUser(pool, SUPER_ADMIN_USER_ID, SUPER_ADMIN_EMAIL)
    resetDatabaseBackupsStateForTests()
  })

  afterAll(async () => {
    resetDatabaseBackupsStateForTests()
    await pool?.end()
    await admin?.query(`DROP DATABASE IF EXISTS ${E2E_DB} WITH (FORCE)`)
    await admin?.end()
    for (const k of ['SGP_BACKUP_DIR', 'SGP_SERVER_ENV_FILE', 'SGP_BACKUP_LOG', 'SGP_BACKUP_SCRIPT']) {
      if (savedEnv[k] === undefined) delete process.env[k]
      else process.env[k] = savedEnv[k]
    }
    if (root) rmSync(root, { recursive: true, force: true })
  })

  let dumpName = ''

  it('gera backup, confirma a cópia e lista na tela', async () => {
    const r = runScript(['--reason', 'scheduled'])
    expect(r.status, String(r.stderr)).toBe(0)
    dumpName = readdirSync(dir).find((n) => n.endsWith('_scheduled.dump'))!
    expect(dumpName).toBeTruthy()
    expect(existsSync(join(dir, dumpName.replace('.dump', '.globals.sql')))).toBe(true)

    // Antes da confirmação da cópia, a tela não lista o backup.
    const before = await request(app).get('/api/v1/admin/database-backups').set('Cookie', cookie)
    expect(before.body.data).toEqual([])

    // Mesmo fluxo da máquina de Compras: list → get → conferir SHA → confirm.
    const list = String(remote('list').stdout).trim().split('\n')
    const line = list.find((l) => l.includes(` ${dumpName} `))!
    const sha = line.split(' ')[0]!
    const got = spawnSync('bash', [REMOTE_SCRIPT], {
      env: { ...process.env, SSH_ORIGINAL_COMMAND: `get ${dumpName}` },
    })
    const localSha = spawnSync('sha256sum', [], { input: got.stdout, encoding: 'utf-8' })
      .stdout.split(' ')[0]
    expect(localSha).toBe(sha)
    expect(remote(`confirm ${dumpName} ${sha}`).status).toBe(0)

    const after = await request(app).get('/api/v1/admin/database-backups').set('Cookie', cookie)
    expect(after.body.data.map((i: { fileName: string }) => i.fileName)).toEqual([dumpName])

    const status = await request(app).get('/api/v1/admin/database-backups/status').set('Cookie', cookie)
    expect(status.body.data.lastRun.status).toBe('success')
    expect(status.body.data.databaseName).toBe(E2E_DB)
  })

  it('restaura: desfaz a alteração, faz backup pre-restore, avisa sobre migrations e audita', async () => {
    await pool.query(`INSERT INTO sectors (name) VALUES ($1)`, [MARK_AFTER])
    expect(await sectorNames()).toEqual([MARK_AFTER, MARK_BEFORE])

    const start = await startRestore(dumpName)
    expect(start.status).toBe(202)
    await waitFor(() => getRestoreJob()?.auditRecorded != null)

    const job = getRestoreJob()!
    expect(job.status, job.errorMessage ?? '').toBe('success')
    expect(job.migrationsNotice).toContain('npm run migrate:file')
    expect(job.preRestoreBackup).toMatch(/_pre-restore\.dump$/)
    expect(existsSync(join(dir, job.preRestoreBackup!))).toBe(true)
    expect(job.auditRecorded).toBe(true)
    expect(isMaintenanceActive()).toBe(false)

    expect(await sectorNames()).toEqual([MARK_BEFORE])

    const audit = await pool.query<{ result_status: string; actor_user_id: string; m: Record<string, unknown> }>(
      `SELECT result_status, actor_user_id, metadata_json AS m FROM admin_audit_events
       WHERE event_type = 'database_restored' ORDER BY occurred_at DESC LIMIT 1`,
    )
    expect(audit.rows[0]?.result_status).toBe('success')
    expect(audit.rows[0]?.actor_user_id).toBe(SUPER_ADMIN_USER_ID)
    expect(audit.rows[0]?.m.backup_file).toBe(dumpName)

    const log = readFileSync(join(dir, 'backup-log.jsonl'), 'utf-8').trim().split('\n').map((l) => JSON.parse(l))
    const restoreEv = log.filter((e) => e.event === 'restore').pop()
    expect(restoreEv.status).toBe('success')
    expect(restoreEv.file).toBe(dumpName)
    expect(log.some((e) => e.event === 'backup' && e.reason === 'pre-restore' && e.status === 'success')).toBe(true)
  })

  it('falha no pg_restore desfaz tudo: a base fica intacta e o erro aparece', async () => {
    await pool.query(`INSERT INTO sectors (name) VALUES ($1)`, [MARK_AFTER])
    // Objeto fora do backup que depende de uma tabela do backup: o DROP do --clean falha
    // no meio do restore e a transação única é desfeita.
    await pool.query(`CREATE VIEW e2e_restore_blocker AS SELECT id, name FROM sectors`)
    const countBefore = await pool.query<{ c: string }>(`SELECT count(*)::text AS c FROM conveyors`)

    resetDatabaseBackupsStateForTests()
    const start = await startRestore(dumpName)
    expect(start.status).toBe(202)
    await waitFor(() => getRestoreJob()?.auditRecorded != null)

    const job = getRestoreJob()!
    expect(job.status).toBe('failure')
    expect(job.errorMessage).toContain('pg_restore falhou')
    expect(job.migrationsNotice).toBeNull()
    expect(isMaintenanceActive()).toBe(false)

    expect(await sectorNames()).toEqual([MARK_AFTER, MARK_BEFORE])
    const view = await pool.query(`SELECT 1 FROM pg_views WHERE viewname = 'e2e_restore_blocker'`)
    expect(view.rowCount).toBe(1)
    const countAfter = await pool.query<{ c: string }>(`SELECT count(*)::text AS c FROM conveyors`)
    expect(countAfter.rows[0]?.c).toBe(countBefore.rows[0]?.c)

    const audit = await pool.query<{ result_status: string }>(
      `SELECT result_status FROM admin_audit_events
       WHERE event_type = 'database_restored' ORDER BY occurred_at DESC LIMIT 1`,
    )
    expect(audit.rows[0]?.result_status).toBe('failure')

    const health = await request(app).get('/api/v1/health')
    expect(health.status).toBe(200)
  })
})
