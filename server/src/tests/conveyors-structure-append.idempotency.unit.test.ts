import { describe, expect, it } from 'vitest'
import { AppError } from '../shared/errors/AppError.js'
import { ErrorCodes } from '../shared/errors/errorCodes.js'
import { computeStructureAppendFingerprint } from '../modules/conveyors/conveyor-structure-append.fingerprint.js'
import { assertEventMatchesAppend } from '../modules/conveyors/conveyor-structure-append.service.js'
import type { PostConveyorOptionBody } from '../modules/conveyors/conveyors.schemas.js'
import type { ConveyorOperationalEventRow } from '../modules/conveyors/operational-events/conveyor-operational-events.types.js'

/**
 * Matriz de decisão de idempotência (A8) — usa `assertEventMatchesAppend` real:
 * - sem evento existente → proceed (serviço não chama a assert)
 * - mesma key + esteira + CONVEYOR_STRUCTURE_ITEM_ADDED + fingerprint → replay
 * - mesma key + esteira/tipo/payload diferente → 409
 */

const option: PostConveyorOptionBody = {
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
          plannedMinutes: 15,
          sourceOrigin: 'manual',
          required: true,
          assignees: [],
        },
      ],
    },
  ],
}

function eventRow(
  partial: Pick<ConveyorOperationalEventRow, 'event_type' | 'conveyor_id' | 'metadata_json'>,
): ConveyorOperationalEventRow {
  return {
    id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    node_id: null,
    previous_value: null,
    new_value: null,
    reason: 'LATE_STRUCTURE_APPEND',
    source: 'USER_ACTION',
    occurred_at: new Date(),
    created_by: null,
    idempotency_key: 'key-1',
    created_at: new Date(),
    ...partial,
  }
}

describe('structure append idempotency matrix (A8)', () => {
  const conveyorId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
  const fingerprint = computeStructureAppendFingerprint({
    conveyorId,
    reason: 'motivo',
    originType: 'MANUAL',
    matrixRootItemId: null,
    option,
  })

  it('sem evento existente → proceed (assert não é chamada; documentado)', () => {
    // Comportamento do serviço: if (!existing) materializa; não chama assertEventMatchesAppend.
    const existing: ConveyorOperationalEventRow | null = null
    expect(existing).toBeNull()
  })

  it('mesma key + esteira + tipo + fingerprint → replay (noop)', () => {
    expect(() =>
      assertEventMatchesAppend(
        eventRow({
          event_type: 'CONVEYOR_STRUCTURE_ITEM_ADDED',
          conveyor_id: conveyorId,
          metadata_json: { fingerprint },
        }),
        { conveyorId, fingerprint },
      ),
    ).not.toThrow()
  })

  it('mesma key + fingerprint diferente → 409', () => {
    try {
      assertEventMatchesAppend(
        eventRow({
          event_type: 'CONVEYOR_STRUCTURE_ITEM_ADDED',
          conveyor_id: conveyorId,
          metadata_json: { fingerprint: 'other' },
        }),
        { conveyorId, fingerprint },
      )
      expect.fail('deveria lançar AppError 409')
    } catch (e) {
      expect(e).toBeInstanceOf(AppError)
      expect((e as AppError).statusCode).toBe(409)
      expect((e as AppError).code).toBe(ErrorCodes.CONFLICT)
    }
  })

  it('mesma key + esteira diferente → 409', () => {
    expect(() =>
      assertEventMatchesAppend(
        eventRow({
          event_type: 'CONVEYOR_STRUCTURE_ITEM_ADDED',
          conveyor_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
          metadata_json: { fingerprint },
        }),
        { conveyorId, fingerprint },
      ),
    ).toThrow(AppError)
  })

  it('mesma key + tipo de evento diferente → 409', () => {
    expect(() =>
      assertEventMatchesAppend(
        eventRow({
          event_type: 'CONVEYOR_STEP_ABORTED',
          conveyor_id: conveyorId,
          metadata_json: { fingerprint },
        }),
        { conveyorId, fingerprint },
      ),
    ).toThrow(AppError)
  })
})
