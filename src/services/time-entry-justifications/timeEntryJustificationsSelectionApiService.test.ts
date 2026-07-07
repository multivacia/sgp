import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  listMyTimeEntryJustifications,
  listProductionTimeEntryJustifications,
} from './timeEntryJustificationsSelectionApiService'

vi.mock('../../lib/api/client', () => ({
  requestJson: vi.fn(),
}))

vi.mock('../../lib/production/productionApiClient', () => ({
  productionRequestJson: vi.fn(),
}))

import { requestJson } from '../../lib/api/client'
import { productionRequestJson } from '../../lib/production/productionApiClient'

const sampleOption = {
  id: '11111111-1111-1111-1111-111111111111',
  label: 'Atividade emergencial',
  description: null,
  category: 'EMERGENCY',
  requiresComplement: false,
  sortOrder: 80,
}

describe('timeEntryJustificationsSelectionApiService', () => {
  afterEach(() => {
    vi.mocked(requestJson).mockReset()
    vi.mocked(productionRequestJson).mockReset()
  })

  it('listMyTimeEntryJustifications retorna array já desembrulhado por requestJson', async () => {
    vi.mocked(requestJson).mockResolvedValue([sampleOption])

    const result = await listMyTimeEntryJustifications()

    expect(requestJson).toHaveBeenCalledWith(
      'GET',
      '/api/v1/me/time-entry-justifications',
    )
    expect(result).toEqual([sampleOption])
  })

  it('listMyTimeEntryJustifications retorna vazio quando resposta não é array', async () => {
    vi.mocked(requestJson).mockResolvedValue(null)

    const result = await listMyTimeEntryJustifications()

    expect(result).toEqual([])
  })

  it('listProductionTimeEntryJustifications retorna array já desembrulhado', async () => {
    vi.mocked(productionRequestJson).mockResolvedValue([sampleOption])

    const result = await listProductionTimeEntryJustifications()

    expect(productionRequestJson).toHaveBeenCalledWith(
      'GET',
      '/api/v1/production/time-entry-justifications',
    )
    expect(result).toEqual([sampleOption])
  })
})
