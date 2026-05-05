import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createExtraTimeEntryDescription,
  deleteExtraTimeEntryDescription,
  listExtraTimeEntryDescriptions,
  updateExtraTimeEntryDescription,
} from './extraTimeEntryDescriptionsApiService'

vi.mock('../admin/adminUsersApiService', () => ({
  fetchAdminEnvelope: vi.fn(),
}))

vi.mock('../../lib/api/client', () => ({
  requestJson: vi.fn(),
}))

import { fetchAdminEnvelope } from '../admin/adminUsersApiService'
import { requestJson } from '../../lib/api/client'

describe('extraTimeEntryDescriptionsApiService', () => {
  afterEach(() => {
    vi.mocked(fetchAdminEnvelope).mockReset()
    vi.mocked(requestJson).mockReset()
  })

  it('lista com filtros usando endpoint correto', async () => {
    vi.mocked(fetchAdminEnvelope).mockResolvedValue({ data: [], meta: {} })
    await listExtraTimeEntryDescriptions({ q: 'ajuste', status: 'inactive' })
    expect(fetchAdminEnvelope).toHaveBeenCalledWith(
      'GET',
      '/api/v1/operational-settings/extra-time-entry-descriptions?q=ajuste&status=inactive',
    )
  })

  it('cria descrição via POST', async () => {
    vi.mocked(fetchAdminEnvelope).mockResolvedValue({
      data: { id: '1' },
      meta: {},
    })
    await createExtraTimeEntryDescription({ description: 'Ajuste' })
    expect(fetchAdminEnvelope).toHaveBeenCalledWith(
      'POST',
      '/api/v1/operational-settings/extra-time-entry-descriptions',
      { body: { description: 'Ajuste' } },
    )
  })

  it('atualiza descrição via PUT', async () => {
    vi.mocked(fetchAdminEnvelope).mockResolvedValue({ data: { id: '1' }, meta: {} })
    await updateExtraTimeEntryDescription('abc', { isActive: false })
    expect(fetchAdminEnvelope).toHaveBeenCalledWith(
      'PUT',
      '/api/v1/operational-settings/extra-time-entry-descriptions/abc',
      { body: { isActive: false } },
    )
  })

  it('exclui descrição via DELETE', async () => {
    vi.mocked(requestJson).mockResolvedValue(undefined)
    await deleteExtraTimeEntryDescription('abc')
    expect(requestJson).toHaveBeenCalledWith(
      'DELETE',
      '/api/v1/operational-settings/extra-time-entry-descriptions/abc',
    )
  })
})
