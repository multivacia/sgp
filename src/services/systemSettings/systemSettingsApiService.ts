import type {
  SystemSettingItem,
  UpdateSystemSettingInput,
} from '../../domain/system-settings/systemSettings.types'
import { requestJson, requestJsonEnvelope } from '../../lib/api/client'

const BASE = '/api/v1/system-settings'

export async function listSystemSettings(): Promise<SystemSettingItem[]> {
  const { data } = await requestJsonEnvelope<SystemSettingItem[]>('GET', BASE)
  return Array.isArray(data) ? data : []
}

export async function updateSystemSetting(
  key: string,
  input: UpdateSystemSettingInput,
): Promise<SystemSettingItem> {
  return requestJson<SystemSettingItem>(
    'PATCH',
    `${BASE}/${encodeURIComponent(key)}`,
    { body: input },
  )
}
