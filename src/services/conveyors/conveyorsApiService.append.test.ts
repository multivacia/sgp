import { afterEach, describe, expect, it, vi } from 'vitest'
import { appendConveyorStructureItem } from './conveyorsApiService'
import * as client from '../../lib/api/client'

describe('appendConveyorStructureItem', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('envia Idempotency-Key estável no header (OPTION)', async () => {
    const spy = vi.spyOn(client, 'requestJsonEnvelope').mockResolvedValue({
      data: { id: 'cv-1' } as never,
      meta: { structureItemAppendIdempotent: false },
    })
    const key = 'idem-key-stable-123'
    await appendConveyorStructureItem(
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      {
        appendKind: 'OPTION',
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
        body: expect.objectContaining({ appendKind: 'OPTION' }),
      }),
    )
  })

  it('envia body discriminado AREA', async () => {
    const spy = vi.spyOn(client, 'requestJsonEnvelope').mockResolvedValue({
      data: { id: 'cv-1' } as never,
      meta: { appendKind: 'AREA' },
    })
    await appendConveyorStructureItem(
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      {
        appendKind: 'AREA',
        targetParentNodeId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        reason: 'Novo setor',
        originType: 'MANUAL',
        area: {
          titulo: 'Setor',
          orderIndex: 1,
          sourceOrigin: 'manual',
          steps: [
            {
              titulo: 'Ativ',
              orderIndex: 1,
              plannedMinutes: 20,
              sourceOrigin: 'manual',
              required: true,
              assignees: [],
            },
          ],
        },
      },
      { idempotencyKey: 'area-key' },
    )
    expect(spy).toHaveBeenCalledWith(
      'POST',
      '/api/v1/conveyors/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/structure/items',
      expect.objectContaining({
        body: expect.objectContaining({
          appendKind: 'AREA',
          targetParentNodeId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        }),
      }),
    )
  })

  it('envia body discriminado STEP', async () => {
    const spy = vi.spyOn(client, 'requestJsonEnvelope').mockResolvedValue({
      data: { id: 'cv-1' } as never,
      meta: { appendKind: 'STEP' },
    })
    await appendConveyorStructureItem(
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      {
        appendKind: 'STEP',
        targetParentNodeId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
        reason: 'Nova atividade',
        originType: 'MANUAL',
        step: {
          titulo: 'Ativ',
          orderIndex: 1,
          plannedMinutes: 10,
          sourceOrigin: 'manual',
          required: true,
          assignees: [],
        },
      },
      { idempotencyKey: 'step-key' },
    )
    expect(spy).toHaveBeenCalledWith(
      'POST',
      '/api/v1/conveyors/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/structure/items',
      expect.objectContaining({
        body: expect.objectContaining({
          appendKind: 'STEP',
          targetParentNodeId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
        }),
      }),
    )
  })
})
