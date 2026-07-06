import type { OperationalPlanningWeekPayload } from '../../domain/operational-planning/operational-planning.types'
import { ApiError } from '../../lib/api/apiErrors'
import {
  isCanonicalOperationalWeekEnd,
  resolveOperationalWeekRange,
} from './operationalPlanningWeekRange'

/** Rótulos e mensagens do plano semanal (rascunho, publicado vigente, revisão). */

export const PLAN_STATUS_DRAFT_LABEL = 'Rascunho'

export const PLAN_STATUS_PUBLISHED_LABEL = 'Publicado vigente'

export const PLAN_STATUS_REVISION_LABEL = 'Revisão em planejamento'

export const PLAN_UNPUBLISHED_CHANGES_BADGE = 'Alterações não publicadas'

export const PLAN_PUBLISHED_HELPER_TEXT =
  'Este plano possui uma versão publicada ativa. Alterações salvas ficam em revisão e só entram na fila dos colaboradores após nova publicação.'

export const SAVE_DRAFT_SUCCESS_MESSAGE = 'Rascunho salvo.'

export const SAVE_REVISION_SUCCESS_MESSAGE =
  'Revisão salva. A fila dos colaboradores continua usando a última versão publicada.'

/** @deprecated Use SAVE_REVISION_SUCCESS_MESSAGE */
export const SAVE_PUBLISHED_SUCCESS_MESSAGE = SAVE_REVISION_SUCCESS_MESSAGE

/** @deprecated Use SAVE_REVISION_SUCCESS_MESSAGE */
export const SAVE_PUBLISHED_AUTO_SUCCESS_MESSAGE = SAVE_REVISION_SUCCESS_MESSAGE

export const PUBLISH_SUCCESS_MESSAGE =
  'Plano publicado. A fila dos colaboradores foi atualizada.'

export const SAVE_BUTTON_DRAFT_LABEL = 'Salvar rascunho'

export const SAVE_BUTTON_PUBLISHED_LABEL = 'Salvar alterações'

export const PUBLISH_BUTTON_LABEL = 'Publicar plano'

export const PUBLISH_DISABLED_ALREADY_PUBLISHED_TITLE = 'Este plano já está publicado.'

export const PUBLISH_DISABLED_EMPTY_TITLE =
  'Adicione ao menos uma atividade antes de publicar o plano.'

/** Mensagem exibida quando o backend rejeita datas divergentes entre corpo e plano persistido. */
export const PLANNING_WEEK_DATES_MISMATCH_USER_MESSAGE =
  'As datas deste plano estão inconsistentes. Recarregue a semana e tente novamente. Se o problema continuar, acione o suporte.'

/** Plano legado com week_end_date fora da segunda–sexta (ex.: domingo no banco). */
export const LEGACY_PLAN_WEEK_END_NOTICE =
  'A data de fim deste plano está inconsistente no sistema (não é uma sexta-feira). A tela exibe a semana operacional correta (segunda a sexta). Ao salvar, a data será normalizada automaticamente.'

const PLANNING_WEEK_DATES_MISMATCH_TECHNICAL =
  'Semana do corpo não coincide com o plano. Use weekStartDate/weekEndDate do plano.'

const PLANNING_WEEK_END_NOT_FRIDAY_TECHNICAL = 'week_end_date deve ser uma sexta-feira'

export type PlanningSaveWeekDates = {
  weekStartDate: string
  weekEndDate: string
}

export type PlanningRevisionContext = {
  planStatus: 'DRAFT' | 'PUBLISHED' | null | undefined
  hasActivePublished: boolean
  hasUnpublishedRevision: boolean
}

export function resolvePlanningRevisionContext(
  weekPayload: OperationalPlanningWeekPayload | null | undefined,
): PlanningRevisionContext {
  return {
    planStatus: weekPayload?.plan?.status,
    hasActivePublished: weekPayload?.revision?.hasActivePublished ?? false,
    hasUnpublishedRevision: weekPayload?.revision?.hasUnpublishedRevision ?? false,
  }
}

export function shouldAutoPersistPlanChanges(
  weekPayload: OperationalPlanningWeekPayload | null | undefined,
): boolean {
  const ctx = resolvePlanningRevisionContext(weekPayload)
  return ctx.hasActivePublished || ctx.planStatus === 'PUBLISHED'
}

/**
 * Datas canônicas da semana operacional (segunda–sexta) para exibição e save.
 * A segunda vem do plano persistido (se existir) ou do GET da semana;
 * a sexta é sempre derivada (+4 dias), nunca lida diretamente de plan.weekEndDate legado.
 */
export function resolvePlanningSaveWeekDates(
  weekPayload: OperationalPlanningWeekPayload,
): PlanningSaveWeekDates {
  const weekStartDate = weekPayload.plan?.weekStartDate ?? weekPayload.week.weekStartDate
  return resolveOperationalWeekRange(weekStartDate)
}

/** Plano persistido com week_end_date fora do padrão segunda–sexta (dado legado). */
export function hasLegacyPlanWeekEndDate(weekPayload: OperationalPlanningWeekPayload): boolean {
  if (!weekPayload.plan) return false
  return !isCanonicalOperationalWeekEnd(
    weekPayload.plan.weekStartDate,
    weekPayload.plan.weekEndDate,
  )
}

export function resolvePlanningSaveErrorMessage(e: unknown, fallback: string): string {
  if (e instanceof ApiError) {
    if (
      e.code === 'VALIDATION_ERROR' &&
      (e.message === PLANNING_WEEK_DATES_MISMATCH_TECHNICAL ||
        e.message.includes('weekStartDate/weekEndDate') ||
        e.message.includes(PLANNING_WEEK_END_NOT_FRIDAY_TECHNICAL) ||
        e.message.includes('weekEndDate deve ser a sexta-feira'))
    ) {
      return PLANNING_WEEK_DATES_MISMATCH_USER_MESSAGE
    }
    if (e.message.trim()) return e.message
  }
  return fallback
}

export function resolvePlanningStatusBadgeLabel(
  ctx: PlanningRevisionContext,
): string {
  if (ctx.planStatus === 'DRAFT' && ctx.hasActivePublished) {
    return PLAN_STATUS_REVISION_LABEL
  }
  if (ctx.planStatus === 'PUBLISHED') {
    return PLAN_STATUS_PUBLISHED_LABEL
  }
  return PLAN_STATUS_DRAFT_LABEL
}

export function resolvePlanningSaveButtonLabel(
  planStatus: 'DRAFT' | 'PUBLISHED' | null | undefined,
): string {
  return planStatus === 'PUBLISHED' ? SAVE_BUTTON_PUBLISHED_LABEL : SAVE_BUTTON_DRAFT_LABEL
}

export function resolvePlanningSaveSuccessMessage(
  ctx: PlanningRevisionContext,
): string {
  if (ctx.hasActivePublished || ctx.planStatus === 'PUBLISHED') {
    return SAVE_REVISION_SUCCESS_MESSAGE
  }
  return SAVE_DRAFT_SUCCESS_MESSAGE
}

export function resolvePlanningPublishButtonTitle(input: {
  planStatus: 'DRAFT' | 'PUBLISHED' | null | undefined
  draftItemsCount: number
  hasActivePublished?: boolean
}): string | undefined {
  if (input.planStatus === 'PUBLISHED') {
    return PUBLISH_DISABLED_ALREADY_PUBLISHED_TITLE
  }
  if (input.draftItemsCount === 0) {
    return PUBLISH_DISABLED_EMPTY_TITLE
  }
  return undefined
}

export function isPlanningPublishDisabled(input: {
  busy: boolean
  dirty: boolean
  draftItemsCount: number
  hasPlan: boolean
  planStatus: 'DRAFT' | 'PUBLISHED' | null | undefined
}): boolean {
  return (
    input.busy ||
    input.dirty ||
    input.draftItemsCount === 0 ||
    !input.hasPlan ||
    input.planStatus !== 'DRAFT'
  )
}
