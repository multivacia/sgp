import type { Env } from '../../config/env.js';
import type { ArgosDocumentDraftPort } from './argosDocumentDraftPort.js';
import type { ArgosDocumentDraftIngestInput } from './argosDocumentDraftPort.js';
import type { ArgosDocumentIngestResult } from './document-draft.schemas.js';
/**
 * Cliente HTTP para o gateway ARGOS (`POST /v1/documents` — multipart alinhado a
 * `argos-gateway` `documentIngestFieldsSchema`). Traduz a resposta oficial para
 * `ArgosDocumentIngestResult` (contrato lógico do BFF SGP+).
 */
export declare class HttpArgosDocumentDraftAdapter implements ArgosDocumentDraftPort {
    private readonly env;
    readonly documentDraftExecutionMode: "remote";
    constructor(env: Env);
    ingest(input: ArgosDocumentDraftIngestInput): Promise<ArgosDocumentIngestResult>;
}
//# sourceMappingURL=httpArgosDocumentDraftAdapter.d.ts.map