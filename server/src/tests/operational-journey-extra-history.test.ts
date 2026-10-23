import type pg from 'pg'
import { describe, expect, it, vi } from 'vitest'
import { listExtraTimeEntriesInPeriodForCollaborators } from '../modules/operational-journey/operational-journey.repository.js'

const ID_ACTIVE = '11111111-1111-4111-8111-111111111111'
const ID_DELETED = '22222222-2222-4222-8222-222222222222'
const COLLABORATOR = '33333333-3333-4333-8333-333333333333'

describe('Jornada Extra Esteira — histórico e excluídos', () => {
  it('consulta registros excluídos e motivos de remoção sem omiti-los da lista', async () => {
    const rowBase = {
      collaborator_id: COLLABORATOR,
      collaborator_name: 'Colaborador',
      entry_date: '2026-10-20',
      minutes: 30,
      description: 'Limpeza',
      notes: null,
      origin: 'WEB',
      description_id: ID_ACTIVE,
      updated_at: new Date('2026-10-22T10:00:00.000Z'),
    }
    const query = vi.fn(async (sql: string) => {
      if (sql.includes('FROM operational_extra_time_entries e')) {
        return { rows: [
          { ...rowBase, id: ID_ACTIVE, deleted_at: null },
          { ...rowBase, id: ID_DELETED, deleted_at: new Date('2026-10-22T11:00:00.000Z') },
        ] }
      }
      if (sql.includes('FROM admin_audit_events a')) {
        return { rows: [{
          time_entry_id: ID_DELETED,
          event_type: 'extra_time_entry_deleted_by_manager',
          occurred_at: new Date('2026-10-22T11:00:00.000Z'),
          reason: 'Duplicidade',
          actor_label: 'admin@sgp.local',
          previous_snapshot: {
            descriptionId: ID_ACTIVE,
            entryDate: '2026-10-20',
            minutes: 30,
            notes: null,
          },
          new_snapshot: null,
          previous_description: 'Limpeza',
          new_description: null,
        }] }
      }
      throw new Error('SQL inesperado')
    })
    const pool = { query } as unknown as pg.Pool
    const rows = await listExtraTimeEntriesInPeriodForCollaborators(pool, {
      collaboratorIds: [COLLABORATOR],
      from: new Date('2026-10-19T03:00:00Z'),
      to: new Date('2026-10-21T02:59:59Z'),
      limit: 20,
    })
    expect(rows).toHaveLength(2)
    expect(rows[0]!.deleted_at).toBeNull()
    expect(rows[0]!.correction_history).toEqual([])
    expect(rows[1]!.deleted_at).toBeTruthy()
    expect(rows[1]!.correction_history[0]?.reason).toBe('Duplicidade')
    expect(query).toHaveBeenCalledTimes(2)
    const listSql = query.mock.calls[0]![0]
    expect(listSql).not.toContain('AND e.deleted_at IS NULL')
    const auditSql = query.mock.calls[1]![0]
    expect(auditSql).toContain("extra_time_entry_deleted_by_manager")
  })

  it('não consulta auditoria quando a janela está vazia', async () => {
    const query = vi.fn(async () => ({ rows: [] }))
    const pool = { query } as unknown as pg.Pool
    const entries = await listExtraTimeEntriesInPeriodForCollaborators(pool, {
      collaboratorIds: [COLLABORATOR],
      from: new Date('2026-10-19T03:00:00Z'),
      to: new Date('2026-10-21T02:59:59Z'),
      limit: 20,
    })
    expect(entries).toEqual([])
    expect(query).toHaveBeenCalledTimes(1)
  })
})
