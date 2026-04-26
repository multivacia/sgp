import { argosDocumentIngestResultSchema, CONVEYOR_DRAFT_SCHEMA_VERSION_V1, } from './document-draft.schemas.js';
function isRecord(v) {
    return v !== null && typeof v === 'object' && !Array.isArray(v);
}
function confTo01(c) {
    switch (c) {
        case 'high':
            return 0.88;
        case 'medium':
            return 0.55;
        default:
            return 0.32;
    }
}
function overallConfidence(c, a) {
    if (c === 'high' && a === 'low')
        return 0.92;
    if (c === 'high')
        return 0.78;
    if (c === 'medium' && a === 'low')
        return 0.62;
    return 0.48;
}
/**
 * Traduz a resposta do gateway ARGOS (`DocumentIngestResponseBody` em argos-gateway)
 * para o contrato lógico consumido pelo SGP+ (`ArgosDocumentIngestResult`).
 */
export function mapArgosGatewayDocumentIngestToSgp(raw) {
    const data = raw;
    if (!isRecord(data)) {
        throw new Error('Resposta ARGOS: corpo não é um objeto.');
    }
    const requestId = data.requestId;
    const correlationId = data.correlationId;
    const statusRaw = data.status;
    const understanding = data.understanding;
    const quality = data.quality;
    const trace = data.trace;
    if (typeof requestId !== 'string' || !requestId.trim()) {
        throw new Error('Resposta ARGOS: requestId em falta.');
    }
    if (typeof correlationId !== 'string' || !correlationId.trim()) {
        throw new Error('Resposta ARGOS: correlationId em falta.');
    }
    if (statusRaw !== 'SUCCESS' && statusRaw !== 'SUCCESS_WITH_WARNINGS') {
        throw new Error('Resposta ARGOS: status macro inesperado.');
    }
    if (!isRecord(understanding) || !isRecord(quality) || !isRecord(trace)) {
        throw new Error('Resposta ARGOS: estrutura understanding/quality/trace inválida.');
    }
    const details = understanding.details;
    if (!isRecord(details)) {
        throw new Error('Resposta ARGOS: understanding.details em falta.');
    }
    const artifact = details.artifact;
    const novaBlock = details.novaEsteiraPorDocumento;
    const draftBlock = details.draft;
    const document = {};
    if (isRecord(artifact)) {
        if (typeof artifact.fileName === 'string')
            document.fileName = artifact.fileName;
        if (typeof artifact.mimeType === 'string')
            document.mimeType = artifact.mimeType;
    }
    const extractedFacts = [];
    if (isRecord(draftBlock) && isRecord(draftBlock.result)) {
        const consolidated = draftBlock.result.consolidated;
        if (isRecord(consolidated)) {
            const fields = consolidated.fields;
            if (Array.isArray(fields)) {
                let i = 0;
                for (const f of fields) {
                    if (!isRecord(f))
                        continue;
                    const label = typeof f.label === 'string' ? f.label : `field_${i}`;
                    const valueRaw = f.valuePreview ?? f.value;
                    const value = typeof valueRaw === 'string'
                        ? valueRaw
                        : typeof valueRaw === 'number' || typeof valueRaw === 'boolean'
                            ? valueRaw
                            : String(valueRaw ?? '');
                    const conf = typeof f.confidence === 'number' ? f.confidence : undefined;
                    extractedFacts.push({
                        key: label.slice(0, 256),
                        value,
                        confidence: conf,
                    });
                    i += 1;
                    if (i >= 80)
                        break;
                }
            }
        }
    }
    const warnings = [];
    const qw = quality.warnings;
    if (Array.isArray(qw)) {
        for (const w of qw) {
            if (!isRecord(w))
                continue;
            const code = typeof w.code === 'string' ? w.code : 'argos.warning';
            const message = typeof w.message === 'string' ? w.message : undefined;
            warnings.push({
                category: 'revisable_warning',
                code: code.slice(0, 256),
                message,
            });
        }
    }
    const qcRaw = quality.confidence;
    const qaRaw = quality.ambiguity;
    const qc = qcRaw === 'high' || qcRaw === 'medium' ? qcRaw : 'medium';
    const qa = qaRaw === 'low' || qaRaw === 'medium' ? qaRaw : 'medium';
    const confidence = {
        overall: overallConfidence(qc, qa),
    };
    const novaResult = isRecord(novaBlock) && isRecord(novaBlock.result) ? novaBlock.result : null;
    const draft = buildConveyorDraftV1FromNova(novaResult, extractedFacts);
    const novaTrace = isRecord(novaBlock) ? novaBlock.trace : undefined;
    const specialist = isRecord(novaTrace) && typeof novaTrace.specialistKey === 'string'
        ? novaTrace.specialistKey
        : typeof trace.specialistKey === 'string'
            ? trace.specialistKey
            : 'argos_document_gateway';
    const strategy = isRecord(novaTrace) && typeof novaTrace.strategyUsed === 'string'
        ? novaTrace.strategyUsed
        : typeof trace.strategyUsed === 'string'
            ? trace.strategyUsed
            : 'pdf_ingest_v1';
    const sgpStatus = statusRaw === 'SUCCESS_WITH_WARNINGS' ? 'partial' : 'completed';
    const result = {
        requestId,
        correlationId,
        status: sgpStatus,
        specialist,
        strategy,
        document,
        extractedFacts,
        draft,
        warnings,
        confidence,
    };
    const checked = argosDocumentIngestResultSchema.safeParse(result);
    if (!checked.success) {
        throw new Error('Mapeamento interno: resultado não passou na validação do contrato SGP+.');
    }
    return checked.data;
}
function buildConveyorDraftV1FromNova(novaResult, extractedFacts) {
    if (!novaResult) {
        return minimalDraftFromFacts(extractedFacts);
    }
    const businessView = isRecord(novaResult.businessView)
        ? novaResult.businessView
        : null;
    const structural = isRecord(novaResult.structuralEsteiraDraft)
        ? novaResult.structuralEsteiraDraft
        : null;
    const suggestedDados = {};
    if (structural && isRecord(structural.documentPrincipal)) {
        const dp = structural.documentPrincipal;
        const titleHint = typeof dp.titleHint === 'string' ? dp.titleHint.trim() : '';
        if (titleHint)
            suggestedDados.title = titleHint.slice(0, 500);
        const summaryLine = typeof dp.summaryLine === 'string' ? dp.summaryLine.trim() : '';
        const idCandidates = dp.identifierCandidates;
        if (Array.isArray(idCandidates)) {
            for (const c of idCandidates) {
                if (!isRecord(c))
                    continue;
                if (c.semanticRole === 'order_number') {
                    const pv = typeof c.valuePreview === 'string' ? c.valuePreview.trim() : '';
                    if (pv) {
                        ;
                        suggestedDados.osNumber = pv.slice(0, 200);
                    }
                    break;
                }
            }
        }
        const risks = businessView && Array.isArray(businessView.risksAndGaps)
            ? businessView.risksAndGaps
                .filter((s) => typeof s === 'string')
                .join('\n')
            : '';
        const notesParts = [summaryLine, risks].filter(Boolean);
        if (notesParts.length > 0) {
            suggestedDados.notes = notesParts.join('\n\n').slice(0, 8000);
        }
    }
    else if (businessView && typeof businessView.summary === 'string') {
        const s = businessView.summary.trim();
        if (s)
            suggestedDados.notes = s.slice(0, 8000);
    }
    if (structural && Array.isArray(structural.mappedFields)) {
        for (const mf of structural.mappedFields) {
            if (!isRecord(mf))
                continue;
            const label = typeof mf.label === 'string' ? mf.label.toLowerCase() : '';
            const preview = typeof mf.valuePreview === 'string' ? mf.valuePreview.trim() : '';
            if (!preview)
                continue;
            if (/placa|matr[ií]cula/.test(label)) {
                suggestedDados.licensePlate = preview;
            }
            else if (/cliente|requerente|nome/.test(label)) {
                suggestedDados.clientName = preview;
            }
            else if (/ve[ií]culo|modelo|marca/.test(label)) {
                suggestedDados.vehicleDescription = preview;
            }
        }
    }
    const options = buildOptionsFromBusinessView(businessView);
    const format = typeof novaResult.format === 'string' ? novaResult.format : undefined;
    const draft = {
        schemaVersion: CONVEYOR_DRAFT_SCHEMA_VERSION_V1,
        suggestedDados,
        options,
        extensions: {
            argosNovaEsteiraFormat: format,
            argosStructuralSchema: structural?.schema,
        },
    };
    if (!draft.suggestedDados.title?.trim() && businessView) {
        const summary = typeof businessView.summary === 'string'
            ? businessView.summary.trim().slice(0, 500)
            : '';
        if (summary)
            draft.suggestedDados.title = summary;
    }
    if (!draft.suggestedDados.title?.trim() &&
        extractedFacts.length > 0 &&
        typeof extractedFacts[0].value === 'string') {
        draft.suggestedDados.title = 'Esteira a partir de documento';
        draft.suggestedDados.notes =
            [draft.suggestedDados.notes, extractedFacts[0].value]
                .filter(Boolean)
                .join('\n')
                .slice(0, 8000) || extractedFacts[0].value.slice(0, 8000);
    }
    return draft;
}
function buildOptionsFromBusinessView(businessView) {
    if (!businessView)
        return [];
    const items = businessView.candidateWorkItems;
    if (!Array.isArray(items) || items.length === 0)
        return [];
    const steps = [];
    let i = 0;
    for (const w of items) {
        if (!isRecord(w))
            continue;
        const label = typeof w.label === 'string' ? w.label.trim() : '';
        if (!label)
            continue;
        const conf = w.confidence;
        steps.push({
            orderIndex: i + 1,
            title: label.slice(0, 500),
            confidence: conf === 'high' || conf === 'medium' || conf === 'low'
                ? confTo01(conf)
                : undefined,
        });
        i += 1;
        if (i >= 64)
            break;
    }
    if (steps.length === 0)
        return [];
    return [
        {
            orderIndex: 1,
            title: 'Itens sugeridos a partir do documento',
            areas: [
                {
                    orderIndex: 1,
                    title: 'Serviço',
                    steps,
                },
            ],
        },
    ];
}
function minimalDraftFromFacts(extractedFacts) {
    const title = extractedFacts.length > 0 && typeof extractedFacts[0].value === 'string'
        ? 'Esteira a partir de documento'
        : 'Rascunho a partir do documento';
    const notes = extractedFacts
        .slice(0, 12)
        .map((f) => `${f.key}: ${String(f.value)}`)
        .join('\n')
        .slice(0, 8000) || undefined;
    return {
        schemaVersion: CONVEYOR_DRAFT_SCHEMA_VERSION_V1,
        suggestedDados: { title, notes },
        options: [],
    };
}
/**
 * Extrai o `data` do envelope HTTP e mapeia para SGP+.
 * Aceita `{ success: true, data }` (gateway ARGOS) ou payload já normalizado.
 */
export function parseArgosRemoteDocumentIngestPayload(json) {
    const body = json;
    if (!isRecord(body)) {
        throw new Error('Resposta ARGOS inválida.');
    }
    if (body.success === false && isRecord(body.error)) {
        const msg = typeof body.error.message === 'string'
            ? body.error.message
            : 'Pedido documental recusado pelo ARGOS.';
        throw new Error(msg);
    }
    let payload = body;
    if (body.success === true && 'data' in body) {
        payload = body.data;
    }
    else if ('data' in body && body.success !== false) {
        payload = body.data;
    }
    const mapped = tryMapArgosGatewayPayload(payload);
    if (mapped)
        return mapped;
    const legacy = argosDocumentIngestResultSchema.safeParse(payload);
    if (legacy.success)
        return legacy.data;
    throw new Error('Resposta ARGOS não corresponde ao contrato documental (gateway nem legado SGP+).');
}
function tryMapArgosGatewayPayload(payload) {
    try {
        return mapArgosGatewayDocumentIngestToSgp(payload);
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=argosGatewayResponseMapper.js.map