import type { ArgosDocumentDraftIngestInput, ArgosDocumentDraftPort } from './argosDocumentDraftPort.js';
import type { ArgosDocumentIngestResult } from './document-draft.schemas.js';
/**
 * Stub mínimo determinístico — só quando `ARGOS_USE_MINIMAL_STUB=1` no ambiente.
 * Não substitui o pipeline heurístico local nem o ARGOS remoto; serve a testes rápidos.
 */
export declare class StubArgosDocumentDraftAdapter implements ArgosDocumentDraftPort {
    readonly documentDraftExecutionMode: "stub";
    ingest(input: ArgosDocumentDraftIngestInput): Promise<ArgosDocumentIngestResult>;
}
//# sourceMappingURL=stubArgosDocumentDraftAdapter.d.ts.map