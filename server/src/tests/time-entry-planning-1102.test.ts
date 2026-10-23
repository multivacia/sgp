import type pg from 'pg'
import { describe, expect, it, vi } from 'vitest'
import {
  getTimeEntryPlanningEligibility,
  requireTimeEntryPlanningEligibility,
  VALID_PUBLISHED_PLANNED_ITEMS_CTE,
} from '../modules/operational-planning/time-entry-planning.repository.js'
import { listTimeEntryCandidatesPage } from '../modules/my-activities/my-activities.repository.js'
import { listPlannedOpenJourneyRows } from '../modules/operational-journey/operational-journey.repository.js'

const COLLAB = '11111111-1111-4111-8111-111111111111'
const STEP = '22222222-2222-4222-8222-222222222222'
const CONVEYOR = '33333333-3333-4333-8333-333333333333'
const FROM = new Date('2026-10-20T03:00:00.000Z')
const TO = new Date('2026-10-27T02:59:59.999Z')

const eligibilityInput = {
  conveyorId: CONVEYOR,
  stepNodeId: STEP,
  collaboratorId: COLLAB,
}

describe('1.10.2 — autorização por planejamento publicado', () => {
  it('distingue planejamento próprio, de terceiros e inexistente', async () => {
    for (const [row, expected] of [
      [{ mine_count: 2, any_count: 3, mine_minutes: '180' }, 'MINE'],
      [{ mine_count: 0, any_count: 1, mine_minutes: null }, 'OTHER'],
      [{ mine_count: 0, any_count: 0, mine_minutes: null }, 'NONE'],
    ] as const) {
      const query = vi.fn(async () => ({ rows: [row] }))
      const pool = { query } as unknown as pg.Pool
      const actual = await getTimeEntryPlanningEligibility(pool, eligibilityInput)
      expect(actual.scope).toBe(expected)
      expect(actual.plannedMinutesForCollaborator).toBe(expected === 'MINE' ? 180 : null)
      expect(query.mock.calls[0]![0]).toContain('WITH ' + VALID_PUBLISHED_PLANNED_ITEMS_CTE)
    }
  })

  it('recusa atividade sem nenhum responsável planejado, mesmo com justificativa', async () => {
    const pool = {
      query: vi.fn(async () => ({
        rows: [{ mine_count: 0, any_count: 0, mine_minutes: null }],
      })),
    } as unknown as pg.Pool
    await expect(requireTimeEntryPlanningEligibility(pool, eligibilityInput)).rejects.toMatchObject({
      statusCode: 422,
    })
  })

  it('exclui versões substituídas, itens sem responsável e não planejados na fonte canônica', () => {
    expect(VALID_PUBLISHED_PLANNED_ITEMS_CTE).toContain('DISTINCT ON (p.week_start_date)')
    expect(VALID_PUBLISHED_PLANNED_ITEMS_CTE).toContain("p.status = 'PUBLISHED'")
    expect(VALID_PUBLISHED_PLANNED_ITEMS_CTE).toContain("i.status = 'PLANNED'")
    expect(VALID_PUBLISHED_PLANNED_ITEMS_CTE).toContain('i.assigned_collaborator_id IS NOT NULL')
  })
})

describe('1.10.2 — listagens filtra antes de paginar', () => {
  it('Apontar horas aplica plano publicado, pesquisa e cursor no SQL único', async () => {
    const query = vi.fn(async () => ({ rows: [] }))
    const pool = { query } as unknown as pg.Pool
    const rows = await listTimeEntryCandidatesPage(pool, {
      collaboratorId: COLLAB,
      q: '7467',
      conveyorQ: '7467',
      activityQ: 'revestir',
      referenceDate: '2026-10-22',
      includeUnassigned: true,
      after: null,
      fetchLimit: 51,
    })
    expect(rows).toEqual([])
    const sql = String(query.mock.calls[0]![0])
    expect(sql).toContain('WITH ' + VALID_PUBLISHED_PLANNED_ITEMS_CTE)
    expect(sql).toContain('step_plans')
    expect(sql).toContain('sp.is_mine OR $6::boolean')
    expect(sql).toContain('ORDER BY')
    expect(sql).toContain('LIMIT $15::int')
    expect(sql).not.toContain('assigned_ranked')
    expect(query.mock.calls[0]![1]).toHaveLength(15)
    expect((query.mock.calls[0]![1] as unknown[]).at(-1)).toBe(51)
  })

  it('Jornada seleciona colaborador, período e OS antes do limite de 20', async () => {
    const query = vi.fn(async () => ({ rows: [] }))
    const pool = { query } as unknown as pg.Pool
    const rows = await listPlannedOpenJourneyRows(pool, {
      collaboratorIds: [COLLAB],
      from: FROM,
      to: TO,
      conveyorId: null,
      conveyorCode: '7467',
      limit: 21,
      offset: 20,
    })
    expect(rows).toEqual([])
    const sql = String(query.mock.calls[0]![0])
    expect(sql).toContain('WITH ' + VALID_PUBLISHED_PLANNED_ITEMS_CTE)
    expect(sql).toContain('vi.planned_date >=')
    expect(sql).toContain('vi.assigned_collaborator_id = ANY($1::uuid[])')
    expect(sql).toContain('cv.code = $5::text')
    expect(sql).toContain('COUNT(*) OVER()')
    expect(sql).toContain('LIMIT $6::int OFFSET $7::int')
    expect(query.mock.calls[0]![1]).toEqual([[COLLAB], FROM, TO, null, '7467', 21, 20])
  })
})
