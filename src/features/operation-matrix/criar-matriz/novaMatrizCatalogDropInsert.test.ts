import { describe, expect, it } from 'vitest'
import {
  clampInsertIndex,
  computeInsertIndexFromPointerAndRows,
} from './novaMatrizCatalogDropInsert'

function mockRect(top: number, height: number): DOMRect {
  return {
    top,
    bottom: top + height,
    left: 0,
    right: 100,
    width: 100,
    height,
    x: 0,
    y: top,
    toJSON() {
      return this
    },
  }
}

describe('computeInsertIndexFromPointerAndRows', () => {
  it('retorna 0 para lista vazia', () => {
    expect(
      computeInsertIndexFromPointerAndRows(500, [], () => null),
    ).toBe(0)
  })

  it('insere no início quando o ponteiro está acima da primeira linha', () => {
    const getEl = (id: string) =>
      id === 'a'
        ? ({ getBoundingClientRect: () => mockRect(100, 40) } as HTMLElement)
        : null
    expect(
      computeInsertIndexFromPointerAndRows(50, ['a'], getEl),
    ).toBe(0)
  })

  it('metade superior da linha i → índice i', () => {
    const getEl = (id: string) =>
      id === 'a'
        ? ({ getBoundingClientRect: () => mockRect(100, 40) } as HTMLElement)
        : null
    // mid = 120, y=110 < 120 → antes de 'a' → 0
    expect(
      computeInsertIndexFromPointerAndRows(110, ['a'], getEl),
    ).toBe(0)
  })

  it('metade inferior da linha i → índice i+1', () => {
    const getEl = (id: string) =>
      id === 'a'
        ? ({ getBoundingClientRect: () => mockRect(100, 40) } as HTMLElement)
        : null
    const mid = 100 + 20
    expect(
      computeInsertIndexFromPointerAndRows(mid + 5, ['a'], getEl),
    ).toBe(1)
  })

  it('entre duas linhas: inferior de i coincide com superior de i+1', () => {
    const rects: Record<string, DOMRect> = {
      a: mockRect(100, 40),
      b: mockRect(140, 40),
    }
    const getEl = (id: string) =>
      ({
        getBoundingClientRect: () => rects[id]!,
      }) as HTMLElement
    const midA = 100 + 20
    expect(
      computeInsertIndexFromPointerAndRows(midA + 1, ['a', 'b'], getEl),
    ).toBe(1)
    expect(
      computeInsertIndexFromPointerAndRows(139, ['a', 'b'], getEl),
    ).toBe(1)
  })

  it('abaixo da última linha → n', () => {
    const getEl = (id: string) =>
      id === 'z'
        ? ({ getBoundingClientRect: () => mockRect(200, 30) } as HTMLElement)
        : null
    expect(
      computeInsertIndexFromPointerAndRows(500, ['z'], getEl),
    ).toBe(1)
  })

  it('preserva ordem com três linhas (meio)', () => {
    const rects: Record<string, DOMRect> = {
      r0: mockRect(0, 20),
      r1: mockRect(20, 20),
      r2: mockRect(40, 20),
    }
    const getEl = (id: string) =>
      ({
        getBoundingClientRect: () => rects[id]!,
      }) as HTMLElement
    // sobre r1, metade superior → índice 1
    expect(
      computeInsertIndexFromPointerAndRows(25, ['r0', 'r1', 'r2'], getEl),
    ).toBe(1)
    // sobre r1, metade inferior → índice 2
    expect(
      computeInsertIndexFromPointerAndRows(35, ['r0', 'r1', 'r2'], getEl),
    ).toBe(2)
  })
})

describe('clampInsertIndex', () => {
  it('limita ao intervalo [0, length]', () => {
    expect(clampInsertIndex(-3, 3)).toBe(0)
    expect(clampInsertIndex(99, 3)).toBe(3)
    expect(clampInsertIndex(2, 4)).toBe(2)
  })

  it('lista vazia só permite 0', () => {
    expect(clampInsertIndex(5, 0)).toBe(0)
  })
})
