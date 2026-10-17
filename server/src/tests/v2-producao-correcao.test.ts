import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.js'
import { createLogger } from '../plugins/logger.js'
import { closePool, getPool } from '../plugins/db.js'
import { hasDatabaseConnectionInEnv, loadDotenvFiles, loadEnv } from '../config/env.js'
import { productionSessionCookie, seedProductionPinForCollaborator } from './productionTestHelpers.js'
import { bloqueioCorrecao, erroMinutos, erroMotivo } from '../modules/v2-producao-correcao/v2-producao-correcao.logic.js'

loadDotenvFiles()
const hasDb = hasDatabaseConnectionInEnv(process.env)

describe('SGP+ V2 — correção pelo colaborador (regras)', () => {
  const agora = new Date('2026-10-19T20:00:00-03:00')
  it('só o próprio lançamento, feito hoje (horário da fábrica), com a atividade aberta', () => {
    const base = { collaboratorId: 'eu', createdAt: new Date('2026-10-19T08:00:00-03:00'), stepStatus: 'IN_PROGRESS' }
    expect(bloqueioCorrecao(base, 'eu', agora)).toBeNull()
    expect(bloqueioCorrecao(base, 'outro', agora)).toMatch(/não é seu/)
    // 23h30 de ontem em São Paulo já é "hoje" em UTC; continua sendo ontem na fábrica
    expect(bloqueioCorrecao({ ...base, createdAt: new Date('2026-10-18T23:30:00-03:00') }, 'eu', agora)).toMatch(/hoje/)
    expect(bloqueioCorrecao({ ...base, stepStatus: 'COMPLETED' }, 'eu', agora)).toMatch(/concluída/)
    expect(bloqueioCorrecao({ ...base, stepStatus: 'ABORTED' }, 'eu', agora)).toMatch(/dispensada/)
    expect(erroMotivo('ok')).not.toBeNull()
    expect(erroMotivo('Esqueci de pausar')).toBeNull()
    expect(erroMinutos(30, 45)).toBeNull()
    expect(erroMinutos(45, 45)).toMatch(/mesmo/)
    expect(erroMinutos(0, 45)).not.toBeNull()
  })
})

const u = (n: number) => `c2c2c2c2-0000-4000-8000-${String(n).padStart(12, '0')}`
const EU = u(1)
const OUTRO = u(2)
const CV = u(10)

describe.skipIf(!hasDb)('SGP+ V2 — /api/v1/v2/producao/meus-lancamentos (integração)', () => {
  let app: ReturnType<typeof createApp>
  let pool: ReturnType<typeof getPool>
  let eu: string

  beforeAll(async () => {
    const env = loadEnv()
    pool = getPool(env)
    app = createApp(pool, createLogger('silent'), env)
    for (const [id, nome] of [
      [EU, 'Marta Teste V2'],
      [OUTRO, 'João Teste V2'],
    ])
      await pool.query(`INSERT INTO collaborators (id, full_name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [id, nome])
    await seedProductionPinForCollaborator(pool, EU, '2580')
    eu = productionSessionCookie(EU)
    await pool.query(
      `INSERT INTO conveyors (id, name, priority, origin_register, total_options, total_areas, total_steps, total_planned_minutes, operational_status)
       VALUES ($1, 'Gol V2 teste', 'media', 'MANUAL', 1, 1, 2, 120, 'EM_ANDAMENTO') ON CONFLICT (id) DO NOTHING`,
      [CV],
    )
    await pool.query(`INSERT INTO conveyor_nodes (id, conveyor_id, root_id, parent_id, node_type, source_origin, name) VALUES ($1, $2, $1, NULL, 'OPTION', 'manual', 'Bancos') ON CONFLICT (id) DO NOTHING`, [u(11), CV])
    await pool.query(`INSERT INTO conveyor_nodes (id, conveyor_id, root_id, parent_id, node_type, source_origin, name) VALUES ($1, $2, $3, $3, 'AREA', 'manual', 'Costura') ON CONFLICT (id) DO NOTHING`, [u(12), CV, u(11)])
    for (const [id, nome, st] of [
      [u(13), 'Costurar encosto', 'IN_PROGRESS'],
      [u(14), 'Costurar assento', 'COMPLETED'],
    ])
      await pool.query(
        `INSERT INTO conveyor_nodes (id, conveyor_id, root_id, parent_id, node_type, source_origin, name, operational_status) VALUES ($1, $2, $3, $4, 'STEP', 'manual', $5, $6) ON CONFLICT (id) DO NOTHING`,
        [id, CV, u(11), u(12), nome, st],
      )
    const ins = (id: string, step: string, quem: string, min: number, criado: string) =>
      pool.query(`INSERT INTO conveyor_time_entries (id, conveyor_id, conveyor_node_id, collaborator_id, minutes, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, ${criado}, ${criado})`, [id, CV, step, quem, min])
    await ins(u(21), u(13), EU, 60, 'now()')
    await ins(u(22), u(13), EU, 30, "now() - interval '2 days'")
    await ins(u(23), u(14), EU, 45, 'now()')
    await ins(u(24), u(13), OUTRO, 50, 'now()')
  })

  afterAll(async () => {
    await pool.query('DELETE FROM v2_correcoes_apontamento WHERE collaborator_id = ANY($1::uuid[])', [[EU, OUTRO]])
    await pool.query('DELETE FROM conveyor_time_entries WHERE conveyor_id = $1', [CV])
    await pool.query('DELETE FROM conveyor_nodes WHERE conveyor_id = $1 AND node_type = $2', [CV, 'STEP'])
    await pool.query('DELETE FROM conveyor_nodes WHERE conveyor_id = $1 AND node_type = $2', [CV, 'AREA'])
    await pool.query('DELETE FROM conveyor_nodes WHERE conveyor_id = $1', [CV])
    await pool.query('DELETE FROM conveyors WHERE id = $1', [CV])
    await closePool()
  })

  it('lista só o meu de hoje; corrijo e removo o que posso, com registro; o resto é recusado', async () => {
    const lista = await request(app).get('/api/v1/v2/producao/meus-lancamentos').set('Cookie', eu)
    expect(lista.status).toBe(200)
    const porId = Object.fromEntries((lista.body.data as { id: string; podeCorrigir: boolean; updatedAt: string }[]).map((l) => [l.id, l]))
    expect(Object.keys(porId).sort()).toEqual([u(21), u(23)])
    expect(porId[u(21)].podeCorrigir).toBe(true)
    expect(porId[u(23)].podeCorrigir).toBe(false)

    const semMotivo = await request(app).patch(`/api/v1/v2/producao/meus-lancamentos/${u(21)}`).set('Cookie', eu).send({ minutes: 40, reason: '', expectedUpdatedAt: porId[u(21)].updatedAt })
    expect(semMotivo.status).toBe(422)
    const velho = await request(app).patch(`/api/v1/v2/producao/meus-lancamentos/${u(21)}`).set('Cookie', eu).send({ minutes: 40, reason: 'Esqueci de pausar', expectedUpdatedAt: '2020-01-01T00:00:00.000Z' })
    expect(velho.status).toBe(409)
    const ok = await request(app).patch(`/api/v1/v2/producao/meus-lancamentos/${u(21)}`).set('Cookie', eu).send({ minutes: 40, reason: 'Esqueci de pausar', expectedUpdatedAt: porId[u(21)].updatedAt })
    expect(ok.status).toBe(200)
    expect((await pool.query('SELECT minutes FROM conveyor_time_entries WHERE id = $1', [u(21)])).rows[0].minutes).toBe(40)

    expect((await request(app).patch(`/api/v1/v2/producao/meus-lancamentos/${u(23)}`).set('Cookie', eu).send({ minutes: 10, reason: 'Errei o tempo', expectedUpdatedAt: new Date().toISOString() })).status).toBe(422)
    expect((await request(app).delete(`/api/v1/v2/producao/meus-lancamentos/${u(22)}`).set('Cookie', eu).send({ reason: 'Lancei em dobro' })).status).toBe(422)
    expect((await request(app).delete(`/api/v1/v2/producao/meus-lancamentos/${u(24)}`).set('Cookie', eu).send({ reason: 'Lancei em dobro' })).status).toBe(403)
    expect((await request(app).get('/api/v1/v2/producao/meus-lancamentos')).status).toBe(401)

    expect((await request(app).delete(`/api/v1/v2/producao/meus-lancamentos/${u(21)}`).set('Cookie', eu).send({ reason: 'Apontei na atividade errada' })).status).toBe(204)
    expect((await pool.query('SELECT deleted_at FROM conveyor_time_entries WHERE id = $1', [u(21)])).rows[0].deleted_at).not.toBeNull()

    const reg = await pool.query('SELECT acao, minutos_antes, minutos_depois, motivo FROM v2_correcoes_apontamento WHERE time_entry_id = $1 ORDER BY created_at', [u(21)])
    expect(reg.rows).toEqual([
      { acao: 'CORRIGIR', minutos_antes: 60, minutos_depois: 40, motivo: 'Esqueci de pausar' },
      { acao: 'REMOVER', minutos_antes: 40, minutos_depois: null, motivo: 'Apontei na atividade errada' },
    ])
  })
})
