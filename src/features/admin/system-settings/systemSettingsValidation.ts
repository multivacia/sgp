export const SESSION_IDLE_TIMEOUT_KEY = 'SESSION_IDLE_TIMEOUT_MINUTES'
export const SESSION_IDLE_WARNING_KEY = 'SESSION_IDLE_WARNING_MINUTES'

export const TIMEOUT_MIN_MINUTES = 5
export const TIMEOUT_MAX_MINUTES = 480
export const WARNING_MIN_MINUTES = 1
export const WARNING_MAX_MINUTES = 30

export const WARNING_LT_TIMEOUT_MESSAGE =
  'O aviso deve ser menor que o tempo total de inatividade.'

export type SessionSettingsDraft = {
  timeoutMinutes: string
  warningMinutes: string
}

export function validateSessionSettingsDraft(
  draft: SessionSettingsDraft,
): string | null {
  const timeoutTrimmed = draft.timeoutMinutes.trim()
  const warningTrimmed = draft.warningMinutes.trim()
  if (!/^\d+$/.test(timeoutTrimmed) || !/^\d+$/.test(warningTrimmed)) {
    return 'Informe valores inteiros válidos para timeout e aviso.'
  }

  const timeout = Number.parseInt(timeoutTrimmed, 10)
  const warning = Number.parseInt(warningTrimmed, 10)
  if (
    !Number.isInteger(timeout) ||
    timeout < TIMEOUT_MIN_MINUTES ||
    timeout > TIMEOUT_MAX_MINUTES
  ) {
    return `Informe um timeout entre ${TIMEOUT_MIN_MINUTES} e ${TIMEOUT_MAX_MINUTES} minutos.`
  }
  if (
    !Number.isInteger(warning) ||
    warning < WARNING_MIN_MINUTES ||
    warning > WARNING_MAX_MINUTES
  ) {
    return `Informe um aviso entre ${WARNING_MIN_MINUTES} e ${WARNING_MAX_MINUTES} minutos.`
  }
  if (warning >= timeout) {
    return WARNING_LT_TIMEOUT_MESSAGE
  }
  return null
}

export function shouldShowSessionIdleWarning(
  remainingMs: number,
  warningMinutes: number,
): boolean {
  return remainingMs > 0 && remainingMs <= warningMinutes * 60_000
}

export function sessionSettingsUpdateKeys(
  timeoutValue: number,
  warningValue: number,
  storedTimeout: number,
  storedWarning: number,
): Array<typeof SESSION_IDLE_TIMEOUT_KEY | typeof SESSION_IDLE_WARNING_KEY> {
  const patchWarningFirst =
    timeoutValue <= storedWarning || warningValue >= storedTimeout
  if (patchWarningFirst) {
    return [SESSION_IDLE_WARNING_KEY, SESSION_IDLE_TIMEOUT_KEY]
  }
  return [SESSION_IDLE_TIMEOUT_KEY, SESSION_IDLE_WARNING_KEY]
}
