import { describe, expect, it } from 'vitest'
import { pickDuplicateMatrixRootName } from './duplicateMatrixItemName.js'

describe('pickDuplicateMatrixRootName', () => {
  it('escolhe "Nome (Cópia)" quando livre', async () => {
    const r = await pickDuplicateMatrixRootName(async () => false, 'Padrão')
    expect(r).toBe('Padrão (Cópia)')
  })

  it('usa "Nome (Cópia 2)" quando "Nome (Cópia)" já existe', async () => {
    const r = await pickDuplicateMatrixRootName(
      async (c) => c === 'Padrão (Cópia)',
      'Padrão',
    )
    expect(r).toBe('Padrão (Cópia 2)')
  })

  it('usa "Nome (Cópia 3)" quando as duas primeiras existem', async () => {
    const r = await pickDuplicateMatrixRootName(
      async (c) => c === 'Padrão (Cópia)' || c === 'Padrão (Cópia 2)',
      'Padrão',
    )
    expect(r).toBe('Padrão (Cópia 3)')
  })

  it('aplica trim no nome original', async () => {
    const r = await pickDuplicateMatrixRootName(async () => false, '  X  ')
    expect(r).toBe('X (Cópia)')
  })
})
