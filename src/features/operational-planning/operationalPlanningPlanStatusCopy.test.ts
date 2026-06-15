import { describe, expect, it } from 'vitest'
import {
  PLAN_STATUS_PUBLISHED_LABEL,
  PUBLISH_DISABLED_ALREADY_PUBLISHED_TITLE,
  SAVE_BUTTON_DRAFT_LABEL,
  SAVE_BUTTON_PUBLISHED_LABEL,
  SAVE_PUBLISHED_AUTO_SUCCESS_MESSAGE,
  resolvePlanningPublishButtonTitle,
  resolvePlanningSaveButtonLabel,
  resolvePlanningSaveSuccessMessage,
} from './operationalPlanningPlanStatusCopy'

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
})
