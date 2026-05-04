import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  deleteCollaboratorCapacityOverride,
  getCollaboratorCapacityResolved,
  getOperationalCapacitySettings,
  updateOperationalCapacitySettings,
} from './operationalCapacity.service'

vi.mock('./admin/adminUsersApiService', () => ({
  fetchAdminEnvelope: vi.fn(),
}))

vi.mock('../lib/api/client', () => ({
  requestJson: vi.fn(),
}))

import { fetchAdminEnvelope } from './admin/adminUsersApiService'
import { requestJson } from '../lib/api/client'

describe('operationalCapacity.service', () => {
  afterEach(() => {
    vi.mocked(fetchAdminEnvelope).mockReset()
    vi.mocked(requestJson).mockReset()
  })

  it('getOperationalCapacitySettings usa GET capacity', async () => {
    vi.mocked(fetchAdminEnvelope).mockResolvedValue({
      data: {
        defaultDailyMinutes: 480,
        updatedAt: '2026-01-01T00:00:00.000Z',
        updatedBy: null,
      },
      meta: {},
    })
    const out = await getOperationalCapacitySettings()
    expect(out.defaultDailyMinutes).toBe(480)
    expect(fetchAdminEnvelope).toHaveBeenCalledWith(
      'GET',
      '/api/v1/admin/operational-settings/capacity',
    )
  })

  it('updateOperationalCapacitySettings envia defaultDailyMinutes', async () => {
    vi.mocked(fetchAdminEnvelope).mockResolvedValue({
      data: {
        defaultDailyMinutes: 510,
        updatedAt: '2026-01-02T00:00:00.000Z',
        updatedBy: 'u1',
      },
      meta: {},
    })
    await updateOperationalCapacitySettings({ defaultDailyMinutes: 510 })
    expect(fetchAdminEnvelope).toHaveBeenCalledWith(
      'PUT',
      '/api/v1/admin/operational-settings/capacity',
      { body: { defaultDailyMinutes: 510 } },
    )
  })

  it('getCollaboratorCapacityResolved aceita date na query', async () => {
    vi.mocked(fetchAdminEnvelope).mockResolvedValue({
      data: {
        collaboratorId: 'c1',
        date: '2026-05-01',
        defaultDailyMinutes: 480,
        overrideDailyMinutes: null,
        resolvedDailyMinutes: 480,
        source: 'default',
        overrides: [],
      },
      meta: {},
    })
    await getCollaboratorCapacityResolved('c1', { date: '2026-05-01' })
    expect(fetchAdminEnvelope).toHaveBeenCalledWith(
      'GET',
      '/api/v1/admin/operational-settings/collaborators/c1/capacity?date=2026-05-01',
    )
  })

  it('deleteCollaboratorCapacityOverride usa DELETE', async () => {
    vi.mocked(requestJson).mockResolvedValue(undefined)
    await deleteCollaboratorCapacityOverride('c1')
    expect(requestJson).toHaveBeenCalledWith(
      'DELETE',
      '/api/v1/admin/operational-settings/collaborators/c1/capacity',
    )
  })
})
