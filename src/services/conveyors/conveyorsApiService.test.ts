import { describe, expect, it, vi, afterEach } from 'vitest'
import { deleteConveyor } from './conveyorsApiService'
import * as client from '../../lib/api/client'

describe('deleteConveyor', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls DELETE /api/v1/conveyors/:id', async () => {
    const spy = vi.spyOn(client, 'requestJson').mockResolvedValue(undefined)
    await deleteConveyor('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee')
    expect(spy).toHaveBeenCalledWith(
      'DELETE',
      '/api/v1/conveyors/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    )
  })
})
