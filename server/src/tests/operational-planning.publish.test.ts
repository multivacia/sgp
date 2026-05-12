import { describe, expect, it, vi } from 'vitest'
import type pg from 'pg'
import { AppError } from '../shared/errors/AppError.js'
import { ErrorCodes } from '../shared/errors/errorCodes.js'
import * as repo from '../modules/operational-planning/operational-planning.repository.js'
import { servicePublishOperationalWeekPlan } from '../modules/operational-planning/operational-planning.service.js'

describe('servicePublishOperationalWeekPlan — plano vazio', () => {
  it('rejeita publicação sem atividades com mensagem explícita', async () => {
    const pool = {} as pg.Pool
    vi.spyOn(repo, 'findOperationalWorkPlanById').mockResolvedValue({
      id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      week_start_date: '2026-05-11',
      week_end_date: '2026-05-15',
      status: 'DRAFT',
      created_by: 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff',
      published_at: null,
      published_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    vi.spyOn(repo, 'listEnrichedItemsForWorkPlan').mockResolvedValue([])

    await expect(
      servicePublishOperationalWeekPlan(pool, 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'user'),
    ).rejects.toMatchObject({
      message: 'Adicione ao menos uma atividade antes de publicar o plano.',
      statusCode: 400,
      code: ErrorCodes.VALIDATION_ERROR,
    } satisfies Partial<AppError>)

    vi.restoreAllMocks()
  })
})
