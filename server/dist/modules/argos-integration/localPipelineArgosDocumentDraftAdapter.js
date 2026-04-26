import { randomUUID } from 'node:crypto';
import { buildDocumentDraftResult } from './pipeline/buildDocumentDraftResult.js';
import { extractDocumentText } from './pipeline/extractDocumentText.js';
import { interpretHeuristicBr } from './pipeline/interpretHeuristicBr.js';
/**
 * Pipeline documental em processo — extrator → intérprete heurístico → draft v1.
 * Não persiste estado; não acopla UI SGP+.
 */
export class LocalPipelineArgosDocumentDraftAdapter {
    documentDraftExecutionMode = 'local';
    async ingest(input) {
        const correlationId = input.envelope.metadata?.correlationId?.trim() || randomUUID();
        const extract = await extractDocumentText({
            buffer: input.fileBuffer,
            mimeType: input.mimeType,
            fileName: input.fileName,
        });
        const interpretation = interpretHeuristicBr({
            text: extract.text,
            fileName: input.fileName,
        });
        return buildDocumentDraftResult({
            fileBuffer: input.fileBuffer,
            fileName: input.fileName,
            mimeType: input.mimeType,
            correlationId,
            extract,
            interpretation,
        });
    }
}
//# sourceMappingURL=localPipelineArgosDocumentDraftAdapter.js.map