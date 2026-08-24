import { describe, expect, it } from 'vitest'
import {
  abortDialogCanConfirm,
  abortDialogConfirmPayload,
  abortDialogPlaceholderLabel,
  abortDialogRequiresComplement,
} from './abortConveyorStepDialogLogic'

const REASONS = [
  { code: 'NAO_MAIS_NECESSARIA', label: 'Não é mais necessária', requiresComplement: false },
  { code: 'OUTRO', label: 'Outro', requiresComplement: true },
  { code: 'CUSTOM_X', label: 'Custom', requiresComplement: true },
]

describe('abortConveyorStepDialogLogic', () => {
  it('placeholder inicia sem pré-seleção', () => {
    expect(abortDialogPlaceholderLabel(false)).toBe('Selecione um motivo...')
    expect(abortDialogPlaceholderLabel(true)).toBe('Carregando motivos…')
  })

  it('confirmação desabilitada sem motivo selecionado', () => {
    expect(
      abortDialogCanConfirm({
        busy: false,
        loadingReasons: false,
        loadError: null,
        reasons: REASONS,
        reasonCode: '',
        reasonText: '',
      }),
    ).toBe(false)
  })

  it('motivo sem complemento habilita confirmação', () => {
    expect(
      abortDialogCanConfirm({
        busy: false,
        loadingReasons: false,
        loadError: null,
        reasons: REASONS,
        reasonCode: 'NAO_MAIS_NECESSARIA',
        reasonText: '',
      }),
    ).toBe(true)
    expect(abortDialogRequiresComplement(REASONS, 'NAO_MAIS_NECESSARIA')).toBe(false)
  })

  it('motivo com complemento exige texto', () => {
    expect(abortDialogRequiresComplement(REASONS, 'CUSTOM_X')).toBe(true)
    expect(
      abortDialogCanConfirm({
        busy: false,
        loadingReasons: false,
        loadError: null,
        reasons: REASONS,
        reasonCode: 'CUSTOM_X',
        reasonText: '',
      }),
    ).toBe(false)
    expect(
      abortDialogCanConfirm({
        busy: false,
        loadingReasons: false,
        loadError: null,
        reasons: REASONS,
        reasonCode: 'CUSTOM_X',
        reasonText: '  detalhe  ',
      }),
    ).toBe(true)
  })

  it('payload limpa complemento quando motivo não exige', () => {
    expect(
      abortDialogConfirmPayload({
        reasons: REASONS,
        reasonCode: 'NAO_MAIS_NECESSARIA',
        reasonText: 'texto residual',
      }),
    ).toEqual({ reasonCode: 'NAO_MAIS_NECESSARIA', reasonText: null })
  })

  it('payload inclui complemento trimado quando exigido', () => {
    expect(
      abortDialogConfirmPayload({
        reasons: REASONS,
        reasonCode: 'OUTRO',
        reasonText: '  Cliente pediu  ',
      }),
    ).toEqual({ reasonCode: 'OUTRO', reasonText: 'Cliente pediu' })
  })

  it('erro de carga ou catálogo vazio desabilita confirmação', () => {
    expect(
      abortDialogCanConfirm({
        busy: false,
        loadingReasons: false,
        loadError: 'Não foi possível carregar os motivos de dispensa.',
        reasons: [],
        reasonCode: '',
        reasonText: '',
      }),
    ).toBe(false)
    expect(
      abortDialogCanConfirm({
        busy: false,
        loadingReasons: false,
        loadError: 'Não há motivos de dispensa ativos cadastrados.',
        reasons: [],
        reasonCode: '',
        reasonText: '',
      }),
    ).toBe(false)
  })

  it('busy ou loading desabilitam confirmação', () => {
    expect(
      abortDialogCanConfirm({
        busy: true,
        loadingReasons: false,
        loadError: null,
        reasons: REASONS,
        reasonCode: 'NAO_MAIS_NECESSARIA',
        reasonText: '',
      }),
    ).toBe(false)
    expect(
      abortDialogCanConfirm({
        busy: false,
        loadingReasons: true,
        loadError: null,
        reasons: REASONS,
        reasonCode: 'NAO_MAIS_NECESSARIA',
        reasonText: '',
      }),
    ).toBe(false)
  })
})
