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
