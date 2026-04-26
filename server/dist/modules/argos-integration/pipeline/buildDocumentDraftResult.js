import { createHash, randomUUID } from 'node:crypto';
function sha256(buf) {
    return createHash('sha256').update(buf).digest('hex');
}
function avg(nums) {
    if (nums.length === 0)
        return 0;
    return nums.reduce((a, b) => a + b, 0) / nums.length;
}
function buildOptionsFromServiceLines(h) {
    if (h.serviceLines.length === 0)
        return [];
    const steps = h.serviceLines.map((sl) => ({
        orderIndex: sl.orderIndex,
        title: sl.title.slice(0, 500),
        plannedMinutes: undefined,
        confidence: sl.confidence,
    }));
    return [
        {
            orderIndex: 1,
            title: 'Itens inferidos do documento',
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
/**
 * Monta o resultado oficial do ingest — draft de domínio v1 + warnings + confiança.
 */
export function buildDocumentDraftResult(params) {
    const requestId = randomUUID();
    const { extract, interpretation: h, fileBuffer, fileName, mimeType, correlationId } = params;
    if (fileBuffer.length === 0) {
        return {
            requestId,
            correlationId,
            status: 'failed',
            specialist: 'sgp_argos_local_heuristic_v1',
            strategy: 'local_heuristic_pipeline_v1',
            document: {
                fileName,
                mimeType,
                contentSha256: sha256(fileBuffer),
            },
            extractedFacts: [],
            draft: null,
            warnings: [
                {
                    category: 'fatal_error',
                    code: 'file.empty_buffer',
                    message: 'Ficheiro vazio; nada a interpretar.',
                    fieldPath: 'file',
                },
            ],
            confidence: { overall: 0 },
        };
    }
    const issues = [];
    for (const w of extract.extractWarnings) {
        issues.push({
            category: 'revisable_warning',
            code: w.code,
            message: w.message,
            fieldPath: 'document',
        });
    }
    const textEmpty = !extract.text.trim();
    if (textEmpty) {
        issues.push({
            category: 'revisable_warning',
            code: 'interpret.text_empty',
            message: 'Texto vazio após extração; sugestões baseadas apenas no nome do ficheiro, se aplicável.',
            fieldPath: 'extract.text',
        });
    }
    const fieldPaths = [
        {
            path: 'suggestedDados.osNumber',
            label: 'Número da OS',
            present: Boolean(h.osNumber),
            conf: h.fieldConfidence.osNumber,
        },
        {
            path: 'suggestedDados.licensePlate',
            label: 'Placa',
            present: Boolean(h.licensePlate),
            conf: h.fieldConfidence.licensePlate,
        },
        {
            path: 'suggestedDados.clientName',
            label: 'Cliente',
            present: Boolean(h.clientName),
            conf: h.fieldConfidence.clientName,
        },
        {
            path: 'suggestedDados.notes',
            label: 'Observações',
            present: Boolean(h.notes && h.notes.length > 0),
            conf: 0.5,
        },
        {
            path: 'options.serviceLines',
            label: 'Linhas de serviço',
            present: h.serviceLines.length > 0,
            conf: h.serviceLines.length ? avg(h.serviceLines.map((s) => s.confidence)) : undefined,
        },
        {
            path: 'suggestedEsteiraTitle',
            label: 'Nome sugerido da esteira',
            present: Boolean(h.suggestedEsteiraTitle),
            conf: h.fieldConfidence.suggestedEsteiraTitle,
        },
        {
            path: 'suggestedEsteiraDescription',
            label: 'Descrição sugerida',
            present: Boolean(h.suggestedEsteiraDescription),
            conf: h.fieldConfidence.suggestedEsteiraDescription,
        },
    ];
    for (const f of fieldPaths) {
        if (!f.present) {
            issues.push({
                category: 'missing_field',
                code: `field.missing.${f.path.replace(/\./g, '_')}`,
                message: `${f.label} não identificado com confiança suficiente.`,
                fieldPath: f.path,
            });
        }
        else if (f.conf !== undefined && f.conf < 0.45) {
            issues.push({
                category: 'low_confidence_field',
                code: `field.low_confidence.${f.path.replace(/\./g, '_')}`,
                message: `${f.label} presente mas com confiança baixa.`,
                fieldPath: f.path,
                confidence: f.conf,
            });
        }
    }
    const byField = { ...h.fieldConfidence };
    const overall = avg([
        ...Object.values(h.fieldConfidence),
        textEmpty ? 0.2 : 0.75,
        extract.source === 'pdf' ? 0.85 : extract.source === 'text' ? 0.9 : 0.55,
    ].filter((x) => typeof x === 'number'));
    const extractedFacts = [];
    if (h.osNumber)
        extractedFacts.push({
            key: 'os.number',
            value: h.osNumber,
            confidence: h.fieldConfidence.osNumber,
        });
    if (h.licensePlate)
        extractedFacts.push({
            key: 'vehicle.licensePlate',
            value: h.licensePlate,
            confidence: h.fieldConfidence.licensePlate,
        });
    if (h.clientName)
        extractedFacts.push({
            key: 'customer.name',
            value: h.clientName,
            confidence: h.fieldConfidence.clientName,
        });
    if (h.vehicleDescription)
        extractedFacts.push({
            key: 'vehicle.description',
            value: h.vehicleDescription,
            confidence: 0.5,
        });
    if (h.modelVersion)
        extractedFacts.push({
            key: 'vehicle.modelVersion',
            value: h.modelVersion,
            confidence: h.fieldConfidence.modelVersion ?? 0.55,
        });
    for (const sl of h.serviceLines.slice(0, 15)) {
        extractedFacts.push({
            key: `serviceLine.${sl.orderIndex}`,
            value: sl.title,
            confidence: sl.confidence,
        });
    }
    const draft = {
        schemaVersion: '1.0.0',
        suggestedDados: {
            title: h.suggestedEsteiraTitle ?? fileName.replace(/\.[^.]+$/, ''),
            clientName: h.clientName,
            vehicleDescription: h.vehicleDescription,
            modelVersion: h.modelVersion,
            licensePlate: h.licensePlate,
            notes: h.notes,
            priorityHint: h.priorityHint,
            osNumber: h.osNumber,
        },
        options: buildOptionsFromServiceLines(h),
        extensions: {
            suggestedEsteiraTitle: h.suggestedEsteiraTitle,
            suggestedEsteiraDescription: h.suggestedEsteiraDescription,
            serviceLineCount: h.serviceLines.length,
            pipeline: {
                extractSource: extract.source,
                interpretationVersion: 'heuristic_br_os_v1',
                documentLineClassifier: 'document_line_semantic_v2',
            },
        },
    };
    let status = 'completed';
    if (textEmpty || issues.filter((i) => i.category === 'missing_field').length >= 3)
        status = 'partial';
    return {
        requestId,
        correlationId,
        status,
        specialist: 'sgp_argos_local_heuristic_v1',
        strategy: 'local_heuristic_pipeline_v1',
        document: {
            fileName,
            mimeType,
            pageCount: extract.pageCount,
            contentSha256: sha256(fileBuffer),
        },
        extractedFacts,
        draft,
        warnings: issues,
        confidence: {
            overall: Math.round(overall * 1000) / 1000,
            byField: Object.keys(byField).length ? byField : undefined,
        },
    };
}
//# sourceMappingURL=buildDocumentDraftResult.js.map