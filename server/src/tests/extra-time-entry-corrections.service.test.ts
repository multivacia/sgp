import type pg from 'pg'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  serviceDeleteExtraTimeEntryAsManager,
  servicePatchExtraTimeEntryAsManager,
} from '../modules/my-activities/extra-time-entry-corrections.service.js'

const mocks = vi.hoisted(() => ({ audit: vi.fn() }))
vi.mock('../modules/admin-audit/admin-audit.repository.js', () => ({
  insertAdminAuditEvent: mocks.audit,
}))

const ID = '11111111-1111-4111-8111-111111111111'
const COLAB = '22222222-2222-4222-8222-222222222222'
const DATE = '2026-10-20T12:00:00.000Z'

function fakePool(options?: { active?: boolean }) {
  const old = {
    id: ID,
    collaborator_id: COLAB,
    description_id: ID,
    entry_date: '2026-10-20',
    minutes: 30,
    notes: null,
    updated_at: new Date(DATE),
    origin: 'PRODUCTION',
  }
  const query = vi.fn(async (sql: string) => {
    if (sql.includes('FOR UPDATE')) return { rows: [old], rowCount: 1 }
    if (sql.includes('SELECT id FROM operational_extra_time_entry_descriptions')) {
      return { rows: options?.active === false ? [] : [{ id: ID }], rowCount: options?.active === false ? 0 : 1 }
    }
    if (sql.includes('UPDATE operational_extra_time_entries')) {
      return { rows: [{ updated_at: new Date('2026-10-20T12:01:00.000Z') }], rowCount: 1 }
    }
    return { rows: [], rowCount: 0 }
  })
  const client = { query, release: vi.fn() }
  const pool = { connect: vi.fn(async () => client) } as unknown as pg.Pool
  return { pool, query, client }
}

beforeEach(() => { mocks.audit.mockReset(); mocks.audit.mockResolvedValue(undefined) })

describe('correção gerencial Extra Esteira — transação e auditoria', () => {
  it('corrige tempo de apontamento Kiosk, sem tocar na coluna de descrição e com auditoria', async () => {
    const { pool, query, client } = fakePool({ active: false })
    const result = await servicePatchExtraTimeEntryAsManager(pool, {
      id: ID, actorId: ID,
      body: {
        expectedUpdatedAt: DATE, reason: 'Conferência',
        descriptionId: ID, entryDate: '2026-10-20', minutes: 45, notes: null,
      },
    })
    expect(result.id).toBe(ID)
    const sql = query.mock.calls.map((x) => x[0] as string)
    const update = sql.find((x) => x.includes('UPDATE operational_extra_time_entries'))
    expect(update).not.toContain('SET description_id')
    expect(sql.join(' ')).not.toContain('SELECT id FROM operational_extra_time_entry_descriptions')
    expect(sql).toContain('COMMIT')
    expect(mocks.audit).toHaveBeenCalledWith(client, expect.objectContaining({
      eventType: 'extra_time_entry_edited_by_manager',
      metadata: expect.objectContaining({
        previous_snapshot: expect.objectContaining({ minutes: 30 }),
        new_snapshot: expect.objectContaining({ minutes: 45 }),
      }),
    }))
  })

  it('rejeita revisão obsoleta e desfaz transação sem auditoria', async () => {
    const { pool, query } = fakePool()
    await expect(servicePatchExtraTimeEntryAsManager(pool, {
      id: ID, actorId: ID,
      body: {
        expectedUpdatedAt: '2026-10-20T12:00:01.000Z', reason: 'Conferência',
        descriptionId: ID, entryDate: '2026-10-20', minutes: 45, notes: null,
      },
    })).rejects.toMatchObject({ status: 409 })
    expect(query.mock.calls.map((x) => x[0])).toContain('ROLLBACK')
    expect(mocks.audit).not.toHaveBeenCalled()
  })

  it('remove logicamente o registro e audita o conteúdo original', async () => {
    const { pool, query } = fakePool()
    const result = await serviceDeleteExtraTimeEntryAsManager(pool, {
      id: ID, actorId: ID,
      body: { expectedUpdatedAt: DATE, reason: 'Duplicidade' },
    })
    expect(result).toEqual({ deleted: true, id: ID })
    const sql = query.mock.calls.map((x) => x[0] as string).join(' ')
    expect(sql).toContain('SET deleted_at = clock_timestamp()')
    expect(mocks.audit).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      eventType: 'extra_time_entry_deleted_by_manager',
      metadata: expect.objectContaining({ reason: 'Duplicidade', previous_snapshot: expect.any(Object) }),
    }))
  })

  it('não troca por descrição inativa e mantém a transação atômica', async () => {
    const { pool, query } = fakePool({ active: false })
    await expect(servicePatchExtraTimeEntryAsManager(pool, {
      id: ID, actorId: ID,
      body: {
        expectedUpdatedAt: DATE, reason: 'Correção', descriptionId: COLAB,
        entryDate: '2026-10-20', minutes: 30, notes: null,
      },
    })).rejects.toMatchObject({ status: 422 })
    expect(query.mock.calls.map((x) => x[0])).toContain('ROLLBACK')
    expect(mocks.audit).not.toHaveBeenCalled()
  })
})
