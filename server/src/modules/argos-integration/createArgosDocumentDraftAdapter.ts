import type { Env } from '../../config/env.js'
import type pg from 'pg'
import type { ArgosDocumentDraftPort } from './argosDocumentDraftPort.js'
import { HttpArgosDocumentDraftAdapter } from './httpArgosDocumentDraftAdapter.js'
import { LocalPipelineArgosDocumentDraftAdapter } from './localPipelineArgosDocumentDraftAdapter.js'
import { StubArgosDocumentDraftAdapter } from './stubArgosDocumentDraftAdapter.js'

/**
 * Escolha explícita via `env.documentDraftAdapter` (variável `DOCUMENT_DRAFT_ADAPTER`).
 * `ARGOS_INGEST_URL` já não ativa remoto sozinho — evita gateway legado no importador OS Bravo.
 */
export function createArgosDocumentDraftAdapter(
  env: Env,
  pool?: pg.Pool,
): ArgosDocumentDraftPort {
  switch (env.documentDraftAdapter) {
    case 'stub':
      return new StubArgosDocumentDraftAdapter()
    case 'remote':
      return new HttpArgosDocumentDraftAdapter(env)
    case 'local':
    default:
      return new LocalPipelineArgosDocumentDraftAdapter(pool)
  }
}
