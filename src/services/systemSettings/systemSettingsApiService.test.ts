import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  listSystemSettings,
  updateSystemSetting,
} from './systemSettingsApiService'

vi.mock('../../lib/api/client', () => ({
  requestJson: vi.fn(),
  requestJsonEnvelope: vi.fn(),
}))

import { requestJson, requestJsonEnvelope } from '../../lib/api/client'

describe('systemSettingsApiService', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('lista configurações allowlist', async () => {
    vi.mocked(requestJsonEnvelope).mockResolvedValue({
      data: [
        {
          key: 'SESSION_IDLE_TIMEOUT_MINUTES',
          value: '30',
          valueType: 'INTEGER',
          description: 'desc',
          minValue: 1,
          maxValue: 480,
          isSensitive: true,
          updatedAt: '2026-05-13T00:00:00.000Z',
        },
      ],
      meta: { count: 1 },
    })

    const items = await listSystemSettings()
    expect(items).toHaveLength(1)
    expect(requestJsonEnvelope).toHaveBeenCalledWith('GET', '/api/v1/system-settings')
  })

  it('atualiza SESSION_IDLE_TIMEOUT_MINUTES', async () => {
    vi.mocked(requestJson).mockResolvedValue({
      key: 'SESSION_IDLE_TIMEOUT_MINUTES',
      value: '45',
      valueType: 'INTEGER',
      description: 'desc',
      minValue: 1,
      maxValue: 480,
      isSensitive: true,
      updatedAt: '2026-05-13T00:00:00.000Z',
    })

    const updated = await updateSystemSetting('SESSION_IDLE_TIMEOUT_MINUTES', {
      value: 45,
    })
    expect(updated.value).toBe('45')
    expect(requestJson).toHaveBeenCalledWith(
      'PATCH',
      '/api/v1/system-settings/SESSION_IDLE_TIMEOUT_MINUTES',
      { body: { value: 45 } },
    )
  })
})
