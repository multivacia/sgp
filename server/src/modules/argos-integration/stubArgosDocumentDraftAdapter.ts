import { createHash, randomUUID } from 'node:crypto'
import type {
  ArgosDocumentDraftIngestInput,
  ArgosDocumentDraftPort,
} from './argosDocumentDraftPort.js'
import type { ArgosDocumentIngestResult } from './document-draft.schemas.js'

/**
 * Stub mínimo determinístico — só quando `ARGOS_USE_MINIMAL_STUB=1` no ambiente.
 * Não substitui o pipeline heurístico local nem o ARGOS remoto; serve a testes rápidos.
 */
export class StubArgosDocumentDraftAdapter implements ArgosDocumentDraftPort {
  readonly documentDraftExecutionMode = 'stub' as const

  async ingest(input: ArgosDocumentDraftIngestInput): Promise<ArgosDocumentIngestResult> {
    const requestId = randomUUID()
    const correlationId =
      input.envelope.metadata?.correlationId?.trim() || randomUUID()
    const sha256 = createHash('sha256').update(input.fileBuffer).digest('hex')

    return {
      requestId,
      correlationId,
      status: 'completed',
      specialist: 'sgp_minimal_stub',
      strategy: 'minimal_stub_explicit',
      document: {
        fileName: input.fileName,
        mimeType: input.mimeType,
        contentSha256: sha256,
      },
      extractedFacts: [
        {
          key: 'ingest.stub',
          value: true,
          confidence: 1,
        },
      ],
      draft: {
        schemaVersion: '1.0.0',
        suggestedDados: {
          title: input.fileName.replace(/\.[^.]+$/, '') || undefined,
        },
        options: [],
      },
      warnings: [],
      confidence: {
        overall: 0.5,
      },
    }
  }
}
