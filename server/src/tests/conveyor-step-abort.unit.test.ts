import { describe, expect, it } from 'vitest'
import { parseIdempotencyKeyHeader } from '../modules/conveyors/conveyor-step-abort.service.js'
import { AppError } from '../shared/errors/AppError.js'

describe('parseIdempotencyKeyHeader', () => {
  it('ausente ou vazio → 400', () => {
    expect(() => parseIdempotencyKeyHeader(undefined)).toThrow(AppError)
    expect(() => parseIdempotencyKeyHeader(null)).toThrow(AppError)
    expect(() => parseIdempotencyKeyHeader('')).toThrow(AppError)
    expect(() => parseIdempotencyKeyHeader('   ')).toThrow(AppError)

    try {
      parseIdempotencyKeyHeader(undefined)
    } catch (err) {
      expect(err).toMatchObject({ statusCode: 400 })
    }
  })

  it('maior que 180 → 400', () => {
    expect(() => parseIdempotencyKeyHeader('x'.repeat(181))).toThrow(AppError)
  })

  it('válida retorna trim', () => {
    expect(parseIdempotencyKeyHeader('  abc-123  ')).toBe('abc-123')
  })
})
