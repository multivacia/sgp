import type { Env } from '../../config/env.js';
import type { ArgosDocumentDraftIngestInput } from './argosDocumentDraftPort.js';
/** Modos de política aceites pelo gateway ARGOS (`policyModeSchema`). */
export type ArgosGatewayPolicyMode = 'economy' | 'balanced' | 'quality';
/**
 * Monta `multipart/form-data` alinhado a
 * `argos/apps/argos-gateway/src/contracts/documentIngest.ts` (`documentIngestFieldsSchema`).
 * O contrato lógico SGP+ (`envelope`) é preservado em `businessContext` (JSON string).
 */
export declare function buildArgosGatewayDocumentFormData(input: ArgosDocumentDraftIngestInput, env: Env): FormData;
//# sourceMappingURL=argosGatewayMultipart.d.ts.map