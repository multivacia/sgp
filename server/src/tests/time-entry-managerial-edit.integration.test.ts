import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
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
import {
  serviceCreateConveyorNodeAssignee,
  serviceCreateConveyorTimeEntry,
} from '../modules/conveyors/conveyorAssignments.service.js'
import * as adminAuditRepo from '../modules/admin-audit/admin-audit.repository.js'
import { hashPassword } from '../shared/password/password.js'
import { ErrorCodes } from '../shared/errors/errorCodes.js'
import { sessionCookieForUser } from './sessionTestCookie.js'
import { ensureMariaCollaboratorSeedForIntegration } from './integrationSeedFixtures.js'
import { setConveyorProductionStatusForIntegration } from './integrationConveyorFixtures.js'

loadDotenvFiles()

const hasDb = hasDatabaseConnectionInEnv(process.env)

const COLAB_SEED = '3a5f3c72-2e75-4e0a-8f6e-6d4d086e5f1c'
const MARIA_APP_USER_ID = '44444444-4444-4444-4444-444444444444'
const MARIA_EMAIL = 'maria@exemplo.com'

const MGR_ADMIN_USER_ID = 'ae51e001-0000-4000-8000-000000000053'
const MGR_ADMIN_EMAIL = 'mgr-edit-admin@sgp-argos.local'
const ADMIN_ROLE_ID = '11111111-1111-1111-1111-111111111111'

const EDIT_ANY = 'time_entries.edit_any'
const DELETE_ANY = 'time_entries.delete_any'

function minimalConveyorBody(nome: string): PostConveyorBody {
  return {
    dados: {
      nome,
      cliente: 'C',
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

describe.skipIf(!hasDb)('correção gerencial de apontamentos (PATCH/DELETE)', () => {
  let app: ReturnType<typeof createApp>
  let pool: ReturnType<typeof getPool>
  let adminCookie: string
  let mariaCookie: string

  beforeAll(async () => {
    const env = loadEnv()
    pool = getPool(env)
    app = createApp(pool, createLogger('silent'), env)
    await ensureMariaCollaboratorSeedForIntegration(pool)

    const hash = await hashPassword('MgrEditAdmin1!')
    await pool.query(
      `INSERT INTO app_users (
          id, email, password_hash, is_active, role_id, must_change_password, password_changed_at
        ) VALUES ($1::uuid, $2, $3, true, $4::uuid, false, now())
        ON CONFLICT (id) DO UPDATE SET
          role_id = EXCLUDED.role_id,
          is_active = true,
          email = EXCLUDED.email`,
      [MGR_ADMIN_USER_ID, MGR_ADMIN_EMAIL, hash, ADMIN_ROLE_ID],
    )

    for (const code of [EDIT_ANY, DELETE_ANY]) {
      await pool.query(
        `INSERT INTO app_permissions (code, name)
         SELECT $1::varchar, $2
         WHERE NOT EXISTS (SELECT 1 FROM app_permissions WHERE code = $1::varchar)`,
        [
          code,
          code === EDIT_ANY
            ? 'Apontamentos: editar qualquer'
            : 'Apontamentos: remover qualquer',
        ],
      )
      await pool.query(
        `INSERT INTO app_role_permissions (role_id, permission_id)
         SELECT $1::uuid, p.id FROM app_permissions p
         WHERE p.code = $2
           AND NOT EXISTS (
             SELECT 1 FROM app_role_permissions rp
             WHERE rp.role_id = $1::uuid AND rp.permission_id = p.id
           )`,
        [ADMIN_ROLE_ID, code],
      )
    }

    adminCookie = await sessionCookieForUser(pool, MGR_ADMIN_USER_ID, MGR_ADMIN_EMAIL)
    mariaCookie = await sessionCookieForUser(pool, MARIA_APP_USER_ID, MARIA_EMAIL)
  })

  afterAll(async () => {
    await closePool()
  })

  async function setupStepWithMariaEntry(opts?: {
    minutes?: number
    executedQuantity?: number | null
  }): Promise<{
    conveyorId: string
    stepId: string
    entryId: string
    updatedAt: string
  }> {
    const conv = await serviceCreateConveyor(
      pool,
      minimalConveyorBody(`MgrEdit ${randomUUID().slice(0, 8)}`),
    )
    await setConveyorProductionStatusForIntegration(pool, conv.id)
    const stepR = await pool.query<{ id: string }>(
      `SELECT id FROM conveyor_nodes
       WHERE conveyor_id = $1::uuid AND node_type = 'STEP' AND deleted_at IS NULL
       ORDER BY order_index LIMIT 1`,
      [conv.id],
    )
    const stepId = stepR.rows[0]!.id
    const assignee = await serviceCreateConveyorNodeAssignee(pool, {
      conveyorId: conv.id,
      conveyorNodeId: stepId,
      collaboratorId: COLAB_SEED,
      isPrimary: true,
    })
    const created = await serviceCreateConveyorTimeEntry(pool, {
      conveyorId: conv.id,
      conveyorNodeId: stepId,
      collaboratorId: COLAB_SEED,
      conveyorNodeAssigneeId: assignee.id,
      minutes: opts?.minutes ?? 40,
      executedQuantity: opts?.executedQuantity === undefined ? 2 : opts.executedQuantity,
      entryMode: 'manual',
    })
    const row = await pool.query<{ updated_at: Date }>(
      `SELECT updated_at FROM conveyor_time_entries WHERE id = $1::uuid`,
      [created.id],
    )
    return {
      conveyorId: conv.id,
      stepId,
      entryId: created.id,
      updatedAt: row.rows[0]!.updated_at.toISOString(),
    }
  }

  function entryPath(conveyorId: string, stepId: string, entryId: string) {
    return `/api/v1/conveyors/${conveyorId}/steps/${stepId}/time-entries/${entryId}`
  }

  async function entryRow(entryId: string) {
    const r = await pool.query<{
      minutes: number
      executed_quantity: number | null
      deleted_at: Date | null
    }>(
      `SELECT minutes, executed_quantity, deleted_at
       FROM conveyor_time_entries WHERE id = $1::uuid`,
      [entryId],
    )
    return r.rows[0]!
  }

  async function latestAudit(eventType: string, timeEntryId: string) {
    const r = await pool.query<{
      event_type: string
      metadata_json: Record<string, unknown> | null
    }>(
      `SELECT event_type, metadata_json
       FROM admin_audit_events
       WHERE event_type = $1
         AND metadata_json->>'time_entry_id' = $2
       ORDER BY occurred_at DESC
       LIMIT 1`,
      [eventType, timeEntryId],
    )
    return r.rows[0] ?? null
  }

  it('1) edição só quantidade', async () => {
    const ctx = await setupStepWithMariaEntry({ executedQuantity: 3 })
    const res = await request(app)
      .patch(entryPath(ctx.conveyorId, ctx.stepId, ctx.entryId))
      .set('Cookie', adminCookie)
      .send({
        expectedUpdatedAt: ctx.updatedAt,
        reason: 'Ajuste de quantidade executada',
        executedQuantity: 5,
      })
    expect(res.status).toBe(200)
    expect(res.body.data.executedQuantity).toBe(5)
    const row = await entryRow(ctx.entryId)
    expect(row.executed_quantity).toBe(5)
    expect(row.minutes).toBe(40)
    const audit = await latestAudit('time_entry_edited_by_manager', ctx.entryId)
    expect(audit?.metadata_json).toMatchObject({
      field: 'executed_quantity',
      previous_value: 3,
      new_value: 5,
    })
  })

  it('2) qty 0', async () => {
    const ctx = await setupStepWithMariaEntry({ executedQuantity: 2 })
    const res = await request(app)
      .patch(entryPath(ctx.conveyorId, ctx.stepId, ctx.entryId))
      .set('Cookie', adminCookie)
      .send({
        expectedUpdatedAt: ctx.updatedAt,
        reason: 'Zerar quantidade',
        executedQuantity: 0,
      })
    expect(res.status).toBe(200)
    expect(res.body.data.executedQuantity).toBe(0)
    const row = await entryRow(ctx.entryId)
    expect(row.executed_quantity).toBe(0)
  })

  it('3) qty null', async () => {
    const ctx = await setupStepWithMariaEntry({ executedQuantity: 4 })
    const res = await request(app)
      .patch(entryPath(ctx.conveyorId, ctx.stepId, ctx.entryId))
      .set('Cookie', adminCookie)
      .send({
        expectedUpdatedAt: ctx.updatedAt,
        reason: 'Limpar quantidade',
        executedQuantity: null,
      })
    expect(res.status).toBe(200)
    expect(res.body.data.executedQuantity).toBeNull()
    const row = await entryRow(ctx.entryId)
    expect(row.executed_quantity).toBeNull()
    const audit = await latestAudit('time_entry_edited_by_manager', ctx.entryId)
    expect(audit?.metadata_json).toMatchObject({
      field: 'executed_quantity',
      previous_value: 4,
      new_value: null,
    })
  })

  it('4) edição minutos', async () => {
    const ctx = await setupStepWithMariaEntry({ minutes: 25 })
    const res = await request(app)
      .patch(entryPath(ctx.conveyorId, ctx.stepId, ctx.entryId))
      .set('Cookie', adminCookie)
      .send({
        expectedUpdatedAt: ctx.updatedAt,
        reason: 'Corrigir minutos',
        minutes: 55,
      })
    expect(res.status).toBe(200)
    expect(res.body.data.minutes).toBe(55)
    const row = await entryRow(ctx.entryId)
    expect(row.minutes).toBe(55)
    const audit = await latestAudit('time_entry_edited_by_manager', ctx.entryId)
    expect(audit?.metadata_json).toMatchObject({
      field: 'minutes',
      previous_value: 25,
      new_value: 55,
    })
  })

  it('5) conflito 409', async () => {
    const ctx = await setupStepWithMariaEntry()
    const stale = new Date(Date.parse(ctx.updatedAt) - 60_000).toISOString()
    const res = await request(app)
      .patch(entryPath(ctx.conveyorId, ctx.stepId, ctx.entryId))
      .set('Cookie', adminCookie)
      .send({
        expectedUpdatedAt: stale,
        reason: 'Deve conflitar',
        minutes: 99,
      })
    expect(res.status).toBe(409)
    expect(res.body.error?.code).toBe(ErrorCodes.CONFLICT)
    const row = await entryRow(ctx.entryId)
    expect(row.minutes).toBe(40)
  })

  it('6) sem permissão 403', async () => {
    const ctx = await setupStepWithMariaEntry()
    const res = await request(app)
      .patch(entryPath(ctx.conveyorId, ctx.stepId, ctx.entryId))
      .set('Cookie', mariaCookie)
      .send({
        expectedUpdatedAt: ctx.updatedAt,
        reason: 'Sem permissão',
        minutes: 10,
      })
    expect(res.status).toBe(403)
    expect(res.body.error?.code).toBe(ErrorCodes.FORBIDDEN)
    const row = await entryRow(ctx.entryId)
    expect(row.minutes).toBe(40)
  })

  it('7) remoção própria', async () => {
    const ctx = await setupStepWithMariaEntry()
    const res = await request(app)
      .delete(entryPath(ctx.conveyorId, ctx.stepId, ctx.entryId))
      .set('Cookie', mariaCookie)
    expect(res.status).toBe(200)
    expect(res.body.data.deleted).toBe(true)
    const row = await entryRow(ctx.entryId)
    expect(row.deleted_at).not.toBeNull()
    const audit = await latestAudit('time_entry_deleted_by_manager', ctx.entryId)
    expect(audit).toBeNull()
  })

  it('8) remoção gerencial com motivo', async () => {
    const ctx = await setupStepWithMariaEntry()
    const res = await request(app)
      .delete(entryPath(ctx.conveyorId, ctx.stepId, ctx.entryId))
      .set('Cookie', adminCookie)
      .send({ reason: 'Remoção gerencial validada' })
    expect(res.status).toBe(200)
    expect(res.body.data.deleted).toBe(true)
    const row = await entryRow(ctx.entryId)
    expect(row.deleted_at).not.toBeNull()
    const audit = await latestAudit('time_entry_deleted_by_manager', ctx.entryId)
    expect(audit?.metadata_json).toMatchObject({
      time_entry_id: ctx.entryId,
      reason: 'Remoção gerencial validada',
    })
  })

  it('9) falha auditoria → rollback', async () => {
    const ctx = await setupStepWithMariaEntry({ minutes: 33, executedQuantity: 1 })
    const spy = vi
      .spyOn(adminAuditRepo, 'insertAdminAuditEvent')
      .mockRejectedValueOnce(new Error('falha forçada de auditoria'))
    try {
      const res = await request(app)
        .patch(entryPath(ctx.conveyorId, ctx.stepId, ctx.entryId))
        .set('Cookie', adminCookie)
        .send({
          expectedUpdatedAt: ctx.updatedAt,
          reason: 'Não deve persistir',
          minutes: 77,
        })
      expect(res.status).toBeGreaterThanOrEqual(500)
      const row = await entryRow(ctx.entryId)
      expect(row.minutes).toBe(33)
      expect(row.executed_quantity).toBe(1)
      expect(row.deleted_at).toBeNull()
      const audit = await latestAudit('time_entry_edited_by_manager', ctx.entryId)
      expect(audit).toBeNull()
    } finally {
      spy.mockRestore()
    }
  })
})
