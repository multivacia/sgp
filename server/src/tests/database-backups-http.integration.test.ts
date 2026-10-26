import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import request from 'supertest'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../app.js'
import {
  hasDatabaseConnectionInEnv,
  loadDotenvFiles,
  loadEnv,
} from '../config/env.js'
import { MAINTENANCE_MESSAGE } from '../modules/database-backups/database-backups.maintenance.js'
import { resolveDatabaseName } from '../modules/database-backups/database-backups.service.js'
import {
  getRestoreJob,
  isMaintenanceActive,
  resetDatabaseBackupsStateForTests,
} from '../modules/database-backups/database-backups.state.js'
import { closePool, getPool } from '../plugins/db.js'
import { createLogger } from '../plugins/logger.js'
import { ErrorCodes } from '../shared/errors/errorCodes.js'
import { hashPassword } from '../shared/password/password.js'
import { sessionCookieForUser } from './sessionTestCookie.js'

loadDotenvFiles()

const hasDb = hasDatabaseConnectionInEnv(process.env)
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const REAL_SCRIPT = join(repoRoot, 'scripts/db/backup/sgp-db-backup.sh')

const SUPER_ADMIN_USER_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
const SUPER_ADMIN_EMAIL = 'super-admin-test@sgp-argos.local'
const SUPER_ADMIN_ROLE_ID = '66666666-6666-6666-6666-666666666666'
const ADMIN_USER_ID = '55555555-5555-5555-5555-555555555555'
const ADMIN_EMAIL = 'gov-collab-test@sgp-argos.local'
const ADMIN_ROLE_ID = '11111111-1111-1111-1111-111111111111'

const SHA_A = 'a'.repeat(64)

async function waitFor(cond: () => boolean, timeoutMs = 10_000): Promise<void> {
  const t0 = Date.now()
  while (!cond()) {
    if (Date.now() - t0 > timeoutMs) throw new Error('timeout aguardando condição')
    await new Promise((r) => setTimeout(r, 50))
  }
}

describe.skipIf(!hasDb)('API database-backups', () => {
  let app: ReturnType<typeof createApp>
  let pool: ReturnType<typeof getPool>
  let env: ReturnType<typeof loadEnv>
  let root: string
  let dir: string
  let superCookie: string
  let adminCookie: string
  const savedEnv = { ...process.env }

  function writeBackup(name: string, content: string, sha = SHA_A): void {
    writeFileSync(join(dir, name), content)
    writeFileSync(join(dir, `${name}.sha256`), `${sha}  ${name}\n`)
  }

  function writeLog(events: object[]): void {
    writeFileSync(join(dir, 'backup-log.jsonl'), events.map((e) => JSON.stringify(e)).join('\n') + '\n')
  }

  function confirmEvent(file: string, sha = SHA_A, at = '2026-10-19T10:00:00Z') {
    return { event: 'copy-confirm', status: 'success', file, sha256: sha, confirmedAt: at, finishedAt: at }
  }

  /** Script falso para controlar trava e duração do restore. */
  function fakeScript(body: string): string {
    const p = join(root, `fake-${Math.random().toString(36).slice(2)}.sh`)
    writeFileSync(p, `#!/usr/bin/env bash\n${body}\n`)
    return p
  }

  beforeAll(async () => {
    env = loadEnv()
    pool = getPool(env)
    app = createApp(pool, createLogger('silent'), env)
    const hash = await hashPassword('GoodPass1!')
    await pool.query(
      `
      INSERT INTO app_users (
        id, email, password_hash, is_active, role_id, must_change_password, password_changed_at,
        failed_login_count, locked_until
      ) VALUES
        ($1::uuid, $2, $3, true, $4::uuid, false, now(), 0, NULL),
        ($5::uuid, $6, $3, true, $7::uuid, false, now(), 0, NULL)
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        is_active = true,
        role_id = EXCLUDED.role_id,
        must_change_password = false,
        failed_login_count = 0,
        locked_until = NULL,
        deleted_at = NULL
      `,
      [SUPER_ADMIN_USER_ID, SUPER_ADMIN_EMAIL, hash, SUPER_ADMIN_ROLE_ID, ADMIN_USER_ID, ADMIN_EMAIL, ADMIN_ROLE_ID],
    )
    superCookie = await sessionCookieForUser(pool, SUPER_ADMIN_USER_ID, SUPER_ADMIN_EMAIL)
    adminCookie = await sessionCookieForUser(pool, ADMIN_USER_ID, ADMIN_EMAIL)
  })

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'sgp-backups-http-'))
    dir = join(root, 'db')
    mkdirSync(dir)
    process.env.SGP_BACKUP_DIR = dir
    delete process.env.SGP_BACKUP_LOG
    delete process.env.SGP_BACKUP_SCRIPT
    resetDatabaseBackupsStateForTests()
  })

  afterEach(() => {
    resetDatabaseBackupsStateForTests()
    rmSync(root, { recursive: true, force: true })
  })

  afterAll(async () => {
    for (const k of ['SGP_BACKUP_DIR', 'SGP_BACKUP_LOG', 'SGP_BACKUP_SCRIPT']) {
      if (savedEnv[k] === undefined) delete process.env[k]
      else process.env[k] = savedEnv[k]
    }
    await closePool()
  })

  it('403 sem system_settings.manage em todas as rotas; 401 sem sessão', async () => {
    const name = 'sgp_20261019-030000_scheduled.dump'
    const calls = [
      request(app).get('/api/v1/admin/database-backups'),
      request(app).get('/api/v1/admin/database-backups/status'),
      request(app).post('/api/v1/admin/database-backups'),
      request(app).get(`/api/v1/admin/database-backups/${name}/download`),
      request(app)
        .post('/api/v1/admin/database-backups/restore')
        .send({ fileName: name, databaseName: 'x' }),
      request(app).get('/api/v1/admin/database-backups/restore/status'),
    ]
    for (const call of calls) {
      const res = await call.set('Cookie', adminCookie)
      expect(res.status).toBe(403)
      expect(res.body.error?.code).toBe(ErrorCodes.FORBIDDEN)
    }
    const anon = await request(app).get('/api/v1/admin/database-backups')
    expect(anon.status).toBe(401)
  })

  it('lista só backups com cópia confirmada e ainda presentes na VPS', async () => {
    writeBackup('sgp_20261019-030000_scheduled.dump', 'confirmado')
    writeBackup('sgp_20261018-030000_scheduled.dump', 'sem-confirmacao')
    writeBackup('sgp_20261017-030000_pre-deploy.dump', 'sha-divergente', 'c'.repeat(64))
    writeFileSync(join(dir, 'sgp_20261019-030000_scheduled.globals.sql'), 'globals')
    writeLog([
      { event: 'backup', status: 'success', reason: 'scheduled', files: [] },
      confirmEvent('sgp_20261019-030000_scheduled.dump'),
      // Confirmado, mas já apagado da VPS (retenção):
      confirmEvent('sgp_20261001-030000_scheduled.dump'),
      // Confirmado com SHA diferente do arquivo atual:
      confirmEvent('sgp_20261017-030000_pre-deploy.dump', SHA_A),
    ])

    const res = await request(app).get('/api/v1/admin/database-backups').set('Cookie', superCookie)
    expect(res.status).toBe(200)
    expect(res.body.data).toEqual([
      {
        fileName: 'sgp_20261019-030000_scheduled.dump',
        createdAt: '2026-10-19T06:00:00.000Z',
        reason: 'scheduled',
        sizeBytes: 'confirmado'.length,
        copyConfirmedAt: '2026-10-19T10:00:00Z',
      },
    ])
  })

  it('status devolve a mensagem de erro quando a última execução falhou', async () => {
    writeLog([
      { event: 'backup', status: 'success', reason: 'scheduled', startedAt: 'a', finishedAt: 'b', errorMessage: null },
      confirmEvent('x'),
      { event: 'backup', status: 'failure', reason: 'manual', startedAt: 'c', finishedAt: 'd', errorMessage: 'pg_dump falhou: sem espaço' },
    ])
    const res = await request(app).get('/api/v1/admin/database-backups/status').set('Cookie', superCookie)
    expect(res.status).toBe(200)
    expect(res.body.data.databaseName).toBe(resolveDatabaseName(env))
    expect(res.body.data.lastRun).toEqual({
      status: 'failure',
      reason: 'manual',
      startedAt: 'c',
      finishedAt: 'd',
      errorMessage: 'pg_dump falhou: sem espaço',
    })
  })

  it('download: recusa nome inválido (422) e nome fora da lista (404); envia o listado', async () => {
    const name = 'sgp_20261019-030000_scheduled.dump'
    writeBackup(name, 'conteudo-do-backup')
    writeBackup('sgp_20261018-030000_scheduled.dump', 'nao-confirmado')
    writeFileSync(join(root, 'segredo.txt'), 'segredo')
    writeLog([confirmEvent(name)])

    for (const bad of ['..%2Fsegredo.txt', '..%2F..%2Fetc%2Fpasswd', 'backup-log.jsonl', `${name}.sha256`]) {
      const res = await request(app)
        .get(`/api/v1/admin/database-backups/${bad}/download`)
        .set('Cookie', superCookie)
      expect([404, 422]).toContain(res.status)
      expect(res.text).not.toContain('segredo')
    }
    const invalid = await request(app)
      .get('/api/v1/admin/database-backups/..%2Fsegredo.txt/download')
      .set('Cookie', superCookie)
    expect(invalid.status).toBe(422)

    const notListed = await request(app)
      .get('/api/v1/admin/database-backups/sgp_20261018-030000_scheduled.dump/download')
      .set('Cookie', superCookie)
    expect(notListed.status).toBe(404)

    const okRes = await request(app)
      .get(`/api/v1/admin/database-backups/${name}/download`)
      .set('Cookie', superCookie)
      .buffer(true)
      .parse((res, cb) => {
        const chunks: Buffer[] = []
        res.on('data', (c: Buffer) => chunks.push(c))
        res.on('end', () => cb(null, Buffer.concat(chunks)))
      })
    expect(okRes.status).toBe(200)
    expect(okRes.headers['content-disposition']).toBe(`attachment; filename="${name}"`)
    expect((okRes.body as Buffer).toString('utf-8')).toBe('conteudo-do-backup')
  })

  it('backup manual: 409 com a trava ocupada (script real + flock)', async () => {
    process.env.SGP_BACKUP_SCRIPT = REAL_SCRIPT
    const lockFile = join(dir, '.sgp-db-backup.lock')
    const holder: ChildProcess = spawn('flock', [lockFile, 'sleep', '30'], { stdio: 'ignore' })
    try {
      await waitFor(() => existsSync(lockFile))
      await new Promise((r) => setTimeout(r, 200))
      const res = await request(app).post('/api/v1/admin/database-backups').set('Cookie', superCookie)
      expect(res.status).toBe(409)
      expect(res.body.error?.code).toBe(ErrorCodes.CONFLICT)

      const restore = await request(app)
        .post('/api/v1/admin/database-backups/restore')
        .set('Cookie', superCookie)
        .send({ fileName: 'sgp_20261019-030000_scheduled.dump', databaseName: resolveDatabaseName(env) })
      // Arquivo não listado: 404 antes de tentar a trava.
      expect(restore.status).toBe(404)
    } finally {
      holder.kill()
    }
    expect(isMaintenanceActive()).toBe(false)
  })

  it('backup manual: 202 quando o script obtém a trava', async () => {
    const marker = join(root, 'ran')
    process.env.SGP_BACKUP_SCRIPT = fakeScript(`echo LOCK_ACQUIRED; [ "$1 $2" = "--reason manual" ] && touch "${marker}"`)
    const res = await request(app).post('/api/v1/admin/database-backups').set('Cookie', superCookie)
    expect(res.status).toBe(202)
    await waitFor(() => existsSync(marker))
  })

  it('restore: 422 com nome da base errado e nada é executado', async () => {
    const name = 'sgp_20261019-030000_scheduled.dump'
    writeBackup(name, 'x')
    writeLog([confirmEvent(name)])
    const marker = join(root, 'ran')
    process.env.SGP_BACKUP_SCRIPT = fakeScript(`touch "${marker}"; echo LOCK_ACQUIRED`)
    const res = await request(app)
      .post('/api/v1/admin/database-backups/restore')
      .set('Cookie', superCookie)
      .send({ fileName: name, databaseName: `${resolveDatabaseName(env)}_errado` })
    expect(res.status).toBe(422)
    expect(res.body.error?.message).toContain('não confere')
    expect(existsSync(marker)).toBe(false)
    expect(isMaintenanceActive()).toBe(false)
  })

  it('restore: 409 com a trava ocupada; sai do modo manutenção', async () => {
    const name = 'sgp_20261019-030000_scheduled.dump'
    writeBackup(name, 'x')
    writeLog([confirmEvent(name)])
    process.env.SGP_BACKUP_SCRIPT = fakeScript('echo "Já existe um backup ou restauração em andamento." >&2; exit 75')
    const res = await request(app)
      .post('/api/v1/admin/database-backups/restore')
      .set('Cookie', superCookie)
      .send({ fileName: name, databaseName: resolveDatabaseName(env) })
    expect(res.status).toBe(409)
    expect(isMaintenanceActive()).toBe(false)
    expect(getRestoreJob()).toBeNull()
  })

  it('modo manutenção: requisições comuns recebem 503 em português durante o restore', async () => {
    const name = 'sgp_20261019-030000_scheduled.dump'
    writeBackup(name, 'x')
    writeLog([confirmEvent(name)])
    const release = join(root, 'release')
    process.env.SGP_BACKUP_SCRIPT = fakeScript(
      [
        'echo LOCK_ACQUIRED',
        'echo "PHASE pre-restore-backup"',
        'echo "PRE_RESTORE_BACKUP sgp_20261019-120000_pre-restore.dump"',
        'echo "PHASE restore"',
        `while [ ! -e "${release}" ]; do sleep 0.05; done`,
        'exit 0',
      ].join('\n'),
    )

    const start = await request(app)
      .post('/api/v1/admin/database-backups/restore')
      .set('Cookie', superCookie)
      .send({ fileName: name, databaseName: resolveDatabaseName(env) })
    expect(start.status).toBe(202)
    expect(start.body.data.status).toBe('running')
    expect(isMaintenanceActive()).toBe(true)

    for (const req of [
      request(app).get('/api/v1/health'),
      request(app).get('/api/v1/system-settings').set('Cookie', superCookie),
      request(app).post('/api/v1/auth/login').send({ email: 'a@b.c', password: 'x' }),
      request(app).get('/api/v1/admin/database-backups/restore/status').set('Cookie', superCookie),
      request(app).post('/api/v1/admin/database-backups').set('Cookie', superCookie),
    ]) {
      const res = await req
      expect(res.status).toBe(503)
      expect(res.body.error.code).toBe(ErrorCodes.SERVICE_UNAVAILABLE)
      expect(res.body.error.message).toBe(MAINTENANCE_MESSAGE)
      expect(res.body.error.details.maintenance).toBe(true)
    }
    await waitFor(() => getRestoreJob()?.phase === 'restore')

    writeFileSync(release, '')
    await waitFor(() => getRestoreJob()?.auditRecorded != null)
    expect(isMaintenanceActive()).toBe(false)

    const status = await request(app)
      .get('/api/v1/admin/database-backups/restore/status')
      .set('Cookie', superCookie)
    expect(status.status).toBe(200)
    expect(status.body.data.status).toBe('success')
    expect(status.body.data.preRestoreBackup).toBe('sgp_20261019-120000_pre-restore.dump')
    expect(status.body.data.migrationsNotice).toContain('npm run migrate:file')
    expect(status.body.data.auditRecorded).toBe(true)

    const health = await request(app).get('/api/v1/health')
    expect(health.status).toBe(200)
  })
})
