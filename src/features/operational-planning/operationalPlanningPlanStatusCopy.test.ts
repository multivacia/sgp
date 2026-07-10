import { describe, expect, it } from 'vitest'
import { ApiError } from '../../lib/api/apiErrors'
import type { OperationalPlanningWeekPayload } from '../../domain/operational-planning/operational-planning.types'
import {
  PLANNING_WEEK_DATES_MISMATCH_USER_MESSAGE,
  PLAN_STATUS_PUBLISHED_LABEL,
  PLAN_STATUS_REVISION_LABEL,
  PLAN_UNPUBLISHED_CHANGES_BADGE,
  PUBLISH_DISABLED_ALREADY_PUBLISHED_TITLE,
  PUBLISH_SUCCESS_MESSAGE,
  SAVE_BUTTON_DRAFT_LABEL,
  SAVE_BUTTON_PUBLISHED_LABEL,
  SAVE_DRAFT_SUCCESS_MESSAGE,
  SAVE_REVISION_SUCCESS_MESSAGE,
  isPlanningPublishDisabled,
  resolvePlanningPublishButtonTitle,
  resolvePlanningRevisionContext,
  resolvePlanningSaveButtonLabel,
  resolvePlanningSaveErrorMessage,
  resolvePlanningSaveSuccessMessage,
  resolvePlanningSaveWeekDates,
  resolvePlanningStatusBadgeLabel,
  shouldAutoPersistPlanChanges,
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
    revision: {
      hasActivePublished: false,
      activePublishedPlanId: null,
      activePublishedAt: null,
      hasUnpublishedRevision: false,
    },
    plan: null,
    summary: { plannedMinutes: 0, plannedItems: 0, collaboratorsCount: 0 },
    capacityByCollaboratorDay: [],
    capacity: {
      summary: {
        collaboratorsCount: 0,
        totalPlannedMinutes: 0,
        totalOverloadMinutes: 0,
        byStatus: {
          SEM_CAPACIDADE_CADASTRADA: 0,
          DISPONIVEL: 0,
          PROXIMO_DO_LIMITE: 0,
          ACIMA_DA_CAPACIDADE: 0,
          SOBRECARGA_CRITICA: 0,
        },
      },
      collaborators: [],
    },
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
  it('rótulo publicado vigente', () => {
    expect(PLAN_STATUS_PUBLISHED_LABEL).toBe('Publicado vigente')
    expect(
      resolvePlanningStatusBadgeLabel({
        planStatus: 'PUBLISHED',
        hasActivePublished: true,
        hasUnpublishedRevision: false,
      }),
    ).toBe('Publicado vigente')
  })

  it('rótulo revisão em planejamento', () => {
    expect(
      resolvePlanningStatusBadgeLabel({
        planStatus: 'DRAFT',
        hasActivePublished: true,
        hasUnpublishedRevision: true,
      }),
    ).toBe(PLAN_STATUS_REVISION_LABEL)
  })

  it('botão de salvar depende do status', () => {
    expect(resolvePlanningSaveButtonLabel('DRAFT')).toBe(SAVE_BUTTON_DRAFT_LABEL)
    expect(resolvePlanningSaveButtonLabel('PUBLISHED')).toBe(SAVE_BUTTON_PUBLISHED_LABEL)
    expect(resolvePlanningSaveButtonLabel(null)).toBe(SAVE_BUTTON_DRAFT_LABEL)
  })

  it('mensagem de salvar revisão não promete atualização da fila', () => {
    expect(
      resolvePlanningSaveSuccessMessage({
        planStatus: 'DRAFT',
        hasActivePublished: true,
        hasUnpublishedRevision: true,
      }),
    ).toBe(SAVE_REVISION_SUCCESS_MESSAGE)
    expect(
      resolvePlanningSaveSuccessMessage({
        planStatus: 'PUBLISHED',
        hasActivePublished: true,
        hasUnpublishedRevision: false,
      }),
    ).toBe(SAVE_REVISION_SUCCESS_MESSAGE)
    expect(
      resolvePlanningSaveSuccessMessage({
        planStatus: 'DRAFT',
        hasActivePublished: false,
        hasUnpublishedRevision: false,
      }),
    ).toBe(SAVE_DRAFT_SUCCESS_MESSAGE)
  })

  it('botão publicar habilitado quando há revisão DRAFT', () => {
    expect(
      isPlanningPublishDisabled({
        busy: false,
        dirty: false,
        draftItemsCount: 2,
        hasPlan: true,
        planStatus: 'DRAFT',
      }),
    ).toBe(false)
  })

  it('tooltip de publicar quando já publicado sem revisão', () => {
    expect(
      resolvePlanningPublishButtonTitle({ planStatus: 'PUBLISHED', draftItemsCount: 3 }),
    ).toBe(PUBLISH_DISABLED_ALREADY_PUBLISHED_TITLE)
    expect(
      isPlanningPublishDisabled({
        busy: false,
        dirty: false,
        draftItemsCount: 3,
        hasPlan: true,
        planStatus: 'PUBLISHED',
      }),
    ).toBe(true)
  })

  it('auto-persist ao remover item quando há publicado vigente', () => {
    expect(
      shouldAutoPersistPlanChanges(
        weekPayload({
          hasPlan: true,
          revision: {
            hasActivePublished: true,
            activePublishedPlanId: 'pub-1',
            activePublishedAt: '2026-05-10T00:00:00.000Z',
            hasUnpublishedRevision: true,
          },
          plan: {
            id: 'draft-1',
            weekStartDate: '2026-05-11',
            weekEndDate: '2026-05-15',
            status: 'DRAFT',
            publishedAt: null,
            items: [],
            createdAt: '2026-05-01T00:00:00.000Z',
            updatedAt: '2026-05-01T00:00:00.000Z',
          },
        }),
      ),
    ).toBe(true)
  })

  it('mensagem de publicação confirma atualização da fila', () => {
    expect(PUBLISH_SUCCESS_MESSAGE).toContain('fila dos colaboradores')
  })

  it('badge de alterações não publicadas', () => {
    expect(PLAN_UNPUBLISHED_CHANGES_BADGE).toBe('Alterações não publicadas')
  })

  it('resolvePlanningRevisionContext lê metadados da semana', () => {
    expect(
      resolvePlanningRevisionContext(
        weekPayload({
          revision: {
            hasActivePublished: true,
            activePublishedPlanId: 'pub-1',
            activePublishedAt: null,
            hasUnpublishedRevision: true,
          },
        }),
      ),
    ).toEqual({
      planStatus: undefined,
      hasActivePublished: true,
      hasUnpublishedRevision: true,
    })
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
