import { describe, expect, it } from 'vitest'
import pg from 'pg'
import { randomUUID } from 'node:crypto'
import { postTimeEntryBodySchema } from '../modules/conveyors/conveyorAssignments.schemas.js'
import {
  resolveActivityPlannedTotalMinutes,
  sumExecutedQuantityFromEntries,
} from '../shared/activityOperationalQuantity.js'

const hasDb =
  Boolean(process.env.DATABASE_URL?.trim()) ||
  Boolean(process.env.PGHOST?.trim())

describe.skipIf(!hasDb)('activity operational quantity (integração)', () => {
  it('migration: colunas planned_quantity e executed_quantity existem', async () => {
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
    try {
      const r = await pool.query<{ col: string }>(
        `
        SELECT column_name AS col
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'conveyor_nodes'
          AND column_name = 'planned_quantity'
        UNION ALL
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'conveyor_time_entries'
          AND column_name = 'executed_quantity'
        `,
      )
      expect(r.rows.length).toBe(2)
    } finally {
      await pool.end()
    }
  })
})

describe('activity operational quantity (contratos)', () => {
  it('postTimeEntryBodySchema aceita executedQuantity 0 e rejeita negativo', () => {
    expect(
      postTimeEntryBodySchema.parse({ minutes: 10, executedQuantity: 0 }),
    ).toMatchObject({ executedQuantity: 0 })
    expect(() =>
      postTimeEntryBodySchema.parse({ minutes: 10, executedQuantity: -1 }),
    ).toThrow()
  })

  it('agregação soma executedQuantity por atividade', () => {
    expect(
      sumExecutedQuantityFromEntries([
        { executedQuantity: 2 },
        { executedQuantity: 1 },
        { executedQuantity: null },
      ]),
    ).toBe(3)
  })

  it('esteira com qty 3 × 10 min → total 30', () => {
    expect(resolveActivityPlannedTotalMinutes(10, 3)).toBe(30)
  })

  it('sanity id', () => {
    expect(randomUUID()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    )
  })
})
