import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import { cleanupSeededPlanItems, seedPublishedPlanItem } from './plannedActivityTestHelpers.js'
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
import { ensureMariaCollaboratorSeedForIntegration, linkAppUserToCollaborator, MARIA_APP_USER_EMAIL, MARIA_APP_USER_ID, MARIA_COLLABORATOR_ID, unlinkAppUserCollaborator } from './integrationSeedFixtures.js'
import { setConveyorProductionStatusForIntegration } from './integrationConveyorFixtures.js'

loadDotenvFiles()

const hasDb = hasDatabaseConnectionInEnv(process.env)

const COLAB_SEED = MARIA_COLLABORATOR_ID
const MARIA_EMAIL = MARIA_APP_USER_EMAIL
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
    await cleanupSeededPlanItems(getPool())
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
    await unlinkAppUserCollaborator(pool, MARIA_APP_USER_ID)
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
    await linkAppUserToCollaborator(pool, MARIA_APP_USER_ID, COLAB_SEED)
  })

  it('lista STEPs abertos; filtro q; exclusão após conclusão explícita; POST tempo inválido', async () => {
    await linkAppUserToCollaborator(pool, MARIA_APP_USER_ID, COLAB_SEED)

    const tag = randomUUID().slice(0, 8)
    const created = await serviceCreateConveyor(
      pool,
      minimalConveyorBody(`Cand ${tag}`),
    )
    await setConveyorProductionStatusForIntegration(pool, created.id)
    const stepId = await firstNodeId(created.id, 'STEP')
    await serviceCreateConveyorNodeAssignee(pool, {
      conveyorId: created.id,
      conveyorNodeId: stepId,
      collaboratorId: COLAB_SEED,
      isPrimary: true,
    })
    await seedPublishedPlanItem(pool, {
      conveyorId: created.id,
      stepNodeId: stepId,
      collaboratorId: COLAB_SEED,
      createdByUserId: GOV_ADMIN_USER_ID,
    })

    const cookieMaria = await sessionCookieForUser(pool, MARIA_APP_USER_ID, MARIA_EMAIL)

    const list1 = await request(app)
      .get(`/api/v1/me/time-entry-candidates?q=${encodeURIComponent(tag)}`)
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
    await setConveyorProductionStatusForIntegration(pool, created2.id)
    const step2 = await firstNodeId(created2.id, 'STEP')
    await serviceCreateConveyorNodeAssignee(pool, {
      conveyorId: created2.id,
      conveyorNodeId: step2,
      collaboratorId: COLAB_SEED,
      isPrimary: true,
    })
    await seedPublishedPlanItem(pool, {
      conveyorId: created2.id,
      stepNodeId: step2,
      collaboratorId: COLAB_SEED,
      createdByUserId: GOV_ADMIN_USER_ID,
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

  it('pesquisa "Esteira & atividade" (q com &): esteira/OS à esquerda, nome da atividade à direita', async () => {
    await linkAppUserToCollaborator(pool, MARIA_APP_USER_ID, COLAB_SEED)
    const tag = randomUUID().replace(/-/g, '').slice(0, 6)
    const code = `7070${tag}`
    const mk = async (nome: string, stepTitles: string[], osCode: string) => {
      const body = minimalConveyorBody(nome)
      body.options[0]!.titulo = 'Bancos dianteiros'
      body.options[0]!.areas[0]!.titulo = 'Tapeçaria'
      body.options[0]!.areas[0]!.steps = stepTitles.map((titulo, i) => ({
        titulo,
        orderIndex: i + 1,
        plannedMinutes: 30,
        sourceOrigin: 'manual' as const,
        required: true,
      }))
      const created = await serviceCreateConveyor(pool, body)
      await setConveyorProductionStatusForIntegration(pool, created.id)
      await pool.query(`UPDATE conveyors SET code = $2 WHERE id = $1::uuid`, [created.id, osCode])
      const steps = await pool.query<{ id: string }>(
        `SELECT id::text FROM conveyor_nodes
         WHERE conveyor_id = $1::uuid AND node_type = 'STEP' AND deleted_at IS NULL`,
        [created.id],
      )
      for (const st of steps.rows) {
        await serviceCreateConveyorNodeAssignee(pool, {
          conveyorId: created.id,
          conveyorNodeId: st.id,
          collaboratorId: COLAB_SEED,
          isPrimary: true,
        })
        await seedPublishedPlanItem(pool, {
          conveyorId: created.id,
          stepNodeId: st.id,
          collaboratorId: COLAB_SEED,
          createdByUserId: GOV_ADMIN_USER_ID,
        })
      }
      return created.id
    }
    const target = await mk(
      `Esteira ${code}`,
      [
        'corte do tecido XPTO',
        'Costura do tecido XPTO',
        'Revestir banco com tecido XPTO',
        'Revestir banco do couro',
        'Lixar estrutura',
      ],
      code,
    )
    // Outra esteira com atividade "XPTO" — não pode aparecer.
    const other = await mk(`Outra ${tag}`, ['Costura do tecido XPTO'], `9090${tag}`)

    const cookieMaria = await sessionCookieForUser(pool, MARIA_APP_USER_ID, MARIA_EMAIL)
    const search = async (q: string) => {
      const res = await request(app)
        .get(`/api/v1/me/time-entry-candidates?q=${encodeURIComponent(q)}`)
        .set('Cookie', cookieMaria)
      expect(res.status).toBe(200)
      const rows = res.body.data as Array<{ conveyorId: string; stepName: string }>
      expect(rows.some((r) => r.conveyorId === other)).toBe(false)
      return rows
        .filter((r) => r.conveyorId === target)
        .map((r) => r.stepName)
        .sort()
    }

    expect(await search(`${code} & XPTO`)).toEqual(
      ['Costura do tecido XPTO', 'Revestir banco com tecido XPTO', 'corte do tecido XPTO'].sort(),
    )
    expect(await search(`${code} & banco`)).toEqual(
      ['Revestir banco com tecido XPTO', 'Revestir banco do couro'].sort(),
    )
    // Sem diferenciar maiúsculas/acentos e com espaços extras ao redor do &.
    expect(await search(`  ${code}   &   xptó  `)).toHaveLength(3)
    expect(await search(`${code}&BANCO`)).toHaveLength(2)
    // Termo direito casa só o nome da atividade (não a tarefa "Bancos dianteiros").
    expect(await search(`${code} & dianteiros`)).toEqual([])
    // Termo esquerdo sozinho → todas as atividades da esteira.
    expect(await search(`${code} &`)).toHaveLength(5)
    // Sem &, a pesquisa livre segue como antes (nome da esteira contém o código).
    expect(await search(code)).toHaveLength(5)
  })
})
