import type pg from 'pg'
import type { Logger } from 'pino'
import { AppError } from '../../shared/errors/AppError.js'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'
import {
  allowlistedSystemSettingKeys,
  getAllowlistedSystemSettingMeta,
  isAllowlistedSystemSettingKey,
} from './system-settings.allowlist.js'
import {
  findAllowlistedSystemSettingByKey,
  findAllowlistedSystemSettings,
  updateAllowlistedSystemSettingValue,
} from './system-settings.repository.js'
import {
  SESSION_IDLE_TIMEOUT_SETTING_KEY,
  SESSION_IDLE_WARNING_SETTING_KEY,
} from './session-timeout.config.js'
import {
  getSessionIdleTimeoutMinutes,
  getSessionIdleWarningMinutes,
  primeSessionIdleTimeoutCache,
  primeSessionIdleWarningCache,
} from './system-settings.service.js'

export type SystemSettingItemDto = {
  key: string
  value: string
  valueType: string
  description: string | null
  minValue?: number
  maxValue?: number
  isSensitive: boolean
  updatedAt: string
}

const WARNING_LT_TIMEOUT_MESSAGE =
  'O aviso deve ser menor que o tempo total de inatividade.'
const TIMEOUT_GT_WARNING_MESSAGE =
  'O tempo de inatividade deve ser maior que o aviso preventivo.'

function rowToDto(row: {
  setting_key: string
  setting_value: string
  value_type: string
  description: string | null
  updated_at: Date
}): SystemSettingItemDto {
  const meta = getAllowlistedSystemSettingMeta(row.setting_key)
  return {
    key: row.setting_key,
    value: row.setting_value,
    valueType: row.value_type,
    description: row.description,
    minValue: meta?.minValue,
    maxValue: meta?.maxValue,
    isSensitive: meta?.isSensitive ?? true,
    updatedAt: row.updated_at.toISOString(),
  }
}

function assertAllowlistedKey(key: string): void {
  if (!isAllowlistedSystemSettingKey(key)) {
    throw new AppError(
      'Configuração do sistema não encontrada ou não permitida.',
      404,
      ErrorCodes.NOT_FOUND,
    )
  }
}

function validateIntegerSettingValue(key: string, value: number): string {
  const meta = getAllowlistedSystemSettingMeta(key)
  if (!meta) {
    throw new AppError(
      'Configuração do sistema não encontrada ou não permitida.',
      404,
      ErrorCodes.NOT_FOUND,
    )
  }
  if (!Number.isInteger(value)) {
    throw new AppError(
      'Informe um valor inteiro válido.',
      422,
      ErrorCodes.VALIDATION_ERROR,
    )
  }
  if (value < meta.minValue || value > meta.maxValue) {
    throw new AppError(
      `Informe um valor entre ${meta.minValue} e ${meta.maxValue} minutos.`,
      422,
      ErrorCodes.VALIDATION_ERROR,
    )
  }
  return String(value)
}

async function readStoredWarningMinutes(pool: pg.Pool): Promise<number | null> {
  const row = await findAllowlistedSystemSettingByKey(
    pool,
    SESSION_IDLE_WARNING_SETTING_KEY,
  )
  if (!row) return null
  const n = Number.parseInt(row.setting_value.trim(), 10)
  if (!Number.isInteger(n)) return null
  const meta = getAllowlistedSystemSettingMeta(SESSION_IDLE_WARNING_SETTING_KEY)
  if (!meta || n < meta.minValue || n > meta.maxValue) return null
  return n
}

function assertWarningLessThanTimeout(
  warningMinutes: number,
  timeoutMinutes: number,
): void {
  if (warningMinutes >= timeoutMinutes) {
    throw new AppError(
      WARNING_LT_TIMEOUT_MESSAGE,
      422,
      ErrorCodes.VALIDATION_ERROR,
    )
  }
}

async function assertTimeoutGreaterThanWarning(
  pool: pg.Pool,
  timeoutMinutes: number,
): Promise<void> {
  const warningMinutes =
    (await readStoredWarningMinutes(pool)) ??
    (await getSessionIdleWarningMinutes(pool))
  if (timeoutMinutes <= warningMinutes) {
    throw new AppError(
      TIMEOUT_GT_WARNING_MESSAGE,
      422,
      ErrorCodes.VALIDATION_ERROR,
    )
  }
}

export async function serviceListAllowlistedSystemSettings(
  pool: pg.Pool,
): Promise<SystemSettingItemDto[]> {
  const rows = await findAllowlistedSystemSettings(pool, allowlistedSystemSettingKeys())
  return rows.map(rowToDto)
}

export async function serviceGetAllowlistedSystemSetting(
  pool: pg.Pool,
  key: string,
): Promise<SystemSettingItemDto> {
  assertAllowlistedKey(key)
  const row = await findAllowlistedSystemSettingByKey(pool, key)
  if (!row) {
    throw new AppError(
      'Configuração do sistema não encontrada ou não permitida.',
      404,
      ErrorCodes.NOT_FOUND,
    )
  }
  return rowToDto(row)
}

export async function servicePatchAllowlistedSystemSetting(
  pool: pg.Pool,
  key: string,
  value: number,
  actorUserId: string,
  logger?: Logger,
  requestId?: string,
): Promise<SystemSettingItemDto> {
  assertAllowlistedKey(key)
  const previous = await findAllowlistedSystemSettingByKey(pool, key)
  if (!previous) {
    throw new AppError(
      'Configuração do sistema não encontrada ou não permitida.',
      404,
      ErrorCodes.NOT_FOUND,
    )
  }

  const normalized = validateIntegerSettingValue(key, value)

  if (key === SESSION_IDLE_WARNING_SETTING_KEY) {
    const timeoutMinutes = await getSessionIdleTimeoutMinutes(pool, logger)
    assertWarningLessThanTimeout(
      Number.parseInt(normalized, 10),
      timeoutMinutes,
    )
  }

  if (key === SESSION_IDLE_TIMEOUT_SETTING_KEY) {
    await assertTimeoutGreaterThanWarning(
      pool,
      Number.parseInt(normalized, 10),
    )
  }

  const updated = await updateAllowlistedSystemSettingValue(pool, key, normalized)
  if (!updated) {
    throw new AppError(
      'Configuração do sistema não encontrada ou não permitida.',
      404,
      ErrorCodes.NOT_FOUND,
    )
  }

  if (key === SESSION_IDLE_TIMEOUT_SETTING_KEY) {
    primeSessionIdleTimeoutCache(Number.parseInt(normalized, 10))
  } else if (key === SESSION_IDLE_WARNING_SETTING_KEY) {
    primeSessionIdleWarningCache(Number.parseInt(normalized, 10))
  }

  logger?.warn(
    {
      event: 'system_setting_updated',
      settingKey: key,
      previousValue: previous.setting_value,
      newValue: normalized,
      actorUserId,
      requestId,
    },
    'system_setting_updated',
  )

  return rowToDto(updated)
}
