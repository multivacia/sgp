import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.js'
import { createLogger } from '../plugins/logger.js'
import { closePool, getPool } from '../plugins/db.js'
import { hasDatabaseConnectionInEnv, loadDotenvFiles, loadEnv } from '../config/env.js'
import { serviceCreateConveyor } from '../modules/conveyors/conveyors.service.js'
import type { PostConveyorBody } from '../modules/conveyors/conveyors.schemas.js'
import { serviceCreateConveyorNodeAssignee } from '../modules/conveyors/conveyorAssignments.service.js'
import { mondayOfWeekContaining } from '../modules/operational-planning/operational-planning.week.js'
import { hashPassword } from '../shared/password/password.js'
import { ErrorCodes } from '../shared/errors/errorCodes.js'
import { operationalToday } from '../shared/operationalWorkDate.js'
import { sessionCookieForUser } from './sessionTestCookie.js'
import { ensureMariaCollaboratorSeedForIntegration } from './integrationSeedFixtures.js'
import { setConveyorProductionStatusForIntegration } from './integrationConveyorFixtures.js'
import { productionSessionCookie, seedProductionPinForCollaborator } from './productionTestHelpers.js'
import { cleanupSeededPlanItems, seedPublishedPlanItem } from './plannedActivityTestHelpers.js'

/**
 * TASK apontamento-somente-planejado — regra aprovada em 08/10/2026.
 * Cada cenário usa colaboradores e esteiras próprios para não depender de dados de outros testes.
 */

loadDotenvFiles()
const hasDb = hasDatabaseConnectionInEnv(process.env)

const COLAB_ROLE_ID = '22222222-2222-2222-2222-222222222222'
const ADMIN_ROLE_ID = '11111111-1111-1111-1111-111111111111'
const SEED_SECTOR_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const ON_BEHALF_PERMISSION = 'time_entries.create_on_behalf'

function shiftIsoDate(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y!, m! - 1, d! + days)).toISOString().slice(0, 10)
}

function oneStepConveyor(nome: string): PostConveyorBody {
  return {
    dados: {
      nome,
      cliente: 'Cliente ASP',
      veiculo: 'Veículo ASP',
      modeloVersao: '',
      placa: '',
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
        titulo: 'Opção ASP',
        orderIndex: 1,
        sourceOrigin: 'manual',
        areas: [
          {
            titulo: 'Área ASP',
            orderIndex: 1,
            sourceOrigin: 'manual',
            steps: [
              {
                titulo: `Etapa ${nome}`,
                orderIndex: 1,
                plannedMinutes: 600,
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

describe.skipIf(!hasDb)('apontamento somente em atividades planejadas (integração)', () => {
  let app: ReturnType<typeof createApp>
  let pool: ReturnType<typeof getPool>
  let adminUserId: string
  let adminCookie: string
  let today: string
  const tag = randomUUID().slice(0, 6)

  async function newCollaborator(label: string): Promise<{ collaboratorId: string; cookie: string }> {
    const collaboratorId = randomUUID()
    const userId = randomUUID()
    const email = `asp-${label}-${collaboratorId.slice(0, 8)}@sgp.local`
    await pool.query(
      `INSERT INTO collaborators (id, code, full_name, email, sector_id, role_id, status, is_active)
       VALUES ($1::uuid, $2, $3, $4, $5::uuid, $6::uuid, 'ACTIVE', true)`,
      [collaboratorId, `ASP-${collaboratorId.slice(0, 8)}`, `ASP ${label} ${collaboratorId.slice(0, 8)}`, email, SEED_SECTOR_ID, COLAB_ROLE_ID],
    )
    await pool.query(
      `INSERT INTO app_users (
         id, email, password_hash, is_active, role_id, must_change_password, password_changed_at,
         collaborator_id
       ) VALUES ($1::uuid, $2, $3, true, $4::uuid, false, now(), $5::uuid)`,
      [userId, email, await hashPassword('AspTeste1!'), COLAB_ROLE_ID, collaboratorId],
    )
    await seedProductionPinForCollaborator(pool, collaboratorId, '2468', true)
    return { collaboratorId, cookie: await sessionCookieForUser(pool, userId, email) }
  }

  async function newStep(label: string): Promise<{ conveyorId: string; stepId: string }> {
    const conv = await serviceCreateConveyor(pool, oneStepConveyor(`ASP ${label} ${tag}`))
    await setConveyorProductionStatusForIntegration(pool, conv.id)
    const r = await pool.query<{ id: string }>(
      `SELECT id::text FROM conveyor_nodes
       WHERE conveyor_id = $1::uuid AND node_type = 'STEP' AND deleted_at IS NULL`,
      [conv.id],
    )
    return { conveyorId: conv.id, stepId: r.rows[0]!.id }
  }

  async function plan(
    s: { conveyorId: string; stepId: string },
    collaboratorId: string,
    plannedDate: string,
    plannedMinutes: number | null = null,
  ) {
    return seedPublishedPlanItem(pool, {
      conveyorId: s.conveyorId,
      stepNodeId: s.stepId,
      collaboratorId,
      createdByUserId: adminUserId,
      plannedDate,
      plannedMinutes,
    })
  }

  async function justificationId(): Promise<string> {
    const r = await pool.query<{ id: string }>(
      `SELECT id::text FROM operational_time_entry_justifications
       WHERE is_active = true AND COALESCE(requires_complement, false) = false
       ORDER BY sort_order LIMIT 1`,
    )
    return r.rows[0]!.id
  }

  beforeAll(async () => {
    const env = loadEnv()
    pool = getPool(env)
    app = createApp(pool, createLogger('silent'), env)
    await ensureMariaCollaboratorSeedForIntegration(pool)
    today = operationalToday()

    adminUserId = randomUUID()
    const adminEmail = `asp-admin-${adminUserId.slice(0, 8)}@sgp.local`
    await pool.query(
      `INSERT INTO app_users (
         id, email, password_hash, is_active, role_id, must_change_password, password_changed_at
       ) VALUES ($1::uuid, $2, $3, true, $4::uuid, false, now())`,
      [adminUserId, adminEmail, await hashPassword('AspAdmin1!'), ADMIN_ROLE_ID],
    )
    await pool.query(
      `INSERT INTO app_permissions (code, name)
       SELECT $1::varchar, 'Apontamentos: registar em nome de colaborador'
       WHERE NOT EXISTS (SELECT 1 FROM app_permissions WHERE code = $1::varchar)`,
      [ON_BEHALF_PERMISSION],
    )
    await pool.query(
      `INSERT INTO app_role_permissions (role_id, permission_id)
       SELECT $1::uuid, p.id FROM app_permissions p
       WHERE p.code = $2
         AND NOT EXISTS (
           SELECT 1 FROM app_role_permissions rp
           WHERE rp.role_id = $1::uuid AND rp.permission_id = p.id
         )`,
      [ADMIN_ROLE_ID, ON_BEHALF_PERMISSION],
    )
    adminCookie = await sessionCookieForUser(pool, adminUserId, adminEmail)
  })

  afterAll(async () => {
    await cleanupSeededPlanItems(pool)
    await closePool()
  })

  it('web e Kiosk listam o mesmo conjunto: atrasada de semana anterior, hoje, próxima semana e próximo mês', async () => {
    const ana = await newCollaborator('lista')
    const thisMonday = mondayOfWeekContaining(today)
    const overdue = await newStep('atrasada')
    const todayStep = await newStep('hoje')
    const nextWeek = await newStep('prox-semana')
    const nextMonth = await newStep('prox-mes')
    const completed = await newStep('concluida')
    const aborted = await newStep('abortada')
    const structuralOnly = await newStep('so-alocacao')
    const moved = await newStep('movida')

    await plan(overdue, ana.collaboratorId, shiftIsoDate(thisMonday, -5))
    await plan(todayStep, ana.collaboratorId, today)
    await plan(nextWeek, ana.collaboratorId, shiftIsoDate(thisMonday, 9))
    await plan(nextMonth, ana.collaboratorId, shiftIsoDate(today, 35))
    await plan(completed, ana.collaboratorId, today)
    await plan(aborted, ana.collaboratorId, today)
    await pool.query(`UPDATE conveyor_nodes SET operational_status = 'COMPLETED' WHERE id = $1::uuid`, [completed.stepId])
    await pool.query(`UPDATE conveyor_nodes SET operational_status = 'ABORTED' WHERE id = $1::uuid`, [aborted.stepId])
    await serviceCreateConveyorNodeAssignee(pool, {
      conveyorId: structuralOnly.conveyorId,
      conveyorNodeId: structuralOnly.stepId,
      collaboratorId: ana.collaboratorId,
      isPrimary: true,
    })
    const movedItem = await plan(moved, ana.collaboratorId, today)
    await pool.query(`UPDATE operational_work_plan_items SET status = 'MOVED' WHERE id = $1::uuid`, [movedItem.itemId])

    const expected = [overdue, todayStep, nextWeek, nextMonth].map((s) => s.stepId).sort()

    const web = await request(app).get('/api/v1/me/time-entry-candidates').set('Cookie', ana.cookie)
    expect(web.status).toBe(200)
    const webSteps = (web.body.data as Array<{ stepNodeId: string }>).map((i) => i.stepNodeId).sort()

    const kiosk = await request(app)
      .get('/api/v1/production/me/work-queue')
      .set('Cookie', productionSessionCookie(ana.collaboratorId))
    expect(kiosk.status).toBe(200)
    const kioskItems = (kiosk.body.data as { items: Array<{ activityNodeId: string; plannedDate: string }> }).items
    const kioskSteps = kioskItems.map((i) => i.activityNodeId).sort()

    expect(webSteps).toEqual(expected)
    expect(kioskSteps).toEqual(expected)
    // Ordem do Kiosk: atrasadas, hoje, futuras.
    expect(kioskItems.map((i) => i.activityNodeId)).toEqual([
      overdue.stepId,
      todayStep.stepId,
      nextWeek.stepId,
      nextMonth.stepId,
    ])
  })

  it('pesquisa de outras atividades: traz planejadas para outros e nunca as não planejadas', async () => {
    const ana = await newCollaborator('pesq-ana')
    const bia = await newCollaborator('pesq-bia')
    const ofBia = await newStep(`pesq-bia`)
    const unplanned = await newStep(`pesq-nada`)
    await plan(ofBia, bia.collaboratorId, today)

    const res = await request(app)
      .get('/api/v1/me/time-entry-candidates')
      .set('Cookie', ana.cookie)
      .query({ q: `ASP pesq`, includeUnassigned: 'true', limit: 50 })
    expect(res.status).toBe(200)
    const items = res.body.data as Array<{ stepNodeId: string; isAssignedToMe: boolean; requiresJustification: boolean }>
    const found = items.find((i) => i.stepNodeId === ofBia.stepId)
    expect(found?.isAssignedToMe).toBe(false)
    expect(found?.requiresJustification).toBe(true)
    expect(items.some((i) => i.stepNodeId === unplanned.stepId)).toBe(false)

    const short = await request(app)
      .get('/api/v1/me/time-entry-candidates')
      .set('Cookie', ana.cookie)
      .query({ q: 'A', includeUnassigned: 'true', limit: 50 })
    expect((short.body.data as Array<{ stepNodeId: string }>).some((i) => i.stepNodeId === ofBia.stepId)).toBe(false)
  })

  it('gravação: planejada para mim (futura) aceita sem exceção; de outro exige justificativa; não planejada é recusada, inclusive para o gestor', async () => {
    const ana = await newCollaborator('grav-ana')
    const bia = await newCollaborator('grav-bia')
    const mineFuture = await newStep('grav-futura')
    const ofBia = await newStep('grav-bia')
    const unplanned = await newStep('grav-nada')
    await plan(mineFuture, ana.collaboratorId, shiftIsoDate(today, 21))
    await plan(ofBia, bia.collaboratorId, today)
    await serviceCreateConveyorNodeAssignee(pool, {
      conveyorId: unplanned.conveyorId,
      conveyorNodeId: unplanned.stepId,
      collaboratorId: ana.collaboratorId,
      isPrimary: true,
    })
    const jid = await justificationId()
    const path = (s: { conveyorId: string; stepId: string }) =>
      `/api/v1/conveyors/${s.conveyorId}/steps/${s.stepId}/time-entries`

    const ok = await request(app).post(path(mineFuture)).set('Cookie', ana.cookie).send({ minutes: 15 })
    expect(ok.status, JSON.stringify(ok.body)).toBe(201)
    expect(ok.body.data.entryOrigin).toBe('ASSIGNED')
    expect(ok.body.data.conveyorNodeAssigneeId).toBeTruthy()

    const noJust = await request(app).post(path(ofBia)).set('Cookie', ana.cookie).send({ minutes: 15 })
    expect(noJust.status).toBe(422)
    expect(noJust.body.error.code).toBe(ErrorCodes.TIME_ENTRY_UNASSIGNED_REQUIRES_JUSTIFICATION)

    const withJust = await request(app)
      .post(path(ofBia))
      .set('Cookie', ana.cookie)
      .send({ minutes: 15, exceptionJustificationId: jid })
    expect(withJust.status, JSON.stringify(withJust.body)).toBe(201)
    expect(withJust.body.data.entryOrigin).toBe('UNASSIGNED_EXCEPTION')

    const refused = await request(app)
      .post(path(unplanned))
      .set('Cookie', ana.cookie)
      .send({ minutes: 15, exceptionJustificationId: jid })
    expect(refused.status).toBe(422)
    expect(refused.body.error.code).toBe(ErrorCodes.TIME_ENTRY_NOT_PLANNED)

    const kioskRefused = await request(app)
      .post('/api/v1/production/time-entries')
      .set('Cookie', productionSessionCookie(ana.collaboratorId))
      .send({ conveyorId: unplanned.conveyorId, stepNodeId: unplanned.stepId, minutes: 15 })
    expect(kioskRefused.status).toBe(422)
    expect(kioskRefused.body.error.code).toBe(ErrorCodes.TIME_ENTRY_NOT_PLANNED)

    const onBehalf = await request(app)
      .post(`${path(unplanned)}/on-behalf`)
      .set('Cookie', adminCookie)
      .send({ targetCollaboratorId: ana.collaboratorId, minutes: 15, reason: 'Teste de recusa' })
    expect(onBehalf.status).toBe(422)
    expect(onBehalf.body.error.code).toBe(ErrorCodes.TIME_ENTRY_NOT_PLANNED)
  })

  it('excesso na web: previsto e realizado do próprio colaborador; atividade de outro não pede justificativa de excesso', async () => {
    const joao = await newCollaborator('exc-joao')
    const maria = await newCollaborator('exc-maria')
    const shared = await newStep('exc-compartilhada')
    // Um item por atividade por plano semanal (índice único): Maria fica na semana seguinte.
    await plan(shared, joao.collaboratorId, today, 60)
    await plan(shared, maria.collaboratorId, shiftIsoDate(today, 7), 60)
    const path = `/api/v1/conveyors/${shared.conveyorId}/steps/${shared.stepId}/time-entries`
    const jid = await justificationId()

    // Maria aponta os 60 dela; João aponta 30 → dentro do previsto dele, não exige.
    expect((await request(app).post(path).set('Cookie', maria.cookie).send({ minutes: 60 })).status).toBe(201)
    const joao30 = await request(app).post(path).set('Cookie', joao.cookie).send({ minutes: 30 })
    expect(joao30.status, JSON.stringify(joao30.body)).toBe(201)

    // João passa do previsto dele (30 + 40 > 60) → exige justificativa.
    const joao40 = await request(app).post(path).set('Cookie', joao.cookie).send({ minutes: 40 })
    expect(joao40.status).toBe(422)
    expect(joao40.body.error.code).toBe(ErrorCodes.TIME_ENTRY_EXCEEDED_PLANNED_REQUIRES_JUSTIFICATION)
    const joao40Just = await request(app)
      .post(path)
      .set('Cookie', joao.cookie)
      .send({ minutes: 40, justificationId: jid })
    expect(joao40Just.status, JSON.stringify(joao40Just.body)).toBe(201)

    // Carla aponta na atividade de outros com justificativa de exceção: não pede a de excesso.
    const carla = await newCollaborator('exc-carla')
    const carla500 = await request(app)
      .post(path)
      .set('Cookie', carla.cookie)
      .send({ minutes: 500, exceptionJustificationId: jid })
    expect(carla500.status, JSON.stringify(carla500.body)).toBe(201)
  })

  it('Kiosk: previsto soma todos os dias do colaborador; realizado e pendente só dele', async () => {
    const joao = await newCollaborator('kc-joao')
    const maria = await newCollaborator('kc-maria')
    const s = await newStep('kiosk-cartao')
    // Um item por atividade por plano semanal: João hoje e daqui a 2 semanas; Maria em +1 semana.
    await plan(s, joao.collaboratorId, today, 60)
    await plan(s, joao.collaboratorId, shiftIsoDate(today, 14), 60)
    await plan(s, maria.collaboratorId, shiftIsoDate(today, 7), 60)
    const path = `/api/v1/conveyors/${s.conveyorId}/steps/${s.stepId}/time-entries`
    expect((await request(app).post(path).set('Cookie', maria.cookie).send({ minutes: 50 })).status).toBe(201)
    expect((await request(app).post(path).set('Cookie', joao.cookie).send({ minutes: 20 })).status).toBe(201)

    const kiosk = await request(app)
      .get('/api/v1/production/me/work-queue')
      .set('Cookie', productionSessionCookie(joao.collaboratorId))
    const items = (kiosk.body.data as {
      items: Array<{ activityNodeId: string; plannedMinutes: number; realizedMinutes: number; pendingMinutes: number }>
    }).items.filter((i) => i.activityNodeId === s.stepId)
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ plannedMinutes: 120, realizedMinutes: 20, pendingMinutes: 100 })
  })

  it('Minha fila: sexta passada + segunda: um cartão na sexta (Atrasadas), 120 min; totais da semana com 60; movidos saem; apontado no cartão', async () => {
    const ana = await newCollaborator('fila')
    const thisMonday = mondayOfWeekContaining(today)
    const lastFriday = shiftIsoDate(thisMonday, -3)
    const s = await newStep('fila-sexta-segunda')
    const movedStep = await newStep('fila-movida')
    await plan(s, ana.collaboratorId, lastFriday, 60)
    await plan(s, ana.collaboratorId, thisMonday, 60)
    const moved = await plan(movedStep, ana.collaboratorId, thisMonday, 30)
    await pool.query(`UPDATE operational_work_plan_items SET status = 'MOVED' WHERE id = $1::uuid`, [moved.itemId])
    const path = `/api/v1/conveyors/${s.conveyorId}/steps/${s.stepId}/time-entries`
    expect((await request(app).post(path).set('Cookie', ana.cookie).send({ minutes: 25 })).status).toBe(201)

    const res = await request(app).get(`/api/v1/me/work-queue?date=${thisMonday}`).set('Cookie', ana.cookie)
    expect(res.status).toBe(200)
    const data = res.body.data as {
      items: Array<{ activityNodeId: string; plannedDate: string; plannedMinutes: number; realizedMinutes: number; group: string }>
      summary: { plannedMinutesToday: number }
    }
    const cards = data.items.filter((i) => i.activityNodeId === s.stepId)
    expect(cards).toHaveLength(1)
    expect(cards[0]).toMatchObject({
      plannedDate: lastFriday,
      group: 'overdue',
      plannedMinutes: 120,
      realizedMinutes: 25,
    })
    expect(data.items.some((i) => i.activityNodeId === movedStep.stepId)).toBe(false)
    expect(data.summary.plannedMinutesToday).toBe(60)
  })
})
