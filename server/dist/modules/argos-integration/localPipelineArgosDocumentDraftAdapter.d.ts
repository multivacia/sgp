import type { ArgosDocumentDraftIngestInput, ArgosDocumentDraftPort } from './argosDocumentDraftPort.js';
/**
 * Pipeline documental em processo — extrator → intérprete heurístico → draft v1.
 * Não persiste estado; não acopla UI SGP+.
 */
export declare class LocalPipelineArgosDocumentDraftAdapter implements ArgosDocumentDraftPort {
    readonly documentDraftExecutionMode: "local";
    ingest(input: ArgosDocumentDraftIngestInput): Promise<{
        status: "completed" | "partial" | "failed";
        confidence: import("zod").objectOutputType<{
            overall: import("zod").ZodNumber;
            byField: import("zod").ZodOptional<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodNumber>>;
        }, import("zod").ZodTypeAny, "passthrough"> | null;
        correlationId: string;
        requestId: string;
        specialist: string;
        strategy: string;
        document: {
            fileName?: string | undefined;
            mimeType?: string | undefined;
            pageCount?: number | undefined;
            contentSha256?: string | undefined;
        } & {
            [k: string]: unknown;
        };
        extractedFacts: import("zod").objectOutputType<{
            key: import("zod").ZodString;
            value: import("zod").ZodUnion<[import("zod").ZodString, import("zod").ZodNumber, import("zod").ZodBoolean, import("zod").ZodNull]>;
            confidence: import("zod").ZodOptional<import("zod").ZodNumber>;
            sourcePage: import("zod").ZodOptional<import("zod").ZodNumber>;
            sourceSnippet: import("zod").ZodOptional<import("zod").ZodString>;
        }, import("zod").ZodTypeAny, "passthrough">[];
        draft: {
            options: {
                orderIndex: number;
                title: string;
                areas: {
                    orderIndex: number;
                    title: string;
                    steps: {
                        orderIndex: number;
                        title: string;
                        plannedMinutes?: number | undefined;
                        confidence?: number | undefined;
                    }[];
                }[];
            }[];
            schemaVersion: "1.0.0";
            suggestedDados: {
                notes?: string | undefined;
                estimatedDeadline?: string | undefined;
                title?: string | undefined;
                clientName?: string | undefined;
                vehicleDescription?: string | undefined;
                modelVersion?: string | undefined;
                licensePlate?: string | undefined;
                suggestedResponsibleCollaboratorId?: string | undefined;
                priorityHint?: "alta" | "media" | "baixa" | undefined;
            } & {
                [k: string]: unknown;
            };
            extensions?: Record<string, unknown> | undefined;
        } | null;
        warnings: import("zod").objectOutputType<{
            category: import("zod").ZodEnum<["fatal_error", "revisable_warning", "missing_field", "low_confidence_field"]>;
            code: import("zod").ZodString;
            message: import("zod").ZodOptional<import("zod").ZodString>;
            fieldPath: import("zod").ZodOptional<import("zod").ZodString>;
            confidence: import("zod").ZodOptional<import("zod").ZodNumber>;
        }, import("zod").ZodTypeAny, "passthrough">[];
    }>;
}
//# sourceMappingURL=localPipelineArgosDocumentDraftAdapter.d.ts.map