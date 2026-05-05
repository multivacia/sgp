import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createMyExtraTimeEntry,
  listExtraTimeEntryDescriptions,
  listMyExtraTimeEntries,
} from './extraTimeEntriesApiService'

vi.mock('../../lib/api/client', () => ({
  requestJsonEnvelope: vi.fn(),
}))

import { requestJsonEnvelope } from '../../lib/api/client'

describe('extraTimeEntriesApiService', () => {
  afterEach(() => {
    vi.mocked(requestJsonEnvelope).mockReset()
  })

  it('service chama endpoint de descrições', async () => {
    vi.mocked(requestJsonEnvelope).mockResolvedValue({ data: [], meta: {} })
    await listExtraTimeEntryDescriptions()
    expect(requestJsonEnvelope).toHaveBeenCalledWith(
      'GET',
      '/api/v1/me/extra-time-entry-descriptions',
    )
  })

  it('service chama endpoint de recentes com limit', async () => {
    vi.mocked(requestJsonEnvelope).mockResolvedValue({ data: [], meta: {} })
    await listMyExtraTimeEntries({ limit: 10 })
    expect(requestJsonEnvelope).toHaveBeenCalledWith(
      'GET',
      '/api/v1/me/extra-time-entries?limit=10',
    )
  })

  it('service chama POST de criação', async () => {
    vi.mocked(requestJsonEnvelope).mockResolvedValue({ data: { id: '1' }, meta: {} })
    await createMyExtraTimeEntry({
      descriptionId: 'd1',
      minutes: 20,
      entryDate: '2026-05-05',
      notes: 'teste',
    })
    expect(requestJsonEnvelope).toHaveBeenCalledWith(
      'POST',
      '/api/v1/me/extra-time-entries',
      {
        body: {
          descriptionId: 'd1',
          minutes: 20,
          entryDate: '2026-05-05',
          notes: 'teste',
        },
      },
    )
  })
})
