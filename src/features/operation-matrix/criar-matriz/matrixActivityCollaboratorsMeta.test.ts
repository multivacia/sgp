import { describe, expect, it } from 'vitest'
import {
  MATRIX_ACTIVITY_COLLABORATORS_V1_KEY,
  buildMatrixActivityMetadataJson,
} from './matrixActivityCollaboratorsMeta'

describe('buildMatrixActivityMetadataJson', () => {
  it('retorna undefined quando não há apoios', () => {
    expect(buildMatrixActivityMetadataJson([])).toBeUndefined()
  })

  it('inclui supportIds versionados', () => {
    const u1 = '11111111-1111-1111-1111-111111111111'
    const u2 = '22222222-2222-2222-2222-222222222222'
    const meta = buildMatrixActivityMetadataJson([u1, u1, u2]) as Record<
      string,
      { supportIds: string[] }
    >
    expect(meta[MATRIX_ACTIVITY_COLLABORATORS_V1_KEY].supportIds).toEqual([
      u1,
      u2,
    ])
  })
})
