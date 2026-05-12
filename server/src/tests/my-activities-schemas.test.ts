import { describe, expect, it } from 'vitest'
import { timeEntryCandidatesQuerySchema } from '../modules/my-activities/my-activities.schemas.js'

describe('timeEntryCandidatesQuerySchema', () => {
  it('aplica limit por defeito e limita a 50', () => {
    expect(timeEntryCandidatesQuerySchema.parse({})).toEqual({
      limit: 50,
      includeUnassigned: false,
    })
    expect(timeEntryCandidatesQuerySchema.parse({ limit: '25' })).toEqual({
      limit: 25,
      q: undefined,
      includeUnassigned: false,
    })
    expect(() => timeEntryCandidatesQuerySchema.parse({ limit: 51 })).toThrow()
  })

  it('aceita q opcional', () => {
    expect(timeEntryCandidatesQuerySchema.parse({ q: ' OS 123 ' })).toMatchObject({
      q: ' OS 123 ',
      limit: 50,
      includeUnassigned: false,
    })
  })

  it('interpreta includeUnassigned', () => {
    expect(timeEntryCandidatesQuerySchema.parse({ includeUnassigned: 'true' })).toMatchObject({
      includeUnassigned: true,
    })
    expect(timeEntryCandidatesQuerySchema.parse({ includeUnassigned: true })).toMatchObject({
      includeUnassigned: true,
    })
  })
})
