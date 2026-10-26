import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, beforeAll, afterAll } from 'vitest'
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
import { listConveyors } from '../modules/conveyors/conveyors.repository.js'
import type { PostConveyorBody } from '../modules/conveyors/conveyors.schemas.js'
import { serviceCreateConveyorNodeAssignee } from '../modules/conveyors/conveyorAssignments.service.js'
import { hashPassword } from '../shared/password/password.js'
import { sessionCookieForUser } from './sessionTestCookie.js'
import { ensureMariaCollaboratorSeedForIntegration } from './integrationSeedFixtures.js'

/**
 * Painel operacional — abas Operacional / Histórico (`GET /api/v1/conveyors?view=`)
 * e arquivar/desarquivar (`POST /api/v1/conveyors/:id/archive|unarchive`).
 */

loadDotenvFiles()

const hasDb = hasDatabaseConnectionInEnv(process.env)

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const MIGRATION_0054 = path.join(__dirname, '../../migrations/0054_conveyors_canceled_at.sql')

type ListItem = {
  id: string
  operationalStatus: string
  panelSection: 'OPERACIONAL' | 'HISTORICO'
  panelSectionManual: boolean
}

function conveyorBody(nome: string): PostConveyorBody {
  return {
    dados: {
      nome,
      cliente: 'Cliente histórico',
      veiculo: 'V',
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

describe.skipIf(!hasDb)('Painel operacional — Operacional / Histórico (integração)', () => {
  let app: ReturnType<typeof createApp>
  let pool: ReturnType<typeof getPool>

  const runTag = `HIST-${randomUUID().slice(0, 8)}`

  const gestorUser = { id: randomUUID(), email: `gestor-hist-${runTag}@sgp-test.local` }
  const colabUser = { id: randomUUID(), email: `colab-hist-${runTag}@sgp-test.local` }
  const collabId = randomUUID()

  /** Início do mês corrente (São Paulo), calculado no próprio banco. */
  let monthStartIso = ''

  async function roleIdByCode(code: string): Promise<string> {
    const r = await pool.query<{ id: string }>(`SELECT id::text AS id FROM app_roles WHERE code = $1`, [
      code,
    ])
    const id = r.rows[0]?.id
    if (!id) throw new Error(`perfil ${code} não encontrado`)
    return id
  }

  async function insertAppUser(
    user: { id: string; email: string },
    roleId: string,
    collaboratorId: string | null,
  ): Promise<void> {
    const hash = await hashPassword('HistTestUser1!')
    await pool.query(
      `INSERT INTO app_users (
         id, email, password_hash, is_active, role_id, collaborator_id,
         must_change_password, password_changed_at
       ) VALUES ($1::uuid, $2, $3, true, $4::uuid, $5::uuid, false, now())`,
      [user.id, user.email, hash, roleId, collaboratorId],
    )
  }

  async function createConveyor(label: string): Promise<string> {
    const created = await serviceCreateConveyor(pool, conveyorBody(`${runTag} ${label}`))
    return created.id
  }

  /** Força status e datas diretamente (fixture), sem passar pelas transições. */
  async function setClosed(
    id: string,
    status: 'FINALIZADA' | 'CANCELADA' | 'EM_ANDAMENTO',
    closedAt: string | null,
  ): Promise<void> {
    await pool.query(
      `UPDATE conveyors SET
         operational_status = $2::varchar,
         completed_at = CASE WHEN $2::varchar = 'FINALIZADA' THEN $3::timestamptz ELSE NULL END,
         canceled_at = CASE WHEN $2::varchar = 'CANCELADA' THEN $3::timestamptz ELSE NULL END
       WHERE id = $1::uuid`,
      [id, status, closedAt],
    )
  }

  async function insertArchiveEvent(
    id: string,
    type: 'CONVEYOR_ARCHIVED' | 'CONVEYOR_UNARCHIVED',
    occurredAt: string,
  ): Promise<void> {
    await pool.query(
      `INSERT INTO conveyor_operational_events (conveyor_id, event_type, source, occurred_at)
       VALUES ($1::uuid, $2, 'USER_ACTION', $3::timestamptz)`,
      [id, type, occurredAt],
    )
  }

  async function listAs(
    user: { id: string; email: string },
    view?: string,
  ): Promise<{ status: number; items: ListItem[] }> {
    const query: Record<string, string> = { q: runTag }
    if (view !== undefined) query.view = view
    const res = await request(app)
      .get('/api/v1/conveyors')
      .query(query)
      .set('Cookie', await sessionCookieForUser(pool, user.id, user.email))
    return { status: res.status, items: (res.body?.data ?? []) as ListItem[] }
  }

  async function sectionOf(id: string): Promise<ListItem | undefined> {
    const { items } = await listAs(gestorUser, 'todas')
    return items.find((i) => i.id === id)
  }

  async function postAction(
    user: { id: string; email: string },
    id: string,
    action: 'archive' | 'unarchive',
  ) {
    return request(app)
      .post(`/api/v1/conveyors/${id}/${action}`)
      .set('Cookie', await sessionCookieForUser(pool, user.id, user.email))
      .send({})
  }

  function ids(items: ListItem[]): string[] {
    return items.map((i) => i.id)
  }

  beforeAll(async () => {
    const env = loadEnv()
    pool = getPool(env)
    app = createApp(pool, createLogger('silent'), env)
    await ensureMariaCollaboratorSeedForIntegration(pool)

    const colabRoleId = await roleIdByCode('COLABORADOR')
    const gestorRoleId = await roleIdByCode('GESTOR')
    await pool.query(
      `INSERT INTO collaborators (id, code, full_name, role_id, status, is_active)
       VALUES ($1::uuid, $2, $3, $4::uuid, 'ACTIVE', true)`,
      [collabId, `HIST-${collabId.slice(0, 12)}`, `Colab Hist ${runTag}`, colabRoleId],
    )
    await insertAppUser(gestorUser, gestorRoleId, null)
    await insertAppUser(colabUser, colabRoleId, collabId)

    const ms = await pool.query<{ m: Date }>(
      `SELECT date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo' AS m`,
    )
    monthStartIso = ms.rows[0]!.m.toISOString()
  })

  afterAll(async () => {
    await closePool()
  })

  /** Instante no mês anterior (5 dias antes do início do mês corrente). */
  function previousMonthIso(): string {
    return new Date(new Date(monthStartIso).getTime() - 5 * 24 * 3600 * 1000).toISOString()
  }

  /** Instante no mês corrente (1 hora após o início do mês). */
  function currentMonthIso(): string {
    return new Date(new Date(monthStartIso).getTime() + 3600 * 1000).toISOString()
  }

  it('1) finalizada no mês corrente → Operacional (padrão sem view)', async () => {
    const id = await createConveyor('fin-corrente')
    await setClosed(id, 'FINALIZADA', currentMonthIso())

    const def = await listAs(gestorUser)
    expect(def.status).toBe(200)
    const item = def.items.find((i) => i.id === id)
    expect(item?.panelSection).toBe('OPERACIONAL')
    expect(item?.panelSectionManual).toBe(false)

    const hist = await listAs(gestorUser, 'historico')
    expect(ids(hist.items)).not.toContain(id)
  })

  it('2) finalizada no mês anterior → Histórico', async () => {
    const id = await createConveyor('fin-anterior')
    await setClosed(id, 'FINALIZADA', previousMonthIso())

    const op = await listAs(gestorUser, 'operacional')
    expect(ids(op.items)).not.toContain(id)
    const hist = await listAs(gestorUser, 'historico')
    const item = hist.items.find((i) => i.id === id)
    expect(item?.panelSection).toBe('HISTORICO')
    expect(item?.panelSectionManual).toBe(false)
  })

  it('3) criada em mês anterior e finalizada no mês corrente → Operacional', async () => {
    const id = await createConveyor('criada-anterior-fin-corrente')
    await pool.query(`UPDATE conveyors SET created_at = $2::timestamptz WHERE id = $1::uuid`, [
      id,
      new Date(new Date(monthStartIso).getTime() - 60 * 24 * 3600 * 1000).toISOString(),
    ])
    await setClosed(id, 'FINALIZADA', currentMonthIso())
    expect((await sectionOf(id))?.panelSection).toBe('OPERACIONAL')
  })

  it('3b) exemplo agosto/19-10: Operacional até 31/10 e Histórico em 01/11 (relógio de referência)', async () => {
    const id = await createConveyor('agosto-19-10')
    await pool.query(`UPDATE conveyors SET created_at = '2026-08-10T12:00:00-03:00' WHERE id = $1::uuid`, [id])
    await setClosed(id, 'FINALIZADA', '2026-10-19T15:00:00-03:00')

    const at3110 = await listConveyors(
      pool,
      { q: runTag, view: 'todas' },
      { kind: 'ALL' },
      new Date('2026-10-31T23:59:00-03:00'),
    )
    expect(at3110.find((r) => r.id === id)?.panel_section).toBe('OPERACIONAL')

    const at0111 = await listConveyors(
      pool,
      { q: runTag, view: 'todas' },
      { kind: 'ALL' },
      new Date('2026-11-01T00:00:00-03:00'),
    )
    expect(at0111.find((r) => r.id === id)?.panel_section).toBe('HISTORICO')
  })

  it('4) cancelada no mês anterior → Histórico e no mês corrente → Operacional (canceled_at)', async () => {
    const prev = await createConveyor('canc-anterior')
    await setClosed(prev, 'CANCELADA', previousMonthIso())
    const curr = await createConveyor('canc-corrente')
    await setClosed(curr, 'CANCELADA', currentMonthIso())
    // completed_at não interfere em CANCELADA.
    await pool.query(`UPDATE conveyors SET completed_at = $2::timestamptz WHERE id = $1::uuid`, [
      curr,
      previousMonthIso(),
    ])

    expect((await sectionOf(prev))?.panelSection).toBe('HISTORICO')
    expect((await sectionOf(curr))?.panelSection).toBe('OPERACIONAL')
  })

  it('5) virada de mês em São Paulo: encerrada 31/10 23h30 (SP) conta como outubro', async () => {
    const id = await createConveyor('virada-sp')
    // 31/10 23:30 em São Paulo = 01/11 02:30 UTC.
    await setClosed(id, 'FINALIZADA', '2026-10-31T23:30:00-03:00')

    // 31/10 23:45 (SP) = 01/11 02:45 UTC: em UTC já é novembro, em SP ainda é outubro.
    const stillOctober = await listConveyors(
      pool,
      { q: runTag, view: 'operacional' },
      { kind: 'ALL' },
      new Date('2026-11-01T02:45:00Z'),
    )
    expect(stillOctober.map((r) => r.id)).toContain(id)

    // Em novembro (SP), o encerramento de 31/10 23:30 (SP) já é de mês anterior.
    const november = await listConveyors(
      pool,
      { q: runTag, view: 'historico' },
      { kind: 'ALL' },
      new Date('2026-11-01T03:10:00Z'),
    )
    expect(november.map((r) => r.id)).toContain(id)

    // Em 30/11, ainda Histórico; esteira encerrada em 01/11 00:10 (SP) seria Operacional.
    const novId = await createConveyor('virada-sp-novembro')
    await setClosed(novId, 'FINALIZADA', '2026-11-01T00:10:00-03:00')
    const novView = await listConveyors(
      pool,
      { q: runTag, view: 'operacional' },
      { kind: 'ALL' },
      new Date('2026-11-01T03:30:00Z'),
    )
    expect(novView.map((r) => r.id)).toContain(novId)
    expect(novView.map((r) => r.id)).not.toContain(id)
  })

  it('6) arquivar encerrada do mês corrente → Histórico, com evento CONVEYOR_ARCHIVED', async () => {
    const id = await createConveyor('arquivar-corrente')
    await setClosed(id, 'FINALIZADA', currentMonthIso())

    const res = await postAction(gestorUser, id, 'archive')
    expect(res.status).toBe(200)
    expect(res.body.data.panelSection).toBe('HISTORICO')
    expect(res.body.data.panelSectionManual).toBe(true)

    const item = await sectionOf(id)
    expect(item?.panelSection).toBe('HISTORICO')
    expect(item?.panelSectionManual).toBe(true)

    const ev = await pool.query<{ source: string; created_by: string | null; event_type: string }>(
      `SELECT source, created_by::text AS created_by, event_type
       FROM conveyor_operational_events WHERE conveyor_id = $1::uuid`,
      [id],
    )
    expect(ev.rows).toEqual([
      { source: 'USER_ACTION', created_by: gestorUser.id, event_type: 'CONVEYOR_ARCHIVED' },
    ])
  })

  it('7) desarquivar no mês corrente → Operacional; o mesmo evento em mês anterior → regra automática', async () => {
    const id = await createConveyor('desarquivar')
    await setClosed(id, 'CANCELADA', previousMonthIso())
    expect((await sectionOf(id))?.panelSection).toBe('HISTORICO')

    const res = await postAction(gestorUser, id, 'unarchive')
    expect(res.status).toBe(200)
    expect(res.body.data.panelSection).toBe('OPERACIONAL')
    const after = await sectionOf(id)
    expect(after?.panelSection).toBe('OPERACIONAL')
    expect(after?.panelSectionManual).toBe(true)

    // Desarquivamento de mês anterior não vale mais: volta a regra automática (Histórico).
    const old = await createConveyor('desarquivar-mes-anterior')
    await setClosed(old, 'FINALIZADA', previousMonthIso())
    await insertArchiveEvent(old, 'CONVEYOR_UNARCHIVED', previousMonthIso())
    const oldItem = await sectionOf(old)
    expect(oldItem?.panelSection).toBe('HISTORICO')
    expect(oldItem?.panelSectionManual).toBe(false)

    // Arquivamento manual de mês anterior continua valendo (último evento = ARCHIVED).
    const arch = await createConveyor('arquivada-mes-anterior')
    await setClosed(arch, 'FINALIZADA', currentMonthIso())
    await insertArchiveEvent(arch, 'CONVEYOR_ARCHIVED', previousMonthIso())
    expect((await sectionOf(arch))?.panelSection).toBe('HISTORICO')

    // Rearquivar após desarquivar no mês: volta ao Histórico.
    const re = await postAction(gestorUser, id, 'archive')
    expect(re.status).toBe(200)
    expect((await sectionOf(id))?.panelSection).toBe('HISTORICO')
  })

  it('8) arquivar esteira aberta → 422; ação incoerente → 409; sem permissão → 403; inexistente → 404', async () => {
    const open = await createConveyor('aberta')
    const r422 = await postAction(gestorUser, open, 'archive')
    expect(r422.status).toBe(422)
    expect(r422.body.error?.code).toBe('CONVEYOR_ARCHIVE_STATUS_NOT_ALLOWED')
    expect(String(r422.body.error?.message)).toMatch(/finalizadas ou canceladas/)
    const r422u = await postAction(gestorUser, open, 'unarchive')
    expect(r422u.status).toBe(422)

    const inOp = await createConveyor('incoerente-op')
    await setClosed(inOp, 'FINALIZADA', currentMonthIso())
    const r409a = await postAction(gestorUser, inOp, 'unarchive')
    expect(r409a.status).toBe(409)
    expect(r409a.body.error?.code).toBe('CONVEYOR_ARCHIVE_STATE_CONFLICT')

    const inHist = await createConveyor('incoerente-hist')
    await setClosed(inHist, 'FINALIZADA', previousMonthIso())
    const r409b = await postAction(gestorUser, inHist, 'archive')
    expect(r409b.status).toBe(409)

    const r403 = await postAction(colabUser, inOp, 'archive')
    expect(r403.status).toBe(403)
    const r403u = await postAction(colabUser, inHist, 'unarchive')
    expect(r403u.status).toBe(403)

    const r404 = await postAction(gestorUser, randomUUID(), 'archive')
    expect(r404.status).toBe(404)

    // Nenhum evento gravado nas tentativas recusadas.
    const ev = await pool.query<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM conveyor_operational_events
       WHERE conveyor_id = ANY($1::uuid[]) AND event_type IN ('CONVEYOR_ARCHIVED', 'CONVEYOR_UNARCHIVED')`,
      [[open, inOp, inHist]],
    )
    expect(ev.rows[0]?.c).toBe('0')
  })

  it('9) visão todas = união sem duplicar; esteira com vários eventos aparece uma vez', async () => {
    const multi = await createConveyor('varios-eventos')
    await setClosed(multi, 'FINALIZADA', previousMonthIso())
    await insertArchiveEvent(multi, 'CONVEYOR_ARCHIVED', previousMonthIso())
    await insertArchiveEvent(multi, 'CONVEYOR_UNARCHIVED', currentMonthIso())
    await insertArchiveEvent(multi, 'CONVEYOR_ARCHIVED', new Date().toISOString())
    await pool.query(
      `INSERT INTO conveyor_operational_events (conveyor_id, event_type, source, occurred_at)
       VALUES ($1::uuid, 'MANUAL_NOTE', 'USER_ACTION', now())`,
      [multi],
    )

    const op = await listAs(gestorUser, 'operacional')
    const hist = await listAs(gestorUser, 'historico')
    const all = await listAs(gestorUser, 'todas')

    for (const list of [op.items, hist.items, all.items]) {
      const idsList = ids(list)
      expect(new Set(idsList).size).toBe(idsList.length)
    }
    const opIds = new Set(ids(op.items))
    const histIds = new Set(ids(hist.items))
    for (const id of opIds) expect(histIds.has(id)).toBe(false)
    expect(new Set(ids(all.items))).toEqual(new Set([...opIds, ...histIds]))
    expect(all.items).toHaveLength(opIds.size + histIds.size)

    expect(ids(hist.items).filter((i) => i === multi)).toHaveLength(1)
    expect(ids(all.items).filter((i) => i === multi)).toHaveLength(1)
    expect(all.items.find((i) => i.id === multi)?.panelSectionManual).toBe(true)
  })

  it('9b) view inválida → 422 (padrão de validação Zod do projeto)', async () => {
    const r = await listAs(gestorUser, 'arquivadas')
    expect(r.status).toBe(422)
  })

  it('10) escopo de colaborador vale em operacional, historico e todas', async () => {
    const mineOpen = await createConveyor('colab-aberta')
    const mineHist = await createConveyor('colab-historico')
    const other = await createConveyor('colab-outra')
    await setClosed(mineHist, 'FINALIZADA', previousMonthIso())
    await setClosed(other, 'FINALIZADA', previousMonthIso())
    for (const id of [mineOpen, mineHist]) {
      const step = await pool.query<{ id: string }>(
        `SELECT id::text AS id FROM conveyor_nodes
         WHERE conveyor_id = $1::uuid AND node_type = 'STEP' AND deleted_at IS NULL LIMIT 1`,
        [id],
      )
      await serviceCreateConveyorNodeAssignee(pool, {
        conveyorId: id,
        conveyorNodeId: step.rows[0]!.id,
        type: 'COLLABORATOR',
        collaboratorId: collabId,
        isPrimary: false,
      })
    }

    const op = await listAs(colabUser, 'operacional')
    expect(op.status).toBe(200)
    expect(ids(op.items)).toEqual([mineOpen])

    const hist = await listAs(colabUser, 'historico')
    expect(ids(hist.items)).toEqual([mineHist])

    const all = await listAs(colabUser, 'todas')
    expect(new Set(ids(all.items))).toEqual(new Set([mineOpen, mineHist]))
    expect(ids(all.items)).not.toContain(other)

    const def = await listAs(colabUser)
    expect(ids(def.items)).toEqual([mineOpen])
  })

  it('11a) transição para CANCELADA via PATCH /status grava canceled_at', async () => {
    const id = await createConveyor('cancelar-http')
    const before = await pool.query<{ canceled_at: Date | null }>(
      `SELECT canceled_at FROM conveyors WHERE id = $1::uuid`,
      [id],
    )
    expect(before.rows[0]?.canceled_at).toBeNull()

    const res = await request(app)
      .patch(`/api/v1/conveyors/${id}/status`)
      .set('Cookie', await sessionCookieForUser(pool, gestorUser.id, gestorUser.email))
      .send({ operationalStatus: 'CANCELADA' })
    expect(res.status).toBe(200)

    const after = await pool.query<{ canceled_at: Date | null; db_now: Date }>(
      `SELECT canceled_at, now() AS db_now FROM conveyors WHERE id = $1::uuid`,
      [id],
    )
    const canceledAt = after.rows[0]?.canceled_at
    expect(canceledAt).toBeInstanceOf(Date)
    expect(Math.abs(after.rows[0]!.db_now.getTime() - canceledAt!.getTime())).toBeLessThan(60_000)
    expect((await sectionOf(id))?.panelSection).toBe('OPERACIONAL')
  })

  it('11b) migration 0054 é idempotente e faz backfill de canceladas legadas a partir de updated_at', async () => {
    const id = await createConveyor('legado-cancelada')
    await pool.query(
      `UPDATE conveyors SET operational_status = 'CANCELADA', canceled_at = NULL,
         updated_at = '2026-01-15T10:00:00-03:00'
       WHERE id = $1::uuid`,
      [id],
    )
    // Encerrada legada sem data → Histórico.
    expect((await sectionOf(id))?.panelSection).toBe('HISTORICO')

    const sql = await readFile(MIGRATION_0054, 'utf8')
    await pool.query(sql)
    await pool.query(sql)

    const r = await pool.query<{ canceled_at: Date | null; updated_at: Date }>(
      `SELECT canceled_at, updated_at FROM conveyors WHERE id = $1::uuid`,
      [id],
    )
    expect(r.rows[0]?.canceled_at?.toISOString()).toBe(r.rows[0]?.updated_at.toISOString())
    expect(r.rows[0]?.canceled_at?.toISOString()).toBe('2026-01-15T13:00:00.000Z')

    const col = await pool.query<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM information_schema.columns
       WHERE table_name = 'conveyors' AND column_name = 'canceled_at'`,
    )
    expect(col.rows[0]?.c).toBe('1')
  })

  it('finalizada legada sem completed_at → Histórico', async () => {
    const id = await createConveyor('legado-finalizada')
    await setClosed(id, 'FINALIZADA', null)
    expect((await sectionOf(id))?.panelSection).toBe('HISTORICO')
  })
})
