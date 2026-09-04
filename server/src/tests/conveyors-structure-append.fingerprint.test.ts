import { describe, expect, it } from 'vitest'
import {
  buildStructureAppendCanonicalPayload,
  computeStructureAppendFingerprint,
  toCanonicalJson,
} from '../modules/conveyors/conveyor-structure-append.fingerprint.js'
import type {
  PostConveyorAreaBody,
  PostConveyorOptionBody,
  PostConveyorStepBody,
} from '../modules/conveyors/conveyors.schemas.js'

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

function sampleArea(): PostConveyorAreaBody {
  return {
    titulo: 'Setor tardio',
    orderIndex: 5,
    sourceOrigin: 'manual',
    steps: [
      {
        titulo: 'Atividade',
        orderIndex: 1,
        plannedMinutes: 15,
        sourceOrigin: 'manual',
        required: true,
        assignees: [],
      },
    ],
  }
}

function sampleStep(): PostConveyorStepBody {
  return {
    titulo: 'Step tardio',
    orderIndex: 9,
    plannedMinutes: 12,
    sourceOrigin: 'manual',
    required: true,
    assignees: [],
  }
}

describe('structure append fingerprint (A8 + multinível)', () => {
  it('canonical JSON ordena chaves em profundidade', () => {
    const json = toCanonicalJson({ b: 1, a: { d: 2, c: 3 } })
    expect(json).toBe('{"a":{"c":3,"d":2},"b":1}')
  })

  it('OPTION: normaliza orderIndex relativo e inclui appendKind + targetParentNodeId', () => {
    const payload = buildStructureAppendCanonicalPayload({
      conveyorId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      reason: 'motivo teste',
      originType: 'MANUAL',
      matrixRootItemId: null,
      appendKind: 'OPTION',
      targetParentNodeId: null,
      option: sampleOption(),
    }) as {
      appendKind: string
      targetParentNodeId: null
      option: {
        orderIndex: number
        areas: Array<{ orderIndex: number; steps: Array<{ orderIndex: number; titulo: string }> }>
      }
    }
    expect(payload.appendKind).toBe('OPTION')
    expect(payload.targetParentNodeId).toBeNull()
    expect(payload.option.orderIndex).toBe(1)
    expect(payload.option.areas[0]!.orderIndex).toBe(1)
    expect(payload.option.areas[0]!.steps[0]!.titulo).toBe('Atividade 1')
    expect(payload.option.areas[0]!.steps[0]!.orderIndex).toBe(1)
    expect(payload.option.areas[0]!.steps[1]!.titulo).toBe('Atividade 2')
    expect(payload.option.areas[0]!.steps[1]!.orderIndex).toBe(2)
  })

  it('mesma estrutura OPTION com orderIndex absoluto diferente gera o mesmo fingerprint', () => {
    const base = {
      conveyorId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      reason: 'Motivo estável',
      originType: 'MANUAL' as const,
      matrixRootItemId: null,
      appendKind: 'OPTION' as const,
      targetParentNodeId: null,
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
      appendKind: 'OPTION',
      targetParentNodeId: null,
      option: baseOption,
    })
    const b = computeStructureAppendFingerprint({
      conveyorId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      reason: 'Motivo B',
      originType: 'MANUAL',
      matrixRootItemId: null,
      appendKind: 'OPTION',
      targetParentNodeId: null,
      option: baseOption,
    })
    const c = computeStructureAppendFingerprint({
      conveyorId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      reason: 'Motivo A',
      originType: 'MANUAL',
      matrixRootItemId: null,
      appendKind: 'OPTION',
      targetParentNodeId: null,
      option: sampleOption({ titulo: 'Outra tarefa' }),
    })
    expect(a).not.toBe(b)
    expect(a).not.toBe(c)
  })

  it('AREA e STEP: fingerprint inclui kind + pai e payload canônico', () => {
    const parentOpt = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
    const parentArea = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
    const areaFp = computeStructureAppendFingerprint({
      conveyorId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      reason: 'setor',
      originType: 'MANUAL',
      matrixRootItemId: null,
      appendKind: 'AREA',
      targetParentNodeId: parentOpt,
      area: sampleArea(),
    })
    const areaFpOtherParent = computeStructureAppendFingerprint({
      conveyorId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      reason: 'setor',
      originType: 'MANUAL',
      matrixRootItemId: null,
      appendKind: 'AREA',
      targetParentNodeId: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
      area: sampleArea(),
    })
    const stepFp = computeStructureAppendFingerprint({
      conveyorId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      reason: 'atividade',
      originType: 'MANUAL',
      matrixRootItemId: null,
      appendKind: 'STEP',
      targetParentNodeId: parentArea,
      step: sampleStep(),
    })
    const optionFp = computeStructureAppendFingerprint({
      conveyorId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      reason: 'setor',
      originType: 'MANUAL',
      matrixRootItemId: null,
      appendKind: 'OPTION',
      targetParentNodeId: null,
      option: sampleOption(),
    })
    expect(areaFp).toMatch(/^[a-f0-9]{64}$/)
    expect(stepFp).toMatch(/^[a-f0-9]{64}$/)
    expect(areaFp).not.toBe(areaFpOtherParent)
    expect(areaFp).not.toBe(optionFp)
    expect(stepFp).not.toBe(areaFp)

    const areaPayload = buildStructureAppendCanonicalPayload({
      conveyorId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      reason: 'setor',
      originType: 'MANUAL',
      matrixRootItemId: null,
      appendKind: 'AREA',
      targetParentNodeId: parentOpt,
      area: sampleArea(),
    }) as { appendKind: string; area: { orderIndex: number } }
    expect(areaPayload.appendKind).toBe('AREA')
    expect(areaPayload.area.orderIndex).toBe(1)
  })

  it('mesmo kind com pai diferente altera fingerprint', () => {
    const base = {
      conveyorId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      reason: 'atividade',
      originType: 'MANUAL' as const,
      matrixRootItemId: null,
      appendKind: 'STEP' as const,
      step: sampleStep(),
    }
    const a = computeStructureAppendFingerprint({
      ...base,
      targetParentNodeId: '11111111-1111-1111-1111-111111111111',
    })
    const b = computeStructureAppendFingerprint({
      ...base,
      targetParentNodeId: '22222222-2222-2222-2222-222222222222',
    })
    expect(a).not.toBe(b)
  })
})
