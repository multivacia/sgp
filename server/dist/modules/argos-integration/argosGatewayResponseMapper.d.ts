import type { ArgosDocumentIngestResult } from './document-draft.schemas.js';
/**
 * Traduz a resposta do gateway ARGOS (`DocumentIngestResponseBody` em argos-gateway)
 * para o contrato lógico consumido pelo SGP+ (`ArgosDocumentIngestResult`).
 */
export declare function mapArgosGatewayDocumentIngestToSgp(raw: unknown): ArgosDocumentIngestResult;
/**
 * Extrai o `data` do envelope HTTP e mapeia para SGP+.
 * Aceita `{ success: true, data }` (gateway ARGOS) ou payload já normalizado.
 */
export declare function parseArgosRemoteDocumentIngestPayload(json: unknown): ArgosDocumentIngestResult;
//# sourceMappingURL=argosGatewayResponseMapper.d.ts.map