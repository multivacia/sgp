import { afterEach, describe, expect, it, vi } from 'vitest'
import { appendConveyorStructureItem } from './conveyorsApiService'
import * as client from '../../lib/api/client'

describe('appendConveyorStructureItem', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('envia Idempotency-Key estável no header', async () => {
    const spy = vi.spyOn(client, 'requestJsonEnvelope').mockResolvedValue({
      data: { id: 'cv-1' } as never,
      meta: { structureItemAppendIdempotent: false },
    })
    const key = 'idem-key-stable-123'
    await appendConveyorStructureItem(
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      {
        reason: 'Motivo de teste',
        originType: 'MANUAL',
        option: {
          titulo: 'T',
          orderIndex: 1,
          sourceOrigin: 'manual',
          areas: [
            {
              titulo: 'A',
              orderIndex: 1,
              sourceOrigin: 'manual',
              steps: [
                {
                  titulo: 'S',
                  orderIndex: 1,
                  plannedMinutes: 10,
                  plannedQuantity: 1,
                  sourceOrigin: 'manual',
                  required: true,
                  assignees: [],
                },
              ],
            },
          ],
        },
      },
      { idempotencyKey: key },
    )

    expect(spy).toHaveBeenCalledWith(
      'POST',
      '/api/v1/conveyors/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/structure/items',
      expect.objectContaining({
        headers: { 'Idempotency-Key': key },
      }),
    )
  })
})
