/**
 * Matrizes: catálogo consolidado (Opção / Área / Atividade) em memória + sessionStorage.
 * Esteiras: reutilizar `ensureMatrixSuggestionCatalog` / tipos em `types.ts` + `labelCatalogRank`.
 */
import { useEffect, useState } from 'react'
import { getMatrixSuggestionCatalog } from '../../services/operation-matrix/operationMatrixApiService'
import type { MatrixSuggestionCatalogData } from './types'

const STORAGE_KEY = 'sgp.matrixSuggestionCatalog.v2'
const SCHEMA_VERSION = 2
const TTL_MS = 4 * 60 * 60 * 1000

const EMPTY: MatrixSuggestionCatalogData = {
  options: [],
  areas: [],
  activities: [],
}

type StoredPayload = {
  v: number
  fetchedAt: number
  data: MatrixSuggestionCatalogData
}

let memory: { data: MatrixSuggestionCatalogData; fetchedAt: number } | null = null

let inflight: Promise<MatrixSuggestionCatalogData> | null = null

function readSession(): StoredPayload | null {
  if (typeof sessionStorage === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as StoredPayload
    if (p.v !== SCHEMA_VERSION || !p.data) return null
    if (typeof p.fetchedAt !== 'number') return null
    if (Date.now() - p.fetchedAt > TTL_MS) return null
    if (
      !Array.isArray(p.data.options) ||
      !Array.isArray(p.data.areas) ||
      !Array.isArray(p.data.activities)
    ) {
      return null
    }
    return p
  } catch {
    return null
  }
}

function writeSession(data: MatrixSuggestionCatalogData, fetchedAt: number): void {
  if (typeof sessionStorage === 'undefined') return
  try {
    const payload: StoredPayload = { v: SCHEMA_VERSION, fetchedAt, data }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    /* quota */
  }
}

function isMemoryFresh(): boolean {
  return memory != null && Date.now() - memory.fetchedAt <= TTL_MS
}

export async function ensureMatrixSuggestionCatalog(): Promise<MatrixSuggestionCatalogData> {
  if (isMemoryFresh()) {
    return memory!.data
  }

  const fromSession = readSession()
  if (fromSession) {
    memory = { data: fromSession.data, fetchedAt: fromSession.fetchedAt }
    if (isMemoryFresh()) {
      return memory.data
    }
  }

  if (inflight) return inflight

  inflight = (async () => {
    const data = await getMatrixSuggestionCatalog()
    const fetchedAt = Date.now()
    memory = { data, fetchedAt }
    writeSession(data, fetchedAt)
    return data
  })()

  try {
    return await inflight
  } finally {
    inflight = null
  }
}

export function peekMatrixSuggestionCatalogSync(): MatrixSuggestionCatalogData | null {
  if (isMemoryFresh()) return memory!.data
  const fromSession = readSession()
  if (fromSession) {
    memory = { data: fromSession.data, fetchedAt: fromSession.fetchedAt }
    if (isMemoryFresh()) return memory.data
  }
  return null
}

export function useMatrixSuggestionCatalog(): {
  catalog: MatrixSuggestionCatalogData
  loading: boolean
} {
  const [catalog, setCatalog] = useState<MatrixSuggestionCatalogData>(
    () => peekMatrixSuggestionCatalogSync() ?? EMPTY,
  )
  const [loading, setLoading] = useState(
    () => peekMatrixSuggestionCatalogSync() == null,
  )

  useEffect(() => {
    let cancelled = false
    ensureMatrixSuggestionCatalog()
      .then((d) => {
        if (!cancelled) {
          setCatalog(d)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { catalog, loading }
}
