import { describe, expect, it } from 'vitest'
import {
  getConveyorHealthAnalysisHistoryQuerySchema,
  getConveyorHealthSummaryQuerySchema,
  postConveyorHealthAnalysisBodySchema,
} from './conveyor-health.schemas.js'

describe('postConveyorHealthAnalysisBodySchema', () => {
  it('aceita corpo vazio (policy default fica a cargo do builder)', () => {
    expect(postConveyorHealthAnalysisBodySchema.parse({})).toEqual({})
  })

  it('aceita policy explícita', () => {
    expect(postConveyorHealthAnalysisBodySchema.parse({ policy: 'quality' })).toEqual({
      policy: 'quality',
    })
  })

  it('rejeita chave extra', () => {
    expect(() =>
      postConveyorHealthAnalysisBodySchema.parse({ extra: 1 } as never),
    ).toThrow()
  })
})

describe('getConveyorHealthAnalysisHistoryQuerySchema', () => {
  it('usa limit default=10', () => {
    expect(getConveyorHealthAnalysisHistoryQuerySchema.parse({})).toEqual({
      limit: 10,
    })
  })

  it('aceita limit explícito até 50', () => {
    expect(getConveyorHealthAnalysisHistoryQuerySchema.parse({ limit: '50' })).toEqual({
      limit: 50,
    })
  })

  it('rejeita limite acima de 50', () => {
    expect(() =>
      getConveyorHealthAnalysisHistoryQuerySchema.parse({ limit: 51 }),
    ).toThrow()
  })

  it('rejeita parâmetro extra', () => {
    expect(() =>
      getConveyorHealthAnalysisHistoryQuerySchema.parse({ limit: 10, foo: 'bar' } as never),
    ).toThrow()
  })
})

describe('getConveyorHealthSummaryQuerySchema', () => {
  it('usa limit default=100', () => {
    expect(getConveyorHealthSummaryQuerySchema.parse({})).toEqual({
      limit: 100,
    })
  })

  it('aceita limit explícito até 500', () => {
    expect(getConveyorHealthSummaryQuerySchema.parse({ limit: '500' })).toEqual({
      limit: 500,
    })
  })

  it('rejeita limite acima de 500', () => {
    expect(() =>
      getConveyorHealthSummaryQuerySchema.parse({ limit: 501 }),
    ).toThrow()
  })
})
