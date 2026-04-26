import type { ArgosDocumentIngestResult } from '../../domain/argos/ingest-response.types'
import { ARGOS_INTENT_CONVEYOR_DRAFT_FROM_DOCUMENT } from '../../domain/argos/intent'
import { getApiBaseUrl } from '../../lib/api/env'
import {
  ApiError,
  friendlyMessageForHttpStatus,
  parseErrorEnvelope,
  SESSION_REVOKED_CREDENTIALS_CHANGED_CODE,
} from '../../lib/api/apiErrors'
import { SGP_NETWORK_ERROR_API_DIAGNOSTIC_MESSAGE } from '../../lib/errors/sgpErrorContract'

const BASE = '/api/v1'

/** Alinhado ao `meta` devolvido pelo `POST .../conveyors/document-draft` no SGP+. */
export type DocumentDraftExecutionMode = 'remote' | 'local' | 'stub'

export type PostConveyorDocumentDraftResult = {
  result: ArgosDocumentIngestResult
  /** Ausente se o servidor for mais antigo e não enviar `meta`. */
  documentDraftExecutionMode?: DocumentDraftExecutionMode
}

/** Envelope JSON exigido pelo `POST .../conveyors/document-draft` (campo `envelope`). */
export function buildDocumentDraftEnvelopeJson(): string {
  return JSON.stringify({
    caller: { systemId: 'sgp-plus-web' },
    policy: {},
    intent: ARGOS_INTENT_CONVEYOR_DRAFT_FROM_DOCUMENT,
  })
}

function parseDocumentDraftExecutionMode(
  raw: unknown,
): DocumentDraftExecutionMode | undefined {
  if (raw === 'remote' || raw === 'local' || raw === 'stub') return raw
  return undefined
}

/**
 * Envia o PDF ao backend SGP+ (ARGOS remoto / pipeline local / stub conforme configuração do servidor).
 * O modo de execução vem em `meta` — não inferir no cliente.
 */
export async function postConveyorDocumentDraft(
  file: File,
): Promise<PostConveyorDocumentDraftResult> {
  const fd = new FormData()
  fd.set('envelope', buildDocumentDraftEnvelopeJson())
  fd.set('file', file, file.name)

  const base = getApiBaseUrl()
  const pathPart = `${BASE}/conveyors/document-draft`
  const url = base ? `${base}${pathPart}` : pathPart

  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      body: fd,
    })
  } catch (e) {
    const isNetwork =
      e instanceof TypeError ||
      (e instanceof Error &&
        (e.message.includes('Failed to fetch') ||
          e.message.includes('NetworkError') ||
          e.name === 'NetworkError'))
    const msg = isNetwork
      ? SGP_NETWORK_ERROR_API_DIAGNOSTIC_MESSAGE
      : 'Falha de ligação inesperada. Tente novamente ou recarregue a página.'
    throw new ApiError(msg, 503, { code: 'NETWORK_ERROR', cause: e })
  }

  const text = await res.text()
  let parsed: unknown
  try {
    parsed = text ? JSON.parse(text) : null
  } catch {
    if (!res.ok) {
      throw new ApiError(
        friendlyMessageForHttpStatus(res.status),
        res.status,
      )
    }
    throw new ApiError('Resposta inválida do servidor.', res.status)
  }

  if (!res.ok) {
    const { message, code, details } = parseErrorEnvelope(parsed, res.status)
    if (
      res.status === 401 &&
      code === SESSION_REVOKED_CREDENTIALS_CHANGED_CODE
    ) {
      window.dispatchEvent(
        new CustomEvent('sgp:session-revoked', { detail: { message } }),
      )
    }
    throw new ApiError(message, res.status, { code, details })
  }

  if (parsed && typeof parsed === 'object' && 'data' in parsed) {
    const envelope = parsed as {
      data: ArgosDocumentIngestResult
      meta?: { documentDraftExecutionMode?: unknown }
    }
    return {
      result: envelope.data,
      documentDraftExecutionMode: parseDocumentDraftExecutionMode(
        envelope.meta?.documentDraftExecutionMode,
      ),
    }
  }
  return { result: parsed as ArgosDocumentIngestResult }
}
