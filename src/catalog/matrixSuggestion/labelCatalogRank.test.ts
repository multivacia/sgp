import { describe, expect, it } from 'vitest'
import type { LabelCatalogEntry } from './types'
import { normalizeForLabelMatch, rankLabelSuggestions } from './labelCatalogRank'

describe('normalizeForLabelMatch', () => {
  it('ignora maiúsculas e acentos', () => {
    expect(normalizeForLabelMatch('AÇÃO')).toBe('acao')
    expect(normalizeForLabelMatch('  café  ')).toBe('cafe')
  })
})

describe('rankLabelSuggestions', () => {
  const cat: LabelCatalogEntry[] = [
    { id: '1', label: 'Banho', code: null },
    { id: '2', label: 'Banco de ensaio', code: null },
    { id: '3', label: 'Pintura lateral', code: 'P1' },
    { id: '4', label: 'Corte', code: null },
  ]

  it('não sugere com menos de 2 caracteres', () => {
    expect(rankLabelSuggestions(cat, 'b')).toEqual([])
  })

  it('prioriza prefixo sobre contém e ordena alfabeticamente', () => {
    const r = rankLabelSuggestions(cat, 'ban', { maxResults: 10 })
    expect(r.map((x) => x.label)).toEqual(['Banco de ensaio', 'Banho'])
  })

  it('contém quando não há prefixo', () => {
    const r = rankLabelSuggestions(cat, 'ura', { maxResults: 10 })
    expect(r.map((x) => x.label)).toEqual(['Pintura lateral'])
  })

  it('respeita limite máximo', () => {
    const many: LabelCatalogEntry[] = Array.from({ length: 20 }, (_, i) => ({
      id: `x${i}`,
      label: `Teste item ${i}`,
      code: null,
    }))
    const r = rankLabelSuggestions(many, 'te', { maxResults: 8 })
    expect(r.length).toBe(8)
  })
})
