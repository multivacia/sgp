import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  hasDatabaseConnectionInEnv,
  loadDotenvFiles,
  loadEnv,
} from '../config/env.js'
import { closePool, getPool } from '../plugins/db.js'
import {
  listCollaboratorCapacityOverrides,
  resolveCollaboratorDailyCapacityMinutes,
  softDeleteCollaboratorCapacityOverride,
  upsertCollaboratorCapacityOverride,
  upsertOperationalCapacitySettings,
} from '../modules/operational-settings/operational-settings.repository.js'

loadDotenvFiles()
const hasDb = hasDatabaseConnectionInEnv(process.env)

let capacityTablesAvailable = false

describe.skipIf(!hasDb)('operational capacity repository (integração)', () => {
  let pool: ReturnType<typeof getPool>

  beforeAll(async () => {
    const env = loadEnv()
    pool = getPool(env)
    const probe = await pool.query<{ ok: string }>(
      `SELECT CASE
         WHEN to_regclass('public.operational_capacity_settings') IS NOT NULL
          AND to_regclass('public.collaborator_capacity_overrides') IS NOT NULL
         THEN '1' ELSE '0'
       END AS ok`,
    )
    capacityTablesAvailable = probe.rows[0]?.ok === '1'
  })

  afterAll(async () => {
    await closePool()
  })

  it.skipIf(!capacityTablesAvailable)(
    'fallback 480 quando settings inexistente',
    async () => {
      const collaboratorId = randomUUID()
      await pool.query(
        `INSERT INTO collaborators (id, full_name, status, is_active)
         VALUES ($1::uuid, 'Fallback Capacidade', 'ACTIVE', true)`,
        [collaboratorId],
      )

      await pool.query(`DELETE FROM collaborator_capacity_overrides WHERE collaborator_id = $1::uuid`, [collaboratorId])
      await pool.query(`DELETE FROM operational_capacity_settings WHERE id = 1`)

      const out = await resolveCollaboratorDailyCapacityMinutes(
        pool,
        collaboratorId,
        '2026-04-28',
      )
      expect(out.source).toBe('fallback')
      expect(out.defaultDailyMinutes).toBeNull()
      expect(out.overrideDailyMinutes).toBeNull()
    },
  )

  it.skipIf(!capacityTablesAvailable)('override ativo vence default', async () => {
    const collaboratorId = randomUUID()
    await pool.query(
      `INSERT INTO collaborators (id, full_name, status, is_active)
       VALUES ($1::uuid, 'Override Ativo', 'ACTIVE', true)`,
      [collaboratorId],
    )
    await upsertOperationalCapacitySettings(pool, { defaultDailyMinutes: 480 })
    await upsertCollaboratorCapacityOverride(pool, {
      collaboratorId,
      dailyMinutes: 360,
      isActive: true,
    })

    const out = await resolveCollaboratorDailyCapacityMinutes(
      pool,
      collaboratorId,
      '2026-04-28',
    )
    expect(out.source).toBe('override')
    expect(out.overrideDailyMinutes).toBe(360)
  })

  it.skipIf(!capacityTablesAvailable)(
    'override inativo ou fora da janela não vence default',
    async () => {
      const collaboratorId = randomUUID()
      await pool.query(
        `INSERT INTO collaborators (id, full_name, status, is_active)
         VALUES ($1::uuid, 'Override Inativo', 'ACTIVE', true)`,
        [collaboratorId],
      )
      await upsertOperationalCapacitySettings(pool, { defaultDailyMinutes: 510 })
      await upsertCollaboratorCapacityOverride(pool, {
        collaboratorId,
        dailyMinutes: 333,
        isActive: false,
      })

      const inactive = await resolveCollaboratorDailyCapacityMinutes(
        pool,
        collaboratorId,
        '2026-04-28',
      )
      expect(inactive.source).toBe('default')
      expect(inactive.defaultDailyMinutes).toBe(510)

      await upsertCollaboratorCapacityOverride(pool, {
        collaboratorId,
        dailyMinutes: 333,
        isActive: true,
        effectiveFrom: '2026-05-01',
        effectiveTo: '2026-05-31',
      })
      const outsideWindow = await resolveCollaboratorDailyCapacityMinutes(
        pool,
        collaboratorId,
        '2026-04-28',
      )
      expect(outsideWindow.source).toBe('default')
      expect(outsideWindow.overrideDailyMinutes).toBeNull()
    },
  )

  it.skipIf(!capacityTablesAvailable)(
    'soft delete remove override da resolução',
    async () => {
      const collaboratorId = randomUUID()
      await pool.query(
        `INSERT INTO collaborators (id, full_name, status, is_active)
         VALUES ($1::uuid, 'Override Delete', 'ACTIVE', true)`,
        [collaboratorId],
      )
      await upsertOperationalCapacitySettings(pool, { defaultDailyMinutes: 480 })
      await upsertCollaboratorCapacityOverride(pool, {
        collaboratorId,
        dailyMinutes: 420,
        isActive: true,
      })

      const beforeDelete = await resolveCollaboratorDailyCapacityMinutes(
        pool,
        collaboratorId,
        '2026-04-28',
      )
      expect(beforeDelete.source).toBe('override')

      const [override] = await listCollaboratorCapacityOverrides(pool, { collaboratorId })
      expect(override?.id).toBeTruthy()
      await softDeleteCollaboratorCapacityOverride(pool, override!.id)
      const afterDelete = await resolveCollaboratorDailyCapacityMinutes(
        pool,
        collaboratorId,
        '2026-04-28',
      )
      expect(afterDelete.source).toBe('default')
    },
  )
})

