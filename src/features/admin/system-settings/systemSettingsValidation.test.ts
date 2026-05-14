import { describe, expect, it } from 'vitest'
import {
  sessionSettingsUpdateKeys,
  shouldShowSessionIdleWarning,
  validateSessionSettingsDraft,
  WARNING_LT_TIMEOUT_MESSAGE,
} from './systemSettingsValidation'

describe('systemSettingsValidation', () => {
  it('valida warning menor que timeout', () => {
    expect(
      validateSessionSettingsDraft({
        timeoutMinutes: '30',
        warningMinutes: '5',
      }),
    ).toBeNull()
  })

  it('rejeita warning maior ou igual ao timeout', () => {
    expect(
      validateSessionSettingsDraft({
        timeoutMinutes: '10',
        warningMinutes: '10',
      }),
    ).toBe(WARNING_LT_TIMEOUT_MESSAGE)
  })

  it('exibe modal quando restante é menor ou igual ao warning configurado', () => {
    expect(shouldShowSessionIdleWarning(5 * 60_000, 5)).toBe(true)
    expect(shouldShowSessionIdleWarning(6 * 60_000, 5)).toBe(false)
  })

  it('atualiza aviso antes do timeout quando o novo timeout é menor que o aviso salvo', () => {
    expect(
      sessionSettingsUpdateKeys(6, 1, 45, 7),
    ).toEqual(['SESSION_IDLE_WARNING_MINUTES', 'SESSION_IDLE_TIMEOUT_MINUTES'])
  })
})
