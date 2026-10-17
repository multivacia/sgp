/**
 * Fotos guardadas só neste aparelho (IndexedDB), antes de alguém confirmar e enviar para o banco.
 * Sem IndexedDB (aba privada, navegador antigo) ficam só na memória enquanto a tela está aberta.
 */
export type FotoLocal = {
  /** `etapa:<matrixNodeId>` (uma por etapa) ou `esteira:<conveyorId>:<id>` (várias por esteira). */
  chave: string
  tipo: 'etapa' | 'esteira'
  alvoId: string
  /** Nome da etapa (para achar a foto também na esteira, que só guarda o nome). */
  nome?: string
  blob: Blob
  criadaEm: string
}

const BANCO = 'sgp-v2-fotos'
const LOJA = 'pendentes'
const EVENTO = 'sgp-v2-fotos-locais'
const memoria = new Map<string, FotoLocal>()

function abrir(): Promise<IDBDatabase | null> {
  return new Promise((ok) => {
    try {
      if (typeof indexedDB === 'undefined') return ok(null)
      const req = indexedDB.open(BANCO, 1)
      req.onupgradeneeded = () => req.result.createObjectStore(LOJA, { keyPath: 'chave' })
      req.onsuccess = () => ok(req.result)
      req.onerror = () => ok(null)
    } catch {
      ok(null)
    }
  })
}

async function comLoja<T>(modo: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
  const db = await abrir()
  if (!db) return null
  return new Promise((ok) => {
    try {
      const req = fn(db.transaction(LOJA, modo).objectStore(LOJA))
      req.onsuccess = () => ok(req.result)
      req.onerror = () => ok(null)
    } catch {
      ok(null)
    }
  })
}

const avisar = () => window.dispatchEvent(new Event(EVENTO))

export async function salvarLocal(f: FotoLocal): Promise<void> {
  memoria.set(f.chave, f)
  await comLoja('readwrite', (s) => s.put(f))
  avisar()
}

export async function removerLocal(chave: string): Promise<void> {
  memoria.delete(chave)
  await comLoja('readwrite', (s) => s.delete(chave))
  avisar()
}

export async function listarLocais(tipo: FotoLocal['tipo'], alvoId?: string): Promise<FotoLocal[]> {
  const doBanco = (await comLoja<FotoLocal[]>('readonly', (s) => s.getAll() as IDBRequest<FotoLocal[]>)) ?? []
  const todas = new Map(doBanco.map((f) => [f.chave, f]))
  for (const f of memoria.values()) if (!todas.has(f.chave)) todas.set(f.chave, f)
  return [...todas.values()].filter((f) => f.tipo === tipo && (!alvoId || f.alvoId === alvoId)).sort((a, b) => a.criadaEm.localeCompare(b.criadaEm))
}

/** Chama `fn` quando alguma foto local entra ou sai. */
export function aoMudarLocais(fn: () => void): () => void {
  window.addEventListener(EVENTO, fn)
  return () => window.removeEventListener(EVENTO, fn)
}

/** Guarda a foto do carro neste aparelho (pendente de envio) para a esteira. */
export function guardarFotoDoCarro(conveyorId: string, blob: Blob): Promise<void> {
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
  return salvarLocal({ chave: `esteira:${conveyorId}:${id}`, tipo: 'esteira', alvoId: conveyorId, blob, criadaEm: new Date().toISOString() })
}
