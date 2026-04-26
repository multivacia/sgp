import { randomUUID } from 'node:crypto';
import { ARGOS_INTENT_CONVEYOR_DRAFT_FROM_DOCUMENT } from './document-draft.schemas.js';
/**
 * Monta `multipart/form-data` alinhado a
 * `argos/apps/argos-gateway/src/contracts/documentIngest.ts` (`documentIngestFieldsSchema`).
 * O contrato lógico SGP+ (`envelope`) é preservado em `businessContext` (JSON string).
 */
export function buildArgosGatewayDocumentFormData(input, env) {
    const form = new FormData();
    const mime = input.mimeType || 'application/octet-stream';
    const blob = new Blob([input.fileBuffer], { type: mime });
    form.append('file', blob, input.fileName);
    const callerSystem = input.envelope.caller.systemId.trim().slice(0, 128);
    if (!callerSystem) {
        throw new Error('caller.systemId do envelope está vazio.');
    }
    form.append('callerSystem', callerSystem);
    const envLabel = env.argosCallerEnvironment?.trim();
    if (envLabel) {
        form.append('callerEnvironment', envLabel.slice(0, 64));
    }
    const correlationId = input.envelope.metadata?.correlationId?.trim().slice(0, 512) ||
        randomUUID();
    form.append('correlationId', correlationId);
    form.append('policy', env.argosPolicyMode);
    const businessContext = JSON.stringify({
        sgpIntent: ARGOS_INTENT_CONVEYOR_DRAFT_FROM_DOCUMENT,
        sgpPolicy: input.envelope.policy,
        sgpMetadata: input.envelope.metadata ?? {},
    });
    if (businessContext.length <= 64_000) {
        form.append('businessContext', businessContext);
    }
    return form;
}
//# sourceMappingURL=argosGatewayMultipart.js.map