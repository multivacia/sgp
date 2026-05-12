import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.js'
import { createLogger } from '../plugins/logger.js'
import { closePool, getPool } from '../plugins/db.js'
import {
  hasDatabaseConnectionInEnv,
  loadDotenvFiles,
  loadEnv,
} from '../config/env.js'
import { serviceCreateConveyor } from '../modules/conveyors/conveyors.service.js'
import type { PostConveyorBody } from '../modules/conveyors/conveyors.schemas.js'
import { serviceCreateConveyorNodeAssignee } from '../modules/conveyors/conveyorAssignments.service.js'
import { sessionCookieForUser } from './sessionTestCookie.js'
import { ensureMariaCollaboratorSeedForIntegration } from './integrationSeedFixtures.js'

loadDotenvFiles()

const hasDb = hasDatabaseConnectionInEnv(process.env)

const COLAB_SEED = '3a5f3c72-2e75-4e0a-8f6e-6d4d086e5f1c'
const MARIA_APP_USER_ID = '44444444-4444-4444-4444-444444444444'
const MARIA_EMAIL = 'maria@exemplo.com'
const GOV_ADMIN_USER_ID = '55555555-5555-5555-5555-555555555555'
const GOV_ADMIN_EMAIL = 'gov-collab-test@sgp-argos.local'
const ADMIN_ROLE_ID = '11111111-1111-1111-1111-111111111111'

import { hashPassword } from '../shared/password/password.js'

function minimalConveyorBody(nome: string): PostConveyorBody {
  return {
    dados: {
      nome,
      cliente: 'ClienteFiltroX',
      veiculo: 'V',
      modeloVersao: '',
      placa: 'ABC1D23',
      observacoes: '',
      responsavel: '',
      prazoEstimado: '',
      prioridade: 'media',
      colaboradorId: null,
    },
    originType: 'MANUAL',
    baseId: null,
    baseCode: null,
    baseName: null,
    baseVersion: null,
    options: [
      {
        titulo: 'Opção A',
        orderIndex: 1,
        sourceOrigin: 'manual',
        areas: [
          {
            titulo: 'Área 1',
            orderIndex: 1,
            sourceOrigin: 'manual',
            steps: [
              {
                titulo: 'Etapa 1',
                orderIndex: 1,
                plannedMinutes: 30,
                sourceOrigin: 'manual',
                required: true,
              },
            ],
          },
        ],
      },
    ],
  }
}

describe.skipIf(!hasDb)('GET /api/v1/me/time-entry-candidates (integração)', () => {
  let app: ReturnType<typeof createApp>
  let pool: ReturnType<typeof getPool>

  beforeAll(async () => {
    const env = loadEnv()
    pool = getPool(env)
    app = createApp(pool, createLogger('silent'), env)
    await ensureMariaCollaboratorSeedForIntegration(pool)
    const hashGov = await hashPassword('CollabGovTest1!')
    await pool.query(
      `INSERT INTO app_users (
          id, email, password_hash, is_active, role_id, must_change_password, password_changed_at
        ) VALUES (
          $1::uuid, $2, $3, true, $4::uuid, false, now()
        )
        ON CONFLICT (id) DO UPDATE SET
          role_id = EXCLUDED.role_id,
          is_active = true,
          email = EXCLUDED.email`,
      [GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL, hashGov, ADMIN_ROLE_ID],
    )
  })

  afterAll(async () => {
    await closePool()
  })

  async function firstNodeId(
    conveyorId: string,
    nodeType: 'OPTION' | 'AREA' | 'STEP',
  ): Promise<string> {
    const r = await pool.query<{ id: string }>(
      `SELECT id FROM conveyor_nodes
       WHERE conveyor_id = $1::uuid AND node_type = $2 AND deleted_at IS NULL
       ORDER BY order_index, id
       LIMIT 1`,
      [conveyorId, nodeType],
    )
    const row = r.rows[0]
    if (!row) throw new Error(`nó ${nodeType} não encontrado`)
    return row.id
  }

  it('sem cookie → 401', async () => {
    const res = await request(app).get('/api/v1/me/time-entry-candidates')
    expect(res.status).toBe(401)
  })

  it('sem colaborador vinculado → 200, lista vazia e meta.unavailableReason', async () => {
    await pool.query(
      `UPDATE app_users SET collaborator_id = NULL WHERE id = $1::uuid`,
      [MARIA_APP_USER_ID],
    )
    const res = await request(app)
      .get('/api/v1/me/time-entry-candidates')
      .set(
        'Cookie',
        await sessionCookieForUser(pool, MARIA_APP_USER_ID, MARIA_EMAIL),
      )
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data).toHaveLength(0)
    expect(res.body.meta.collaboratorId).toBeNull()
    expect(String(res.body.meta.unavailableReason ?? '')).toContain('colaborador')
    await pool.query(
      `UPDATE app_users SET collaborator_id = $1::uuid WHERE id = $2::uuid`,
      [COLAB_SEED, MARIA_APP_USER_ID],
    )
  })

  it('lista STEPs abertos; filtro q; exclusão após conclusão explícita; POST tempo inválido', async () => {
    await pool.query(
      `UPDATE app_users SET collaborator_id = $1::uuid WHERE id = $2::uuid`,
      [COLAB_SEED, MARIA_APP_USER_ID],
    )

    const tag = randomUUID().slice(0, 8)
    const created = await serviceCreateConveyor(
      pool,
      minimalConveyorBody(`Cand ${tag}`),
    )
    const stepId = await firstNodeId(created.id, 'STEP')
    await serviceCreateConveyorNodeAssignee(pool, {
      conveyorId: created.id,
      conveyorNodeId: stepId,
      collaboratorId: COLAB_SEED,
      isPrimary: true,
    })

    const cookieMaria = await sessionCookieForUser(pool, MARIA_APP_USER_ID, MARIA_EMAIL)

    const list1 = await request(app)
      .get('/api/v1/me/time-entry-candidates')
      .set('Cookie', cookieMaria)
    expect(list1.status).toBe(200)
    expect(list1.body.meta.collaboratorId).toBe(COLAB_SEED)
    expect(list1.body.meta.unavailableReason).toBeNull()
    const row = list1.body.data.find(
      (x: { conveyorId: string; stepNodeId: string }) =>
        x.conveyorId === created.id && x.stepNodeId === stepId,
    )
    expect(row).toBeTruthy()
    expect(row.pendingMinutes).toBeGreaterThanOrEqual(0)
    expect(typeof row.realizedMinutes).toBe('number')

    const incOther = await request(app)
      .get(
        `/api/v1/me/time-entry-candidates?q=${encodeURIComponent('Cli')}&includeUnassigned=true`,
      )
      .set('Cookie', cookieMaria)
    expect(incOther.status).toBe(200)
    for (const x of incOther.body.data as Array<{
      isAssignedToMe: boolean
      requiresJustification: boolean
    }>) {
      expect(x.requiresJustification).toBe(!x.isAssignedToMe)
    }

    const filt = await request(app)
      .get(`/api/v1/me/time-entry-candidates?q=${encodeURIComponent('ClienteFiltroX')}`)
      .set('Cookie', cookieMaria)
    expect(filt.status).toBe(200)
    expect(
      filt.body.data.some(
        (x: { conveyorId: string }) => x.conveyorId === created.id,
      ),
    ).toBe(true)

    const noHit = await request(app)
      .get(`/api/v1/me/time-entry-candidates?q=${encodeURIComponent('zzzzz_nomatch')}`)
      .set('Cookie', cookieMaria)
    expect(noHit.status).toBe(200)
    expect(
      noHit.body.data.some(
        (x: { conveyorId: string }) => x.conveyorId === created.id,
      ),
    ).toBe(false)

    const patch = await request(app)
      .patch(`/api/v1/conveyors/${created.id}/steps/${stepId}/completion`)
      .set(
        'Cookie',
        await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL),
      )
      .send({ action: 'COMPLETE' })
    expect(patch.status).toBe(200)

    const list2 = await request(app)
      .get('/api/v1/me/time-entry-candidates')
      .set('Cookie', cookieMaria)
    expect(list2.status).toBe(200)
    expect(
      list2.body.data.some(
        (x: { conveyorId: string; stepNodeId: string }) =>
          x.conveyorId === created.id && x.stepNodeId === stepId,
      ),
    ).toBe(false)

    const created2 = await serviceCreateConveyor(
      pool,
      minimalConveyorBody(`CandTE ${randomUUID().slice(0, 8)}`),
    )
    const step2 = await firstNodeId(created2.id, 'STEP')
    await serviceCreateConveyorNodeAssignee(pool, {
      conveyorId: created2.id,
      conveyorNodeId: step2,
      collaboratorId: COLAB_SEED,
      isPrimary: true,
    })

    const bad = await request(app)
      .post(
        `/api/v1/conveyors/${created2.id}/steps/${step2}/time-entries`,
      )
      .set('Cookie', cookieMaria)
      .send({ minutes: 0 })
    expect(bad.status).toBe(422)

    const ok = await request(app)
      .post(
        `/api/v1/conveyors/${created2.id}/steps/${step2}/time-entries`,
      )
      .set('Cookie', cookieMaria)
      .send({ minutes: 12, description: 'teste integração' })
    expect(ok.status).toBe(201)
    expect(ok.body.data.minutes).toBe(12)
    expect(ok.body.data.notes).toContain('integração')
  })
})
