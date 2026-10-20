import { useCallback, useEffect, useRef, useState } from 'react'

/** Página de uma lista paginada por cursor; `nextCursor` nulo = fim da lista. */
export type CursorPage<T> = { items: T[]; nextCursor: string | null }

export type CursorListPhase = 'first' | 'more'

/**
 * Origem de uma consulta (filtros já aplicados). Cada `reload` inicia uma nova geração com
 * a sua origem; "Carregar mais" continua na mesma origem/geração.
 */
export type CursorListSource<T, P extends CursorPage<T> = CursorPage<T>> = {
  fetchPage: (cursor: string | null) => Promise<P>
  /** Página aplicada (só da geração atual) — ex.: ler metadados adicionais. */
  onPage?: (page: P, phase: CursorListPhase) => void
  /** Trata o erro (só da geração atual); devolve a mensagem a exibir ou `null` se já tratado. */
  onError?: (error: unknown, phase: CursorListPhase) => string | null
}

export type CursorPagedListState<T> = {
  items: T[]
  nextCursor: string | null
  /** Primeira página da geração atual em carregamento. */
  loadingFirst: boolean
  /** Página seguinte em carregamento ("Carregar mais"). */
  loadingMore: boolean
  /** Erro da primeira página (lista vazia). */
  firstError: string | null
  /** Erro de página seguinte: itens anteriores mantidos; nova tentativa usa o mesmo cursor. */
  moreError: string | null
}

const DEFAULT_ERROR_MESSAGE = 'Não foi possível carregar as atividades.'

const INITIAL_STATE: CursorPagedListState<never> = {
  items: [],
  nextCursor: null,
  loadingFirst: false,
  loadingMore: false,
  firstError: null,
  moreError: null,
}

/** Acrescenta `next` ao fim de `prev`, descartando chaves repetidas (defensivo). */
export function appendUniqueByKey<T>(
  prev: readonly T[],
  next: readonly T[],
  getKey: (item: T) => string,
): T[] {
  const seen = new Set(prev.map(getKey))
  const out = [...prev]
  for (const item of next) {
    const key = getKey(item)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(item)
  }
  return out
}

/**
 * Lista paginada por cursor com botão "Carregar mais".
 *
 * - `reload(source)`: nova geração — zera itens e cursor e busca a primeira página.
 *   Usar em mudança de filtros **e** em recarga após persistência (mesmo com os mesmos filtros).
 * - `loadMore()`: próxima página da geração atual; ignorado enquanto há requisição em curso
 *   ou quando `nextCursor` é nulo. Em erro mantém itens e cursor (nova tentativa = `loadMore()`).
 * - `reset()`: nova geração sem buscar (ex.: pesquisa curta demais).
 *
 * Respostas de geração anterior são descartadas no sucesso, no erro e na finalização:
 * não alteram itens, cursor, erro nem o estado de carregamento da geração atual.
 * O fim da lista é decidido somente por `nextCursor` nulo.
 *
 * `getKey` deve ser estável (função de módulo): é lida só na primeira renderização.
 */
export function useCursorPagedList<T, P extends CursorPage<T> = CursorPage<T>>(
  getKey: (item: T) => string,
) {
  const [state, setState] = useState<CursorPagedListState<T>>(INITIAL_STATE)
  const getKeyRef = useRef(getKey)
  const generationRef = useRef(0)
  const sourceRef = useRef<CursorListSource<T, P> | null>(null)
  const cursorRef = useRef<string | null>(null)
  const inFlightRef = useRef(false)

  useEffect(() => {
    const generation = generationRef
    return () => {
      // Desmontagem: respostas pendentes deixam de ser aplicadas.
      generation.current += 1
    }
  }, [])

  const reset = useCallback(() => {
    generationRef.current += 1
    sourceRef.current = null
    cursorRef.current = null
    inFlightRef.current = false
    setState(INITIAL_STATE)
  }, [])

  const reload = useCallback(async (source: CursorListSource<T, P>) => {
    const generation = ++generationRef.current
    sourceRef.current = source
    cursorRef.current = null
    inFlightRef.current = true
    setState({ ...INITIAL_STATE, loadingFirst: true })
    try {
      const page = await source.fetchPage(null)
      if (generation !== generationRef.current) return
      cursorRef.current = page.nextCursor
      setState({
        ...INITIAL_STATE,
        items: appendUniqueByKey([], page.items, getKeyRef.current),
        nextCursor: page.nextCursor,
      })
      source.onPage?.(page, 'first')
    } catch (e) {
      if (generation !== generationRef.current) return
      const message = source.onError ? source.onError(e, 'first') : DEFAULT_ERROR_MESSAGE
      setState({ ...INITIAL_STATE, firstError: message })
    } finally {
      if (generation === generationRef.current) inFlightRef.current = false
    }
  }, [])

  const loadMore = useCallback(async () => {
    const source = sourceRef.current
    const cursor = cursorRef.current
    if (!source || !cursor || inFlightRef.current) return
    const generation = generationRef.current
    inFlightRef.current = true
    setState((s) => ({ ...s, loadingMore: true, moreError: null }))
    try {
      const page = await source.fetchPage(cursor)
      if (generation !== generationRef.current) return
      cursorRef.current = page.nextCursor
      setState((s) => ({
        ...s,
        items: appendUniqueByKey(s.items, page.items, getKeyRef.current),
        nextCursor: page.nextCursor,
        loadingMore: false,
      }))
      source.onPage?.(page, 'more')
    } catch (e) {
      if (generation !== generationRef.current) return
      const message = source.onError ? source.onError(e, 'more') : DEFAULT_ERROR_MESSAGE
      setState((s) => ({ ...s, loadingMore: false, moreError: message }))
    } finally {
      if (generation === generationRef.current) inFlightRef.current = false
    }
  }, [])

  return { ...state, hasMore: state.nextCursor !== null, reload, loadMore, reset }
}
