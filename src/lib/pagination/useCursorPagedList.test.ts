/** @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  appendUniqueByKey,
  useCursorPagedList,
  type CursorPage,
} from './useCursorPagedList'

type Item = { id: string }
const key = (i: Item) => i.id

function deferred<T>() {
  let resolve!: (v: T) => void
  let reject!: (e: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function page(ids: string[], nextCursor: string | null): CursorPage<Item> {
  return { items: ids.map((id) => ({ id })), nextCursor }
}

function setup() {
  return renderHook(() => useCursorPagedList<Item>(key))
}

describe('useCursorPagedList', () => {
  it('reload busca a 1ª página; "Carregar mais" acrescenta no fim até nextCursor nulo', async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce(page(['a', 'b'], 'c1'))
      .mockResolvedValueOnce(page(['c', 'd'], 'c2'))
      .mockResolvedValueOnce(page(['e'], null))
    const { result } = setup()

    await act(() => result.current.reload({ fetchPage }))
    expect(result.current.items.map(key)).toEqual(['a', 'b'])
    expect(result.current.hasMore).toBe(true)

    await act(() => result.current.loadMore())
    await act(() => result.current.loadMore())
    expect(fetchPage.mock.calls.map((c) => c[0])).toEqual([null, 'c1', 'c2'])
    expect(result.current.items.map(key)).toEqual(['a', 'b', 'c', 'd', 'e'])
    expect(result.current.hasMore).toBe(false)

    await act(() => result.current.loadMore())
    expect(fetchPage).toHaveBeenCalledTimes(3)
  })

  it('fim decidido só por nextCursor: página vazia com cursor mantém a continuação', async () => {
    const fetchPage = vi.fn().mockResolvedValueOnce(page([], 'c1')).mockResolvedValueOnce(page(['z'], null))
    const { result } = setup()
    await act(() => result.current.reload({ fetchPage }))
    expect(result.current.items).toEqual([])
    expect(result.current.hasMore).toBe(true)
    await act(() => result.current.loadMore())
    expect(result.current.items.map(key)).toEqual(['z'])
  })

  it('cliques repetidos durante o carregamento não disparam requisições simultâneas', async () => {
    const more = deferred<CursorPage<Item>>()
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce(page(['a'], 'c1'))
      .mockReturnValueOnce(more.promise)
    const { result } = setup()
    await act(() => result.current.reload({ fetchPage }))

    let p1!: Promise<void>
    act(() => {
      p1 = result.current.loadMore()
      void result.current.loadMore()
      void result.current.loadMore()
    })
    expect(result.current.loadingMore).toBe(true)
    expect(fetchPage).toHaveBeenCalledTimes(2)
    await act(async () => {
      more.resolve(page(['b'], null))
      await p1
    })
    expect(result.current.items.map(key)).toEqual(['a', 'b'])
  })

  it('erro em página posterior mantém itens, exibe erro e a nova tentativa usa o mesmo cursor sem duplicar', async () => {
    const onError = vi.fn(() => 'Falhou a página')
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce(page(['a', 'b'], 'c1'))
      .mockRejectedValueOnce(new Error('rede'))
      .mockResolvedValueOnce(page(['b', 'c'], null))
    const { result } = setup()
    await act(() => result.current.reload({ fetchPage, onError }))
    await act(() => result.current.loadMore())
    expect(result.current.items.map(key)).toEqual(['a', 'b'])
    expect(result.current.moreError).toBe('Falhou a página')
    expect(onError).toHaveBeenCalledWith(expect.any(Error), 'more')
    expect(result.current.hasMore).toBe(true)

    await act(() => result.current.loadMore())
    expect(fetchPage.mock.calls.map((c) => c[0])).toEqual([null, 'c1', 'c1'])
    expect(result.current.items.map(key)).toEqual(['a', 'b', 'c'])
    expect(result.current.moreError).toBeNull()
  })

  it('corrida: "Carregar mais" que termina após recarga (mesmos filtros) não altera a lista reiniciada — sucesso, erro e finalização', async () => {
    for (const outcome of ['success', 'error'] as const) {
      const staleMore = deferred<CursorPage<Item>>()
      const freshFirst = deferred<CursorPage<Item>>()
      const onError = vi.fn(() => 'erro antigo')
      const onPage = vi.fn()
      const fetchPage = vi
        .fn()
        .mockResolvedValueOnce(page(['a', 'b'], 'c1'))
        .mockReturnValueOnce(staleMore.promise)
        .mockReturnValueOnce(freshFirst.promise)
      const { result } = setup()
      await act(() => result.current.reload({ fetchPage, onError, onPage }))

      let stale!: Promise<void>
      act(() => {
        stale = result.current.loadMore()
      })
      // Recarga pós-persistência com os mesmos filtros → nova geração.
      let fresh!: Promise<void>
      act(() => {
        fresh = result.current.reload({ fetchPage, onError, onPage })
      })
      expect(result.current.items).toEqual([])
      expect(result.current.loadingFirst).toBe(true)

      await act(async () => {
        if (outcome === 'success') staleMore.resolve(page(['x', 'y'], 'old'))
        else staleMore.reject(new Error('antigo'))
        await stale
      })
      // Nada da geração antiga foi aplicado, nem a finalização.
      expect(result.current.items).toEqual([])
      expect(result.current.loadingFirst).toBe(true)
      expect(result.current.moreError).toBeNull()
      expect(onError).not.toHaveBeenCalled()
      expect(onPage).toHaveBeenCalledTimes(1)

      await act(async () => {
        freshFirst.resolve(page(['a'], 'c9'))
        await fresh
      })
      expect(result.current.items.map(key)).toEqual(['a'])
      expect(result.current.nextCursor).toBe('c9')
      expect(result.current.loadingFirst).toBe(false)
      expect(result.current.loadingMore).toBe(false)
    }
  })

  it('primeira página antiga que chega depois de uma busca mais recente é descartada', async () => {
    const oldFirst = deferred<CursorPage<Item>>()
    const { result } = setup()
    let old!: Promise<void>
    act(() => {
      old = result.current.reload({ fetchPage: () => oldFirst.promise })
    })
    await act(() => result.current.reload({ fetchPage: async () => page(['novo'], null) }))
    await act(async () => {
      oldFirst.resolve(page(['velho'], 'c'))
      await old
    })
    expect(result.current.items.map(key)).toEqual(['novo'])
    expect(result.current.hasMore).toBe(false)
  })

  it('reset zera e invalida respostas pendentes', async () => {
    const pending = deferred<CursorPage<Item>>()
    const { result } = setup()
    let p!: Promise<void>
    act(() => {
      p = result.current.reload({ fetchPage: () => pending.promise })
    })
    act(() => result.current.reset())
    await act(async () => {
      pending.resolve(page(['a'], 'c'))
      await p
    })
    expect(result.current.items).toEqual([])
    expect(result.current.loadingFirst).toBe(false)
  })

  it('erro na primeira página: lista vazia e mensagem', async () => {
    const { result } = setup()
    await act(() =>
      result.current.reload({
        fetchPage: async () => {
          throw new Error('x')
        },
        onError: () => 'Falha geral',
      }),
    )
    expect(result.current.items).toEqual([])
    expect(result.current.firstError).toBe('Falha geral')
    expect(result.current.hasMore).toBe(false)
  })

  it('appendUniqueByKey descarta repetidos', () => {
    expect(
      appendUniqueByKey([{ id: 'a' }], [{ id: 'a' }, { id: 'b' }, { id: 'b' }], key).map(key),
    ).toEqual(['a', 'b'])
  })
})
