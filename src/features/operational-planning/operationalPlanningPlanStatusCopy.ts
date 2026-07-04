import type { OperationalPlanningWeekPayload } from '../../domain/operational-planning/operational-planning.types'
import { ApiError } from '../../lib/api/apiErrors'
import {
  isCanonicalOperationalWeekEnd,
  resolveOperationalWeekRange,
} from './operationalPlanningWeekRange'

/** Rótulos e mensagens do plano semanal (rascunho vs publicado ativo). */

export const PLAN_STATUS_DRAFT_LABEL = 'Rascunho'

export const PLAN_STATUS_PUBLISHED_LABEL = 'Publicado e ativo'

export const PLAN_PUBLISHED_HELPER_TEXT =
  'Este plano já está ativo na produção. Alterações salvas aqui atualizam a fila dos colaboradores.'

export const SAVE_DRAFT_SUCCESS_MESSAGE = 'Rascunho salvo.'

export const SAVE_PUBLISHED_SUCCESS_MESSAGE =
  'Alterações salvas no plano ativo. A fila de produção foi atualizada.'

export const SAVE_PUBLISHED_AUTO_SUCCESS_MESSAGE =
  'Alteração salva no plano publicado. A fila de produção foi atualizada.'

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

export function resolvePlanningSaveButtonLabel(
  planStatus: 'DRAFT' | 'PUBLISHED' | null | undefined,
): string {
  return planStatus === 'PUBLISHED' ? SAVE_BUTTON_PUBLISHED_LABEL : SAVE_BUTTON_DRAFT_LABEL
}

export function resolvePlanningSaveSuccessMessage(
  planStatus: 'DRAFT' | 'PUBLISHED' | null | undefined,
): string {
  return planStatus === 'PUBLISHED' ? SAVE_PUBLISHED_SUCCESS_MESSAGE : SAVE_DRAFT_SUCCESS_MESSAGE
}

export function resolvePlanningPublishButtonTitle(input: {
  planStatus: 'DRAFT' | 'PUBLISHED' | null | undefined
  draftItemsCount: number
}): string | undefined {
  if (input.planStatus === 'PUBLISHED') {
    return PUBLISH_DISABLED_ALREADY_PUBLISHED_TITLE
  }
  if (input.draftItemsCount === 0) {
    return PUBLISH_DISABLED_EMPTY_TITLE
  }
  return undefined
}
