import { describe, expect, it } from 'vitest'
import { ApiError } from '../../lib/api/apiErrors'
import type { OperationalPlanningWeekPayload } from '../../domain/operational-planning/operational-planning.types'
import {
  PLANNING_WEEK_DATES_MISMATCH_USER_MESSAGE,
  PLAN_STATUS_PUBLISHED_LABEL,
  PUBLISH_DISABLED_ALREADY_PUBLISHED_TITLE,
  SAVE_BUTTON_DRAFT_LABEL,
  SAVE_BUTTON_PUBLISHED_LABEL,
  SAVE_PUBLISHED_AUTO_SUCCESS_MESSAGE,
  resolvePlanningPublishButtonTitle,
  resolvePlanningSaveButtonLabel,
  resolvePlanningSaveErrorMessage,
  resolvePlanningSaveSuccessMessage,
  resolvePlanningSaveWeekDates,
  hasLegacyPlanWeekEndDate,
  LEGACY_PLAN_WEEK_END_NOTICE,
} from './operationalPlanningPlanStatusCopy'

function weekPayload(
  overrides: Partial<OperationalPlanningWeekPayload> = {},
): OperationalPlanningWeekPayload {
  return {
    hasPlan: false,
    week: {
      weekStartDate: '2026-05-11',
      weekEndDate: '2026-05-15',
      weekdayDates: ['2026-05-11', '2026-05-12', '2026-05-13', '2026-05-14', '2026-05-15'],
    },
    plan: null,
    summary: { plannedMinutes: 0, plannedItems: 0, collaboratorsCount: 0 },
    capacityByCollaboratorDay: [],
    executionOutsidePlanSummary: {
      totalMinutes: 0,
      entriesCount: 0,
      activitiesCount: 0,
      conveyorsCount: 0,
    },
    executionOutsidePlanEntries: [],
    ...overrides,
  }
}

describe('operationalPlanningPlanStatusCopy', () => {
  it('rótulo publicado comunica plano ativo', () => {
    expect(PLAN_STATUS_PUBLISHED_LABEL).toBe('Publicado e ativo')
  })

  it('botão de salvar depende do status', () => {
    expect(resolvePlanningSaveButtonLabel('DRAFT')).toBe(SAVE_BUTTON_DRAFT_LABEL)
    expect(resolvePlanningSaveButtonLabel('PUBLISHED')).toBe(SAVE_BUTTON_PUBLISHED_LABEL)
    expect(resolvePlanningSaveButtonLabel(null)).toBe(SAVE_BUTTON_DRAFT_LABEL)
  })

  it('mensagem de sucesso ao salvar depende do status', () => {
    expect(resolvePlanningSaveSuccessMessage('PUBLISHED')).toContain('fila de produção')
    expect(resolvePlanningSaveSuccessMessage('DRAFT')).toBe('Rascunho salvo.')
  })

  it('tooltip de publicar quando já publicado', () => {
    expect(
      resolvePlanningPublishButtonTitle({ planStatus: 'PUBLISHED', draftItemsCount: 3 }),
    ).toBe(PUBLISH_DISABLED_ALREADY_PUBLISHED_TITLE)
  })

  it('mensagem de auto-save em plano publicado', () => {
    expect(SAVE_PUBLISHED_AUTO_SUCCESS_MESSAGE).toContain('plano publicado')
    expect(SAVE_PUBLISHED_AUTO_SUCCESS_MESSAGE).toContain('fila de produção')
  })

  it('resolvePlanningSaveWeekDates usa week.* quando não há plano', () => {
    expect(resolvePlanningSaveWeekDates(weekPayload())).toEqual({
      weekStartDate: '2026-05-11',
      weekEndDate: '2026-05-15',
    })
  })

  it('resolvePlanningSaveWeekDates usa segunda do plano e sexta canônica', () => {
    expect(
      resolvePlanningSaveWeekDates(
        weekPayload({
          hasPlan: true,
          plan: {
            id: 'plan-1',
            weekStartDate: '2026-05-04',
            weekEndDate: '2026-05-08',
            status: 'DRAFT',
            publishedAt: null,
            items: [],
            createdAt: '2026-05-01T00:00:00.000Z',
            updatedAt: '2026-05-01T00:00:00.000Z',
          },
        }),
      ),
    ).toEqual({
      weekStartDate: '2026-05-04',
      weekEndDate: '2026-05-08',
    })
  })

  it('resolvePlanningSaveWeekDates ignora week_end_date legado (domingo)', () => {
    const payload = weekPayload({
      hasPlan: true,
      plan: {
        id: 'plan-legacy',
        weekStartDate: '2026-06-29',
        weekEndDate: '2026-07-05',
        status: 'DRAFT',
        publishedAt: null,
        items: [],
        createdAt: '2026-06-01T00:00:00.000Z',
        updatedAt: '2026-06-01T00:00:00.000Z',
      },
    })
    expect(resolvePlanningSaveWeekDates(payload)).toEqual({
      weekStartDate: '2026-06-29',
      weekEndDate: '2026-07-03',
    })
    expect(hasLegacyPlanWeekEndDate(payload)).toBe(true)
    expect(LEGACY_PLAN_WEEK_END_NOTICE).toContain('sexta-feira')
  })

  it('resolvePlanningSaveErrorMessage oculta mensagem técnica de datas', () => {
    const err = new ApiError(
      'Semana do corpo não coincide com o plano. Use weekStartDate/weekEndDate do plano.',
      400,
      { code: 'VALIDATION_ERROR' },
    )
    expect(resolvePlanningSaveErrorMessage(err, 'fallback')).toBe(
      PLANNING_WEEK_DATES_MISMATCH_USER_MESSAGE,
    )
  })

  it('resolvePlanningSaveErrorMessage oculta week_end_date não sexta-feira', () => {
    const err = new ApiError('week_end_date deve ser uma sexta-feira', 400, {
      code: 'VALIDATION_ERROR',
    })
    expect(resolvePlanningSaveErrorMessage(err, 'fallback')).toBe(
      PLANNING_WEEK_DATES_MISMATCH_USER_MESSAGE,
    )
  })

  it('resolvePlanningSaveErrorMessage preserva outras mensagens de ApiError', () => {
    const err = new ApiError('Plano não encontrado.', 404, { code: 'NOT_FOUND' })
    expect(resolvePlanningSaveErrorMessage(err, 'fallback')).toBe('Plano não encontrado.')
  })
})
