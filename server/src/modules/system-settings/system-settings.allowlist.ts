import {
  SESSION_IDLE_TIMEOUT_MAX_MINUTES,
  SESSION_IDLE_TIMEOUT_MIN_MINUTES,
  SESSION_IDLE_TIMEOUT_SETTING_KEY,
  SESSION_IDLE_WARNING_MAX_MINUTES,
  SESSION_IDLE_WARNING_MIN_MINUTES,
  SESSION_IDLE_WARNING_SETTING_KEY,
} from './session-timeout.config.js'

export type AllowlistedSystemSettingKey =
  | typeof SESSION_IDLE_TIMEOUT_SETTING_KEY
  | typeof SESSION_IDLE_WARNING_SETTING_KEY

export type AllowlistedSystemSettingMeta = {
  key: AllowlistedSystemSettingKey
  valueType: 'INTEGER'
  description: string
  minValue: number
  maxValue: number
  isSensitive: true
}

export const ALLOWLISTED_SYSTEM_SETTINGS: readonly AllowlistedSystemSettingMeta[] = [
  {
    key: SESSION_IDLE_TIMEOUT_SETTING_KEY,
    valueType: 'INTEGER',
    description:
      'Tempo máximo de inatividade da sessão antes de exigir novo login, em minutos.',
    minValue: SESSION_IDLE_TIMEOUT_MIN_MINUTES,
    maxValue: SESSION_IDLE_TIMEOUT_MAX_MINUTES,
    isSensitive: true,
  },
  {
    key: SESSION_IDLE_WARNING_SETTING_KEY,
    valueType: 'INTEGER',
    description:
      'Minutos antes da expiração por inatividade em que o frontend deve exibir aviso preventivo.',
    minValue: SESSION_IDLE_WARNING_MIN_MINUTES,
    maxValue: SESSION_IDLE_WARNING_MAX_MINUTES,
    isSensitive: true,
  },
]

const allowlistByKey = new Map(
  ALLOWLISTED_SYSTEM_SETTINGS.map((item) => [item.key, item]),
)

export function isAllowlistedSystemSettingKey(
  key: string,
): key is AllowlistedSystemSettingKey {
  return allowlistByKey.has(key as AllowlistedSystemSettingKey)
}

export function getAllowlistedSystemSettingMeta(
  key: string,
): AllowlistedSystemSettingMeta | undefined {
  return allowlistByKey.get(key as AllowlistedSystemSettingKey)
}

export function allowlistedSystemSettingKeys(): AllowlistedSystemSettingKey[] {
  return ALLOWLISTED_SYSTEM_SETTINGS.map((item) => item.key)
}
