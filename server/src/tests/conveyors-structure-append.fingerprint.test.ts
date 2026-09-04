import { describe, expect, it } from 'vitest'
import {
  buildStructureAppendCanonicalPayload,
  computeStructureAppendFingerprint,
  toCanonicalJson,
} from '../modules/conveyors/conveyor-structure-append.fingerprint.js'
import type { PostConveyorOptionBody } from '../modules/conveyors/conveyors.schemas.js'

function sampleOption(overrides?: Partial<PostConveyorOptionBody>): PostConveyorOptionBody {
  return {
    titulo: 'Tarefa extra',
    orderIndex: 99,
    sourceOrigin: 'manual',
    areas: [
      {
        titulo: 'Setor A',
        orderIndex: 2,
        sourceOrigin: 'manual',
        steps: [
          {
            titulo: 'Atividade 2',
            orderIndex: 2,
            plannedMinutes: 20,
            plannedQuantity: 1,
            sourceOrigin: 'manual',
            required: true,
            sourceKey: null,
            assignees: [],
          },
          {
            titulo: 'Atividade 1',
            orderIndex: 1,
            plannedMinutes: 10,
            plannedQuantity: 1,
            sourceOrigin: 'manual',
            required: true,
            sourceKey: 'sk-1',
            assignees: [
              {
                type: 'COLLABORATOR',
                collaboratorId: '11111111-1111-1111-1111-111111111111',
                isPrimary: true,
                orderIndex: 0,
              },
            ],
          },
        ],
      },
    ],
    ...overrides,
  }
}

describe('structure append fingerprint (A8)', () => {
  it('canonical JSON ordena chaves em profundidade', () => {
    const json = toCanonicalJson({ b: 1, a: { d: 2, c: 3 } })
    expect(json).toBe('{"a":{"c":3,"d":2},"b":1}')
  })

  it('normaliza orderIndex relativo e ordena áreas/steps por orderIndex de negócio', () => {
    const payload = buildStructureAppendCanonicalPayload({
      conveyorId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      reason: 'motivo teste',
      originType: 'MANUAL',
      matrixRootItemId: null,
      option: sampleOption(),
    }) as {
      option: {
        orderIndex: number
        areas: Array<{ orderIndex: number; steps: Array<{ orderIndex: number; titulo: string }> }>
      }
    }
    expect(payload.option.orderIndex).toBe(1)
    expect(payload.option.areas[0]!.orderIndex).toBe(1)
    expect(payload.option.areas[0]!.steps[0]!.titulo).toBe('Atividade 1')
    expect(payload.option.areas[0]!.steps[0]!.orderIndex).toBe(1)
    expect(payload.option.areas[0]!.steps[1]!.titulo).toBe('Atividade 2')
    expect(payload.option.areas[0]!.steps[1]!.orderIndex).toBe(2)
  })

  it('mesma estrutura com orderIndex absoluto diferente gera o mesmo fingerprint', () => {
    const base = {
      conveyorId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      reason: 'Motivo estável',
      originType: 'MANUAL' as const,
      matrixRootItemId: null,
    }
    const a = computeStructureAppendFingerprint({
      ...base,
      option: sampleOption({ orderIndex: 1 }),
    })
    const b = computeStructureAppendFingerprint({
      ...base,
      option: sampleOption({ orderIndex: 50 }),
    })
    expect(a).toBe(b)
    expect(a).toMatch(/^[a-f0-9]{64}$/)
  })

  it('motivo ou estrutura diferente altera fingerprint', () => {
    const baseOption = sampleOption()
    const a = computeStructureAppendFingerprint({
      conveyorId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      reason: 'Motivo A',
      originType: 'MANUAL',
      matrixRootItemId: null,
      option: baseOption,
    })
    const b = computeStructureAppendFingerprint({
      conveyorId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      reason: 'Motivo B',
      originType: 'MANUAL',
      matrixRootItemId: null,
      option: baseOption,
    })
    const c = computeStructureAppendFingerprint({
      conveyorId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      reason: 'Motivo A',
      originType: 'MANUAL',
      matrixRootItemId: null,
      option: sampleOption({ titulo: 'Outra tarefa' }),
    })
    expect(a).not.toBe(b)
    expect(a).not.toBe(c)
  })
})
