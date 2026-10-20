/**
 * Hotfix `hotfix-listagem-atividades-tati` — paginação keyset ("Carregar mais") de
 * `GET /me/time-entry-candidates`, `GET /production/me/time-entry-candidates` (Kiosk) e
 * `GET /operational-planning/backlog`, executando as consultas reais em banco isolado.
 *
 * Antes da correção cada origem do apontamento e o backlog eram cortados em LIMIT fixo
 * (50/100) sem continuação: as atividades excedentes ficavam inacessíveis.
 */
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.js'
import { createLogger } from '../plugins/logger.js'
import { closePool, getPool } from '../plugins/db.js'
import { hasDatabaseConnectionInEnv, loadDotenvFiles, loadEnv } from '../config/env.js'
import { hashPassword } from '../shared/password/password.js'
import { encodeKeysetCursor } from '../shared/pagination/keysetCursor.js'
import { mondayOfWeekContaining } from '../modules/operational-planning/operational-planning.week.js'
import { sessionCookieForUser } from './sessionTestCookie.js'
import {
  ensureMariaCollaboratorSeedForIntegration,
  linkAppUserToCollaborator,
  MARIA_APP_USER_EMAIL,
  MARIA_APP_USER_ID,
  MARIA_COLLABORATOR_ID,
  unlinkAppUserCollaborator,
} from './integrationSeedFixtures.js'
import { productionSessionCookie, seedProductionPinForCollaborator } from './productionTestHelpers.js'
import { setConveyorProductionStatusForIntegration } from './integrationConveyorFixtures.js'
import {
  assignStepsToCollaborator,
  createScenarioConveyor,
  seedWeekPlanItems,
  type ScenarioStep,
} from './listingPaginationFixtures.js'

loadDotenvFiles()

const hasDb = hasDatabaseConnectionInEnv(process.env)

const GOV_ADMIN_USER_ID = '55555555-5555-5555-5555-555555555555'
const GOV_ADMIN_EMAIL = 'gov-collab-test@sgp-argos.local'
const ADMIN_ROLE_ID = '11111111-1111-1111-1111-111111111111'

const CANDIDATES_PATH = '/api/v1/me/time-entry-candidates'
const KIOSK_CANDIDATES_PATH = '/api/v1/production/me/time-entry-candidates'
const BACKLOG_PATH = '/api/v1/operational-planning/backlog'

type Candidate = {
  conveyorId: string
  stepNodeId: string
  isAssignedToMe: boolean
  requiresJustification: boolean
  plannedDate?: string | null
  taskTitle?: string
  stepName: string
}
type BacklogItem = { conveyorId: string; activityNodeId: string; taskTitle: string; activityTitle: string }

function todayIsoLocal(): string {
  const t = new Date()
  return [
    t.getFullYear(),
    String(t.getMonth() + 1).padStart(2, '0'),
    String(t.getDate()).padStart(2, '0'),
  ].join('-')
}

function ids(steps: readonly ScenarioStep[]): string[] {
  return steps.map((s) => s.id)
}

describe.skipIf(!hasDb)('Paginação keyset — Apontar horas, Kiosk e backlog (integração)', () => {
  let app: ReturnType<typeof createApp>
  let pool: ReturnType<typeof getPool>
  let mariaCookie: string
  let adminCookie: string
  const today = todayIsoLocal()
  const weekStart = mondayOfWeekContaining(today)

  beforeAll(async () => {
    const env = loadEnv()
    pool = getPool(env)
    app = createApp(pool, createLogger('silent'), env)
    await ensureMariaCollaboratorSeedForIntegration(pool)
    await linkAppUserToCollaborator(pool, MARIA_APP_USER_ID, MARIA_COLLABORATOR_ID)
    await seedProductionPinForCollaborator(pool, MARIA_COLLABORATOR_ID, '2468', true)
    const hash = await hashPassword('CollabGovTest1!')
    await pool.query(
      `INSERT INTO app_users (
          id, email, password_hash, is_active, role_id, must_change_password, password_changed_at
        ) VALUES ($1::uuid, $2, $3, true, $4::uuid, false, now())
        ON CONFLICT (id) DO UPDATE SET role_id = EXCLUDED.role_id, is_active = true, email = EXCLUDED.email`,
      [GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL, hash, ADMIN_ROLE_ID],
    )
    mariaCookie = await sessionCookieForUser(pool, MARIA_APP_USER_ID, MARIA_APP_USER_EMAIL)
    adminCookie = await sessionCookieForUser(pool, GOV_ADMIN_USER_ID, GOV_ADMIN_EMAIL)
    // Plano da semana corrente sob controle de cada teste.
    await seedWeekPlanItems(pool, {
      createdByUserId: MARIA_APP_USER_ID,
      weekStart,
      status: 'PUBLISHED',
      plannedDate: today,
      items: [],
    })
  })

  afterAll(async () => {
    await closePool()
  })

  /** Percorre todas as páginas seguindo `meta.nextCursor` e devolve as páginas recebidas. */
  async function walk<T>(
    path: string,
    cookie: string,
    params: Record<string, string>,
    read: (body: { data: unknown; meta: Record<string, unknown> }) => {
      items: T[]
      nextCursor: string | null
    },
  ): Promise<T[][]> {
    const pages: T[][] = []
    let cursor: string | null = null
    for (let guard = 0; guard < 200; guard++) {
      const qs = new URLSearchParams({ ...params, ...(cursor ? { cursor } : {}) })
      const res = await request(app).get(`${path}?${qs.toString()}`).set('Cookie', cookie)
      expect(res.status, JSON.stringify(res.body)).toBe(200)
      const page = read(res.body)
      pages.push(page.items)
      if (!page.nextCursor) return pages
      cursor = page.nextCursor
    }
    throw new Error('paginação não terminou')
  }

  const readCandidates = (body: { data: unknown; meta: Record<string, unknown> }) => ({
    items: body.data as Candidate[],
    nextCursor: (body.meta.nextCursor as string | null) ?? null,
  })
  const readBacklog = (body: { data: unknown }) => {
    const d = body.data as { items: BacklogItem[]; meta: { nextCursor: string | null; limit: number } }
    return { items: d.items, nextCursor: d.meta.nextCursor }
  }

  function walkCandidates(params: Record<string, string>, cookie = mariaCookie, path = CANDIDATES_PATH) {
    return walk<Candidate>(path, cookie, params, readCandidates)
  }
  function walkBacklog(params: Record<string, string>) {
    return walk<BacklogItem>(BACKLOG_PATH, adminCookie, params, readBacklog)
  }

  it('cenário Tati (fora da alocação, pesquisa pela OS): corte original em 50 = Ombreira; com "Carregar mais" chega a Revestir Painel', async () => {
    const tag = `T${randomUUID().slice(0, 6)}`
    const os = await createScenarioConveyor(pool, { name: `OS 7467 ${tag}` })
    expect(os.steps).toHaveLength(126)
    expect(os.steps[49]?.taskName).toBe('Ombreira')
    expect(os.steps[49]?.taskNumber).toBe(11)
    expect(os.steps.at(-1)?.taskName).toBe('Revestir Painel')
    expect(os.steps.at(-1)?.taskNumber).toBe(21)

    const pages = await walkCandidates({ q: tag, includeUnassigned: 'true' })
    expect(pages.map((p) => p.length)).toEqual([50, 50, 26])
    // Página 1 termina exatamente onde a lista antiga parava; a 51ª abre a página 2.
    expect(pages[0]?.at(-1)?.stepNodeId).toBe(os.steps[49]?.id)
    expect(pages[1]?.[0]?.stepNodeId).toBe(os.steps[50]?.id)
    expect(pages[1]?.[0]?.taskTitle).toBe('Forros de portas')
    const all = pages.flat()
    expect(all.map((c) => c.stepNodeId)).toEqual(ids(os.steps))
    expect(all.at(-1)?.taskTitle).toBe('Revestir Painel')
    for (const c of all) {
      expect(c.isAssignedToMe).toBe(false)
      expect(c.requiresJustification).toBe(true)
    }
  })

  it('mais de 50 em cada origem com sobreposição: conjunto exato, sem duplicidade e com a origem de maior precedência', async () => {
    const tag = `P${randomUUID().slice(0, 6)}`
    const x = await createScenarioConveyor(pool, { name: `OS 9001 ${tag}` })
    const y = await createScenarioConveyor(pool, {
      name: `OS 9002 ${tag}`,
      tasks: [{ name: 'Outra OS', areas: [20, 20, 20] }],
    })
    const assigned = x.steps.slice(0, 80)
    const planned = x.steps.slice(39) // 40..126 — 41 em comum com a alocação
    await assignStepsToCollaborator(pool, x.conveyorId, ids(assigned), MARIA_COLLABORATOR_ID)
    await seedWeekPlanItems(pool, {
      createdByUserId: MARIA_APP_USER_ID,
      weekStart,
      status: 'PUBLISHED',
      plannedDate: today,
      items: planned.map((s) => ({
        conveyorId: x.conveyorId,
        activityNodeId: s.id,
        collaboratorId: MARIA_COLLABORATOR_ID,
      })),
    })

    try {
      const pages = await walkCandidates({ q: tag, includeUnassigned: 'true' })
      const all = pages.flat()
      // 80 alocadas (origem 1) → 46 só do plano (origem 2) → 60 fora da alocação (origem 3).
      const expected = [...ids(assigned), ...ids(x.steps.slice(80)), ...ids(y.steps)]
      expect(all.map((c) => c.stepNodeId)).toEqual(expected)
      expect(new Set(all.map((c) => c.stepNodeId)).size).toBe(all.length)
      expect(pages.map((p) => p.length)).toEqual([50, 50, 50, 36])
      const byId = new Map(all.map((c) => [c.stepNodeId, c]))
      for (const s of assigned) {
        expect(byId.get(s.id)?.isAssignedToMe).toBe(true)
        expect(byId.get(s.id)?.plannedDate ?? null).toBeNull() // alocação vence o plano
      }
      for (const s of x.steps.slice(80)) {
        expect(byId.get(s.id)?.isAssignedToMe).toBe(true)
        expect(byId.get(s.id)?.plannedDate).toBe(today)
      }
      for (const s of y.steps) {
        expect(byId.get(s.id)?.requiresJustification).toBe(true)
      }

      // Sem "Buscar outras atividades": só alocação + plano, também paginados até o fim.
      const own = (await walkCandidates({ q: tag })).flat()
      expect(own.map((c) => c.stepNodeId)).toEqual(ids(x.steps))
    } finally {
      await seedWeekPlanItems(pool, {
        createdByUserId: MARIA_APP_USER_ID,
        weekStart,
        status: 'PUBLISHED',
        plannedDate: today,
        items: [],
      })
    }
  })

  it('Kiosk ("Outra atividade") usa o mesmo contrato e percorre todas as páginas', async () => {
    const tag = `K${randomUUID().slice(0, 6)}`
    const os = await createScenarioConveyor(pool, { name: `OS 7467 ${tag}` })
    const kioskCookie = productionSessionCookie(MARIA_COLLABORATOR_ID)
    const pages = await walkCandidates(
      { q: tag, includeUnassigned: 'true', limit: '20' },
      kioskCookie,
      KIOSK_CANDIDATES_PATH,
    )
    expect(pages[0]).toHaveLength(20)
    expect(pages.flat().map((c) => c.stepNodeId)).toEqual(ids(os.steps))
    // Pesquisa "OS & atividade" continua no backend e pagina sobre o resultado filtrado.
    const scoped = (
      await walkCandidates(
        { q: `${tag} & revestir`, includeUnassigned: 'true', limit: '3' },
        kioskCookie,
        KIOSK_CANDIDATES_PATH,
      )
    ).flat()
    expect(scoped.map((c) => c.stepNodeId)).toEqual(
      ids(os.steps.filter((s) => s.taskName === 'Revestir Painel')),
    )
  })

  it('fronteira do cursor: limit, limit+1 e 2×limit+1 elegíveis, inclusive com deduplicação perto da fronteira', async () => {
    const limit = 5
    for (const total of [limit, limit + 1, 2 * limit + 1]) {
      const tag = `F${total}${randomUUID().slice(0, 5)}`
      const os = await createScenarioConveyor(pool, {
        name: `OS ${tag}`,
        tasks: [{ name: 'Única', areas: [total] }],
      })
      const pages = await walkCandidates({ q: tag, includeUnassigned: 'true', limit: String(limit) })
      expect(pages.flat().map((c) => c.stepNodeId)).toEqual(ids(os.steps))
      const expectedSizes =
        total === limit ? [limit] : total === limit + 1 ? [limit, 1] : [limit, limit, 1]
      expect(pages.map((p) => p.length)).toEqual(expectedSizes)
      if (total > limit) expect(pages[1]?.[0]?.stepNodeId).toBe(os.steps[limit]?.id)

      const bl = await walkBacklog({ q: tag, limit: String(limit) })
      expect(bl.flat().map((b) => b.activityNodeId)).toEqual(ids(os.steps))
      expect(bl.map((p) => p.length)).toEqual(expectedSizes)
    }

    // Deduplicação: 5 alocadas que também estão no plano (5 linhas descartadas) + 1 fora.
    const tag = `D${randomUUID().slice(0, 6)}`
    const x = await createScenarioConveyor(pool, { name: `OS ${tag} A`, tasks: [{ name: 'X', areas: [5] }] })
    const y = await createScenarioConveyor(pool, { name: `OS ${tag} B`, tasks: [{ name: 'Y', areas: [1] }] })
    await assignStepsToCollaborator(pool, x.conveyorId, ids(x.steps), MARIA_COLLABORATOR_ID)
    await seedWeekPlanItems(pool, {
      createdByUserId: MARIA_APP_USER_ID,
      weekStart,
      status: 'PUBLISHED',
      plannedDate: today,
      items: x.steps.map((s) => ({
        conveyorId: x.conveyorId,
        activityNodeId: s.id,
        collaboratorId: MARIA_COLLABORATOR_ID,
      })),
    })
    try {
      const pages = await walkCandidates({ q: tag, includeUnassigned: 'true', limit: String(limit) })
      expect(pages.map((p) => p.map((c) => c.stepNodeId))).toEqual([ids(x.steps), ids(y.steps)])
    } finally {
      await seedWeekPlanItems(pool, {
        createdByUserId: MARIA_APP_USER_ID,
        weekStart,
        status: 'PUBLISHED',
        plannedDate: today,
        items: [],
      })
    }
  })

  it('empates de ordenação (mesmo nome e mesmos order_index em duas esteiras): ordem determinística por id, sem ausência nem repetição', async () => {
    const tag = `E${randomUUID().slice(0, 6)}`
    const tasks = [{ name: 'Empate', areas: [4, 3] }]
    const a = await createScenarioConveyor(pool, { name: `OS ${tag}`, status: 'A_INICIAR', tasks })
    const b = await createScenarioConveyor(pool, { name: `OS ${tag}`, status: 'A_INICIAR', tasks })
    const expectedSet = new Set([...ids(a.steps), ...ids(b.steps)])

    const single = (await walkBacklog({ q: tag, limit: '100' })).flat().map((x) => x.activityNodeId)
    const paged = (await walkBacklog({ q: tag, limit: '3' })).flat().map((x) => x.activityNodeId)
    expect(new Set(single)).toEqual(expectedSet)
    expect(paged).toEqual(single)

    const cSingle = (await walkCandidates({ q: tag, includeUnassigned: 'true' })).flat().map((x) => x.stepNodeId)
    const cPaged = (await walkCandidates({ q: tag, includeUnassigned: 'true', limit: '3' }))
      .flat()
      .map((x) => x.stepNodeId)
    expect(new Set(cSingle)).toEqual(expectedSet)
    expect(cPaged).toEqual(cSingle)
  })

  it('backlog Tati: outra esteira antes na ordem → corte original em 100 = Montar bancos traseiros; páginas seguintes completam a OS', async () => {
    const tag = `B${randomUUID().slice(0, 6)}`
    const before = await createScenarioConveyor(pool, {
      name: `OS 7466 ${tag}`,
      status: 'A_INICIAR',
      tasks: [{ name: 'Outra esteira', areas: [10, 10, 7] }],
    })
    const os = await createScenarioConveyor(pool, { name: `OS 7467 ${tag}`, status: 'A_INICIAR' })

    const pages = await walkBacklog({ q: tag })
    expect(pages.map((p) => p.length)).toEqual([100, 53])
    expect(pages[0]?.at(-1)?.activityNodeId).toBe(os.steps[72]?.id)
    expect(pages[0]?.at(-1)?.taskTitle).toBe('Montar bancos traseiros')
    expect(pages[1]?.[0]?.taskTitle).toBe('Montar bancos dianteiros')
    expect(pages.flat().map((b) => b.activityNodeId)).toEqual([...ids(before.steps), ...ids(os.steps)])
    expect(pages.flat().at(-1)?.taskTitle).toBe('Revestir Painel')
  })

  it('backlog: item incluído em plano entre páginas não faz pular atividade (keyset, não offset)', async () => {
    const tag = `M${randomUUID().slice(0, 6)}`
    const os = await createScenarioConveyor(pool, {
      name: `OS ${tag}`,
      status: 'A_INICIAR',
      tasks: [{ name: 'Mudança', areas: [12] }],
    })
    const first = await request(app)
      .get(`${BACKLOG_PATH}?${new URLSearchParams({ q: tag, limit: '5' }).toString()}`)
      .set('Cookie', adminCookie)
    expect(first.status).toBe(200)
    const page1 = readBacklog(first.body)
    expect(page1.items.map((b) => b.activityNodeId)).toEqual(ids(os.steps.slice(0, 5)))

    // Atividade da página 1 vai para um plano (sai do backlog) antes de "Carregar mais".
    const draftWeek = mondayOfWeekContaining('2031-01-08')
    await seedWeekPlanItems(pool, {
      createdByUserId: MARIA_APP_USER_ID,
      weekStart: draftWeek,
      status: 'DRAFT',
      plannedDate: '2031-01-08',
      items: [{ conveyorId: os.conveyorId, activityNodeId: os.steps[1]!.id, collaboratorId: MARIA_COLLABORATOR_ID }],
    })
    try {
      const qs = new URLSearchParams({ q: tag, limit: '5', cursor: page1.nextCursor ?? '' })
      const second = await request(app).get(`${BACKLOG_PATH}?${qs.toString()}`).set('Cookie', adminCookie)
      expect(second.status).toBe(200)
      expect(readBacklog(second.body).items.map((b) => b.activityNodeId)).toEqual(
        ids(os.steps.slice(5, 10)),
      )
    } finally {
      await pool.query(
        `DELETE FROM operational_work_plan_items WHERE conveyor_id = $1::uuid`,
        [os.conveyorId],
      )
    }
  })

  it('exclusões legítimas continuam: concluída, dispensada, inativa, esteira cancelada/finalizada e itens em plano', async () => {
    const tag = `X${randomUUID().slice(0, 6)}`
    const os = await createScenarioConveyor(pool, {
      name: `OS ${tag}`,
      status: 'A_INICIAR',
      tasks: [{ name: 'Regras', areas: [8] }],
    })
    const [done, aborted, inactive, planned, ...rest] = os.steps
    await pool.query(`UPDATE conveyor_nodes SET operational_status = 'COMPLETED' WHERE id = $1::uuid`, [done!.id])
    await pool.query(`UPDATE conveyor_nodes SET operational_status = 'ABORTED' WHERE id = $1::uuid`, [aborted!.id])
    await pool.query(`UPDATE conveyor_nodes SET is_active = FALSE WHERE id = $1::uuid`, [inactive!.id])
    const draftWeek = mondayOfWeekContaining('2031-02-05')
    await seedWeekPlanItems(pool, {
      createdByUserId: MARIA_APP_USER_ID,
      weekStart: draftWeek,
      status: 'DRAFT',
      plannedDate: '2031-02-05',
      items: [{ conveyorId: os.conveyorId, activityNodeId: planned!.id, collaboratorId: MARIA_COLLABORATOR_ID }],
    })
    const cancelled = await createScenarioConveyor(pool, {
      name: `OS ${tag} cancelada`,
      status: 'CANCELADA',
      tasks: [{ name: 'Cancelada', areas: [3] }],
    })
    const finished = await createScenarioConveyor(pool, {
      name: `OS ${tag} finalizada`,
      status: 'FINALIZADA',
      tasks: [{ name: 'Finalizada', areas: [3] }],
    })
    try {
      const candidates = (await walkCandidates({ q: tag, includeUnassigned: 'true', limit: '2' })).flat()
      // Apontamento: item em plano semanal futuro continua apontável (regra atual); as demais saem.
      expect(candidates.map((c) => c.stepNodeId)).toEqual([planned!.id, ...ids(rest)])
      const backlog = (await walkBacklog({ q: tag, limit: '2' })).flat()
      // Backlog: STEP já em plano semanal (DRAFT/PUBLISHED) também sai (regra atual). ABORTED
      // permanece elegível no backlog atual (só COMPLETED é excluído) — regra preexistente.
      expect(backlog.map((b) => b.activityNodeId)).toEqual([aborted!.id, ...ids(rest)])
      const all = [...candidates.map((c) => c.conveyorId), ...backlog.map((b) => b.conveyorId)]
      expect(all).not.toContain(cancelled.conveyorId)
      expect(all).not.toContain(finished.conveyorId)
    } finally {
      await pool.query(`DELETE FROM operational_work_plan_items WHERE conveyor_id = $1::uuid`, [os.conveyorId])
    }
  })

  it('sem "Buscar outras atividades" ou com termo < 2 caracteres, a origem fora da alocação não entra', async () => {
    const tag = `U${randomUUID().slice(0, 6)}`
    await createScenarioConveyor(pool, { name: `OS ${tag}`, tasks: [{ name: 'U', areas: [3] }] })
    const res = await request(app)
      .get(`${CANDIDATES_PATH}?${new URLSearchParams({ q: tag }).toString()}`)
      .set('Cookie', mariaCookie)
    expect(res.status).toBe(200)
    expect(res.body.data).toEqual([])
    expect(res.body.meta.nextCursor).toBeNull()
  })

  it('usuário sem colaborador vinculado: lista vazia, motivo e sem continuação', async () => {
    await unlinkAppUserCollaborator(pool, MARIA_APP_USER_ID)
    try {
      const cookie = await sessionCookieForUser(pool, MARIA_APP_USER_ID, MARIA_APP_USER_EMAIL)
      const res = await request(app).get(CANDIDATES_PATH).set('Cookie', cookie)
      expect(res.status).toBe(200)
      expect(res.body.data).toEqual([])
      expect(res.body.meta.nextCursor).toBeNull()
      expect(String(res.body.meta.unavailableReason)).toContain('colaborador')
    } finally {
      await linkAppUserToCollaborator(pool, MARIA_APP_USER_ID, MARIA_COLLABORATOR_ID)
    }
  })

  it('cursor inválido, adulterado ou de outro endpoint → 400', async () => {
    const backlogCursor = encodeKeysetCursor('operational-planning-backlog', [
      'OS',
      1,
      1,
      1,
      randomUUID(),
    ])
    const candidateCursor = encodeKeysetCursor('time-entry-candidates', [
      0,
      0,
      '1900-01-01',
      0,
      1,
      1,
      1,
      randomUUID(),
    ])
    const tampered = encodeKeysetCursor('time-entry-candidates', [0, 0, '1900-01-01', 0, 1, 1, 'x', 'y'])
    const notJson = Buffer.from('não é json', 'utf8').toString('base64url')
    const kioskCookie = productionSessionCookie(MARIA_COLLABORATOR_ID)

    for (const cursor of ['!!!', notJson, tampered, backlogCursor]) {
      for (const [path, cookie] of [
        [CANDIDATES_PATH, mariaCookie],
        [KIOSK_CANDIDATES_PATH, kioskCookie],
      ] as const) {
        const res = await request(app)
          .get(`${path}?${new URLSearchParams({ cursor }).toString()}`)
          .set('Cookie', cookie)
        expect(res.status, `${path} ${cursor}`).toBe(400)
        expect(String(res.body.error?.message)).toContain('Cursor de paginação inválido')
      }
    }
    for (const cursor of ['!!!', notJson, candidateCursor]) {
      const res = await request(app)
        .get(`${BACKLOG_PATH}?${new URLSearchParams({ cursor }).toString()}`)
        .set('Cookie', adminCookie)
      expect(res.status, cursor).toBe(400)
    }
    // Limites máximos dos schemas permanecem.
    const over = await request(app).get(`${CANDIDATES_PATH}?limit=100`).set('Cookie', mariaCookie)
    expect(over.status).toBe(422)
    const overBacklog = await request(app).get(`${BACKLOG_PATH}?limit=101`).set('Cookie', adminCookie)
    expect(overBacklog.status).toBe(422)
  })

  it('meta do backlog mantém `limit` e acrescenta `nextCursor`', async () => {
    const tag = `L${randomUUID().slice(0, 6)}`
    const os = await createScenarioConveyor(pool, { name: `OS ${tag}`, tasks: [{ name: 'L', areas: [2] }] })
    await setConveyorProductionStatusForIntegration(pool, os.conveyorId, 'A_INICIAR')
    const res = await request(app)
      .get(`${BACKLOG_PATH}?${new URLSearchParams({ q: tag }).toString()}`)
      .set('Cookie', adminCookie)
    expect(res.status).toBe(200)
    expect(res.body.data.meta).toEqual({ limit: 100, nextCursor: null })
  })
})
