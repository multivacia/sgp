import { describe, expect, it } from 'vitest'
import type { ArgosIssue } from '../../../domain/argos/warnings-taxonomy.types'
import { isArgosResultOperationallyFailed, partitionArgosIssues } from './argosIssues'

describe('partitionArgosIssues', () => {
  it('separa fatal_error dos restantes', () => {
    const warnings: ArgosIssue[] = [
      { category: 'fatal_error', code: 'file.empty_buffer' },
      { category: 'revisable_warning', code: 'x', message: 'y' },
      { category: 'missing_field', code: 'field.missing' },
    ]
    const { fatal, nonFatal } = partitionArgosIssues(warnings)
    expect(fatal).toHaveLength(1)
    expect(nonFatal).toHaveLength(2)
  })
})

describe('isArgosResultOperationallyFailed', () => {
  it('falha quando status failed', () => {
    expect(
      isArgosResultOperationallyFailed({
        status: 'failed',
        draft: null,
        fatalIssues: [],
      }),
    ).toBe(true)
  })

  it('falha quando há issues fatais', () => {
    expect(
      isArgosResultOperationallyFailed({
        status: 'completed',
        draft: { x: 1 },
        fatalIssues: [{ category: 'fatal_error', code: 'x' }],
      }),
    ).toBe(true)
  })

  it('falha quando draft é nulo', () => {
    expect(
      isArgosResultOperationallyFailed({
        status: 'completed',
        draft: null,
        fatalIssues: [],
      }),
    ).toBe(true)
  })

  it('sucesso operacional com draft e sem fatal', () => {
    expect(
      isArgosResultOperationallyFailed({
        status: 'partial',
        draft: { schemaVersion: '1.0.0' },
        fatalIssues: [],
      }),
    ).toBe(false)
  })
})
