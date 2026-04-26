import type { ArgosDocumentIngestResult } from '../document-draft.schemas.js';
import type { ExtractDocumentTextResult } from './extractDocumentText.js';
import type { HeuristicInterpretation } from './interpretHeuristicBr.js';
/**
 * Monta o resultado oficial do ingest — draft de domínio v1 + warnings + confiança.
 */
export declare function buildDocumentDraftResult(params: {
    fileBuffer: Buffer;
    fileName: string;
    mimeType: string | undefined;
    correlationId: string;
    extract: ExtractDocumentTextResult;
    interpretation: HeuristicInterpretation;
}): ArgosDocumentIngestResult;
//# sourceMappingURL=buildDocumentDraftResult.d.ts.map