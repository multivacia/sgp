import { AppError } from '../../shared/errors/AppError.js';
import { ErrorCodes } from '../../shared/errors/errorCodes.js';
import { buildArgosGatewayDocumentFormData } from './argosGatewayMultipart.js';
import { parseArgosRemoteDocumentIngestPayload } from './argosGatewayResponseMapper.js';
/**
 * Cliente HTTP para o gateway ARGOS (`POST /v1/documents` — multipart alinhado a
 * `argos-gateway` `documentIngestFieldsSchema`). Traduz a resposta oficial para
 * `ArgosDocumentIngestResult` (contrato lógico do BFF SGP+).
 */
export class HttpArgosDocumentDraftAdapter {
    env;
    documentDraftExecutionMode = 'remote';
    constructor(env) {
        this.env = env;
    }
    async ingest(input) {
        const url = this.env.argosIngestUrl;
        if (!url?.trim()) {
            throw new AppError('ARGOS_INGEST_URL não configurado.', 500, ErrorCodes.INTERNAL);
        }
        const form = buildArgosGatewayDocumentFormData(input, this.env);
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), this.env.argosIngestTimeoutMs);
        try {
            const headers = {};
            const token = this.env.argosIngestToken?.trim();
            if (token) {
                headers.Authorization = `Bearer ${token}`;
            }
            const res = await fetch(url.trim(), {
                method: 'POST',
                body: form,
                signal: controller.signal,
                headers,
            });
            const text = await res.text();
            let json;
            try {
                json = text ? JSON.parse(text) : null;
            }
            catch {
                throw new AppError('Resposta ARGOS não é JSON válido.', 502, ErrorCodes.INTERNAL);
            }
            if (!res.ok) {
                const msg = extractArgosErrorMessage(json, res.status);
                throw new AppError(msg, 502, ErrorCodes.INTERNAL, json);
            }
            try {
                return parseArgosRemoteDocumentIngestPayload(json);
            }
            catch (e) {
                const hint = e instanceof Error ? e.message : 'Resposta ARGOS inesperada.';
                throw new AppError(hint, 502, ErrorCodes.INTERNAL, e instanceof Error ? undefined : e);
            }
        }
        catch (e) {
            if (e instanceof AppError)
                throw e;
            if (e instanceof Error && e.name === 'AbortError') {
                throw new AppError('Timeout ao contactar ARGOS.', 504, ErrorCodes.INTERNAL);
            }
            throw new AppError(e instanceof Error ? e.message : 'Falha ao contactar ARGOS.', 502, ErrorCodes.INTERNAL);
        }
        finally {
            clearTimeout(t);
        }
    }
}
function extractArgosErrorMessage(json, httpStatus) {
    if (json && typeof json === 'object' && json !== null) {
        const o = json;
        if (o.success === false && o.error && typeof o.error === 'object') {
            const err = o.error;
            if (typeof err.message === 'string' && err.message.trim()) {
                return err.message.trim();
            }
        }
        if ('error' in o &&
            o.error &&
            typeof o.error === 'object' &&
            o.error !== null) {
            const nested = o.error;
            if (typeof nested.message === 'string' && nested.message.trim()) {
                return nested.message.trim();
            }
        }
    }
    return `ARGOS HTTP ${httpStatus}`;
}
//# sourceMappingURL=httpArgosDocumentDraftAdapter.js.map