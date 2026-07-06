import { describe, expect, it } from 'vitest'
import { resolveNodeSourceKey } from './resolveNodeSourceKey'

describe('resolveNodeSourceKey', () => {
  it('source_key preenchida vence sobre id', () => {
    expect(
      resolveNodeSourceKey({ id: 'node-id-1', source_key: 'stable-key' }),
    ).toBe('stable-key')
  })

  it('null, undefined, vazia ou só espaços caem para id', () => {
    const id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    expect(resolveNodeSourceKey({ id, source_key: null })).toBe(id)
    expect(resolveNodeSourceKey({ id })).toBe(id)
    expect(resolveNodeSourceKey({ id, source_key: '' })).toBe(id)
    expect(resolveNodeSourceKey({ id, source_key: '   ' })).toBe(id)
  })

  it('dois nós com a mesma source_key de origem resolvem igual (idempotência)', () => {
    const originKey = 'lineage-abc'
    const nodeA = { id: 'clone-a-id', source_key: originKey }
    const nodeB = { id: 'clone-b-id', source_key: originKey }
    expect(resolveNodeSourceKey(nodeA)).toBe(resolveNodeSourceKey(nodeB))
    expect(resolveNodeSourceKey(nodeA)).toBe(originKey)
  })
})
