import { afterEach, describe, expect, it, vi } from 'vitest'
import type pg from 'pg'
import { AppError } from '../shared/errors/AppError.js'
import { ErrorCodes } from '../shared/errors/errorCodes.js'
import * as repo from '../modules/operational-planning/operational-planning.repository.js'
import type { PlanItemWeeklyViewRow } from '../modules/operational-planning/operational-planning.repository.js'
import {
  resolveWeeklyViewSituation,
  serviceExportOperationalPlanningWeeklyViewXlsx,
} from '../modules/operational-planning/operational-planning.weekly-view.service.js'

const pool = {} as pg.Pool

function samplePlanItemRow(overrides: Partial<PlanItemWeeklyViewRow> = {}): PlanItemWeeklyViewRow {
  return {
    id: 'item-1',
    assigned_collaborator_id: 'col-1',
    assigned_collaborator_name: 'Maria Silva',
    planned_date: '2026-09-07',
    planned_order: 0,
    planned_minutes: 90,
    conveyor_title: 'Esteira Demo',
    activity_title: 'Atividade A',
    notes: null,
    ...overrides,
  }
}

function samplePlanRow(status: 'DRAFT' | 'PUBLISHED', id: string) {
  return {
    id,
    week_start_date: '2026-09-07',
    week_end_date: '2026-09-11',
    status,
    created_by: 'user-1',
    published_at: status === 'PUBLISHED' ? new Date().toISOString() : null,
    published_by: status === 'PUBLISHED' ? 'user-1' : null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

describe('resolveWeeklyViewSituation', () => {
  it('RASCUNHO quando só há draft', () => {
    expect(resolveWeeklyViewSituation(true, false)).toBe('RASCUNHO')
  })
  it('PUBLICADO quando só há published', () => {
    expect(resolveWeeklyViewSituation(false, true)).toBe('PUBLICADO')
  })
  it('REVISAO_NAO_PUBLICADA quando há draft e published', () => {
    expect(resolveWeeklyViewSituation(true, true)).toBe('REVISAO_NAO_PUBLICADA')
  })
  it('PUBLICADO como fallback quando não há nem draft nem published (nunca deveria ocorrer)', () => {
    expect(resolveWeeklyViewSituation(false, false)).toBe('PUBLICADO')
  })
})

describe('serviceExportOperationalPlanningWeeklyViewXlsx', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('lança erro de domínio 404 (não 500) quando não há plano na semana', async () => {
    vi.spyOn(repo, 'findDraftOperationalWorkPlanByWeekStart').mockResolvedValue(null)
    vi.spyOn(repo, 'findPublishedOperationalWorkPlanByWeekStart').mockResolvedValue(null)

    await expect(
      serviceExportOperationalPlanningWeeklyViewXlsx(pool, '2026-09-07'),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: ErrorCodes.NOT_FOUND,
    } satisfies Partial<AppError>)
  })

  it('lança erro de domínio 400 (não 500) quando o plano não tem itens — sem gerar arquivo vazio', async () => {
    vi.spyOn(repo, 'findDraftOperationalWorkPlanByWeekStart').mockResolvedValue(
      samplePlanRow('DRAFT', 'plan-1'),
    )
    vi.spyOn(repo, 'findPublishedOperationalWorkPlanByWeekStart').mockResolvedValue(null)
    vi.spyOn(repo, 'listItemsForWorkPlanWeeklyView').mockResolvedValue([])

    await expect(
      serviceExportOperationalPlanningWeeklyViewXlsx(pool, '2026-09-07'),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: ErrorCodes.VALIDATION_ERROR,
    } satisfies Partial<AppError>)
  })

  it('seleciona DRAFT (draft ?? published) quando ambos existem', async () => {
    vi.spyOn(repo, 'findDraftOperationalWorkPlanByWeekStart').mockResolvedValue(
      samplePlanRow('DRAFT', 'plan-draft'),
    )
    vi.spyOn(repo, 'findPublishedOperationalWorkPlanByWeekStart').mockResolvedValue(
      samplePlanRow('PUBLISHED', 'plan-published'),
    )
    const spy = vi
      .spyOn(repo, 'listItemsForWorkPlanWeeklyView')
      .mockResolvedValue([samplePlanItemRow()])

    const out = await serviceExportOperationalPlanningWeeklyViewXlsx(pool, '2026-09-07')
    expect(spy).toHaveBeenCalledWith(pool, 'plan-draft')
    expect(out.filename).toBe(
      'planejamento-semanal-visao-2026-09-07-a-2026-09-11-revisao-nao-publicada.xlsx',
    )
  })

  it('resolve situação RASCUNHO/PUBLICADO no nome do arquivo', async () => {
    vi.spyOn(repo, 'findDraftOperationalWorkPlanByWeekStart').mockResolvedValue(
      samplePlanRow('DRAFT', 'plan-1'),
    )
    vi.spyOn(repo, 'findPublishedOperationalWorkPlanByWeekStart').mockResolvedValue(null)
    vi.spyOn(repo, 'listItemsForWorkPlanWeeklyView').mockResolvedValue([samplePlanItemRow()])

    const out = await serviceExportOperationalPlanningWeeklyViewXlsx(pool, '2026-09-07')
    expect(out.filename).toBe(
      'planejamento-semanal-visao-2026-09-07-a-2026-09-11-rascunho.xlsx',
    )
    expect(Buffer.isBuffer(out.buffer)).toBe(true)
  })

  it('meta: totalActivities, totalPlannedMinutes (nulls como 0) e collaboratorsWithActivityCount', async () => {
    vi.spyOn(repo, 'findDraftOperationalWorkPlanByWeekStart').mockResolvedValue(
      samplePlanRow('DRAFT', 'plan-1'),
    )
    vi.spyOn(repo, 'findPublishedOperationalWorkPlanByWeekStart').mockResolvedValue(null)
    vi.spyOn(repo, 'listItemsForWorkPlanWeeklyView').mockResolvedValue([
      samplePlanItemRow({ id: 'i1', assigned_collaborator_id: 'col-1', planned_minutes: 90 }),
      samplePlanItemRow({ id: 'i2', assigned_collaborator_id: 'col-1', planned_minutes: null }),
      samplePlanItemRow({ id: 'i3', assigned_collaborator_id: 'col-2', planned_minutes: 30 }),
    ])

    const buildBuffer = await import(
      '../modules/operational-planning/operational-planning.weekly-view.export.js'
    )
    const spyBuild = vi.spyOn(buildBuffer, 'buildOperationalPlanningWeeklyViewExportWorkbookBuffer')

    await serviceExportOperationalPlanningWeeklyViewXlsx(pool, '2026-09-07')

    expect(spyBuild).toHaveBeenCalledTimes(1)
    const call = spyBuild.mock.calls[0]?.[0]
    expect(call?.meta.totalActivities).toBe(3)
    expect(call?.meta.totalPlannedMinutes).toBe(120)
    expect(call?.meta.collaboratorsWithActivityCount).toBe(2)
  })
})
