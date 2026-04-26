import type {
  ArgosDocumentIngestEnvelope,
  ArgosDocumentIngestResult,
} from './document-draft.schemas.js'

export type ArgosDocumentDraftIngestInput = {
  fileBuffer: Buffer
  fileName: string
  mimeType: string | undefined
  envelope: ArgosDocumentIngestEnvelope
}

/** Modo de execução do ingest no servidor SGP+ (fonte de verdade para a UI). */
export type DocumentDraftExecutionMode = 'remote' | 'local' | 'stub'

/**
 * Porta de integração ARGOS — interpretação de documento → resultado estruturado.
 * Implementações: stub local, cliente HTTP, fila, etc.
 */
export type ArgosDocumentDraftPort = {
  readonly documentDraftExecutionMode: DocumentDraftExecutionMode
  ingest(input: ArgosDocumentDraftIngestInput): Promise<ArgosDocumentIngestResult>
}
