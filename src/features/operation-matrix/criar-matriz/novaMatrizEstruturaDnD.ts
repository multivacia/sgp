/** MIME type único para payload JSON do drag/drop na etapa Estrutura (nova matriz). */
export const NOVA_MATRIZ_ESTRUTURA_DND_MIME =
  'application/x-sgp-nova-matriz-estrutura' as const

export type NovaMatrizCatalogDragPayload = {
  kind: 'catalog-task'
  taskId: string
}

export type NovaMatrizDraftDragPayload = {
  kind: 'draft-task'
  instanceId: string
}

export type NovaMatrizEstruturaDragPayload =
  | NovaMatrizCatalogDragPayload
  | NovaMatrizDraftDragPayload

export function stringifyNovaMatrizEstruturaDrag(
  payload: NovaMatrizEstruturaDragPayload,
): string {
  return JSON.stringify(payload)
}

export function parseNovaMatrizEstruturaDrag(
  raw: string,
): NovaMatrizEstruturaDragPayload | null {
  try {
    const v = JSON.parse(raw) as unknown
    if (!v || typeof v !== 'object') return null
    const o = v as Record<string, unknown>
    if (o.kind === 'catalog-task' && typeof o.taskId === 'string') {
      return { kind: 'catalog-task', taskId: o.taskId }
    }
    if (o.kind === 'draft-task' && typeof o.instanceId === 'string') {
      return { kind: 'draft-task', instanceId: o.instanceId }
    }
    return null
  } catch {
    return null
  }
}

/** Resultado síncrono de tentar incluir tarefa do catálogo no rascunho (para foco/scroll). */
export type NovaMatrizAddCatalogResult =
  | { outcome: 'duplicate' }
  | { outcome: 'added'; instanceId: string }
  | { outcome: 'noop' }
