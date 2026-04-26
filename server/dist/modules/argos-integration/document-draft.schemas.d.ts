import { z } from 'zod';
/** Alinhado a `src/domain/argos/intent.ts` — manter sincronizado. */
export declare const ARGOS_INTENT_CONVEYOR_DRAFT_FROM_DOCUMENT: "conveyor_draft_from_document";
export declare const conveyorDraftV1StepSchema: z.ZodObject<{
    orderIndex: z.ZodNumber;
    title: z.ZodString;
    plannedMinutes: z.ZodOptional<z.ZodNumber>;
    confidence: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    orderIndex: number;
    title: string;
    plannedMinutes?: number | undefined;
    confidence?: number | undefined;
}, {
    orderIndex: number;
    title: string;
    plannedMinutes?: number | undefined;
    confidence?: number | undefined;
}>;
export declare const conveyorDraftV1AreaSchema: z.ZodObject<{
    orderIndex: z.ZodNumber;
    title: z.ZodString;
    steps: z.ZodArray<z.ZodObject<{
        orderIndex: z.ZodNumber;
        title: z.ZodString;
        plannedMinutes: z.ZodOptional<z.ZodNumber>;
        confidence: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        orderIndex: number;
        title: string;
        plannedMinutes?: number | undefined;
        confidence?: number | undefined;
    }, {
        orderIndex: number;
        title: string;
        plannedMinutes?: number | undefined;
        confidence?: number | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    orderIndex: number;
    title: string;
    steps: {
        orderIndex: number;
        title: string;
        plannedMinutes?: number | undefined;
        confidence?: number | undefined;
    }[];
}, {
    orderIndex: number;
    title: string;
    steps: {
        orderIndex: number;
        title: string;
        plannedMinutes?: number | undefined;
        confidence?: number | undefined;
    }[];
}>;
export declare const conveyorDraftV1OptionSchema: z.ZodObject<{
    orderIndex: z.ZodNumber;
    title: z.ZodString;
    areas: z.ZodArray<z.ZodObject<{
        orderIndex: z.ZodNumber;
        title: z.ZodString;
        steps: z.ZodArray<z.ZodObject<{
            orderIndex: z.ZodNumber;
            title: z.ZodString;
            plannedMinutes: z.ZodOptional<z.ZodNumber>;
            confidence: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            orderIndex: number;
            title: string;
            plannedMinutes?: number | undefined;
            confidence?: number | undefined;
        }, {
            orderIndex: number;
            title: string;
            plannedMinutes?: number | undefined;
            confidence?: number | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        orderIndex: number;
        title: string;
        steps: {
            orderIndex: number;
            title: string;
            plannedMinutes?: number | undefined;
            confidence?: number | undefined;
        }[];
    }, {
        orderIndex: number;
        title: string;
        steps: {
            orderIndex: number;
            title: string;
            plannedMinutes?: number | undefined;
            confidence?: number | undefined;
        }[];
    }>, "many">;
}, "strip", z.ZodTypeAny, {
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
}, {
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
}>;
/** Versão fixa do draft v1 — alinhada a `src/domain/argos/draft-v1.types.ts`. */
export declare const CONVEYOR_DRAFT_SCHEMA_VERSION_V1: "1.0.0";
export declare const conveyorDraftV1Schema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<"1.0.0">;
    suggestedDados: z.ZodObject<{
        title: z.ZodOptional<z.ZodString>;
        clientName: z.ZodOptional<z.ZodString>;
        vehicleDescription: z.ZodOptional<z.ZodString>;
        modelVersion: z.ZodOptional<z.ZodString>;
        licensePlate: z.ZodOptional<z.ZodString>;
        notes: z.ZodOptional<z.ZodString>;
        suggestedResponsibleCollaboratorId: z.ZodOptional<z.ZodString>;
        estimatedDeadline: z.ZodOptional<z.ZodString>;
        priorityHint: z.ZodOptional<z.ZodEnum<["alta", "media", "baixa"]>>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        title: z.ZodOptional<z.ZodString>;
        clientName: z.ZodOptional<z.ZodString>;
        vehicleDescription: z.ZodOptional<z.ZodString>;
        modelVersion: z.ZodOptional<z.ZodString>;
        licensePlate: z.ZodOptional<z.ZodString>;
        notes: z.ZodOptional<z.ZodString>;
        suggestedResponsibleCollaboratorId: z.ZodOptional<z.ZodString>;
        estimatedDeadline: z.ZodOptional<z.ZodString>;
        priorityHint: z.ZodOptional<z.ZodEnum<["alta", "media", "baixa"]>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        title: z.ZodOptional<z.ZodString>;
        clientName: z.ZodOptional<z.ZodString>;
        vehicleDescription: z.ZodOptional<z.ZodString>;
        modelVersion: z.ZodOptional<z.ZodString>;
        licensePlate: z.ZodOptional<z.ZodString>;
        notes: z.ZodOptional<z.ZodString>;
        suggestedResponsibleCollaboratorId: z.ZodOptional<z.ZodString>;
        estimatedDeadline: z.ZodOptional<z.ZodString>;
        priorityHint: z.ZodOptional<z.ZodEnum<["alta", "media", "baixa"]>>;
    }, z.ZodTypeAny, "passthrough">>;
    options: z.ZodArray<z.ZodObject<{
        orderIndex: z.ZodNumber;
        title: z.ZodString;
        areas: z.ZodArray<z.ZodObject<{
            orderIndex: z.ZodNumber;
            title: z.ZodString;
            steps: z.ZodArray<z.ZodObject<{
                orderIndex: z.ZodNumber;
                title: z.ZodString;
                plannedMinutes: z.ZodOptional<z.ZodNumber>;
                confidence: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                orderIndex: number;
                title: string;
                plannedMinutes?: number | undefined;
                confidence?: number | undefined;
            }, {
                orderIndex: number;
                title: string;
                plannedMinutes?: number | undefined;
                confidence?: number | undefined;
            }>, "many">;
        }, "strip", z.ZodTypeAny, {
            orderIndex: number;
            title: string;
            steps: {
                orderIndex: number;
                title: string;
                plannedMinutes?: number | undefined;
                confidence?: number | undefined;
            }[];
        }, {
            orderIndex: number;
            title: string;
            steps: {
                orderIndex: number;
                title: string;
                plannedMinutes?: number | undefined;
                confidence?: number | undefined;
            }[];
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
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
    }, {
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
    }>, "many">;
    extensions: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
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
}, {
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
}>;
export declare const argosDocumentIngestEnvelopeSchema: z.ZodObject<{
    caller: z.ZodObject<{
        systemId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        systemId: string;
    }, {
        systemId: string;
    }>;
    policy: z.ZodObject<{
        maxFileBytes: z.ZodOptional<z.ZodNumber>;
        allowedMimeTypes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        maxFileBytes: z.ZodOptional<z.ZodNumber>;
        allowedMimeTypes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        maxFileBytes: z.ZodOptional<z.ZodNumber>;
        allowedMimeTypes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, z.ZodTypeAny, "passthrough">>;
    intent: z.ZodLiteral<"conveyor_draft_from_document">;
    metadata: z.ZodOptional<z.ZodObject<{
        correlationId: z.ZodOptional<z.ZodString>;
        locale: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        correlationId: z.ZodOptional<z.ZodString>;
        locale: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        correlationId: z.ZodOptional<z.ZodString>;
        locale: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>>;
}, "strip", z.ZodTypeAny, {
    caller: {
        systemId: string;
    };
    policy: {
        maxFileBytes?: number | undefined;
        allowedMimeTypes?: string[] | undefined;
    } & {
        [k: string]: unknown;
    };
    intent: "conveyor_draft_from_document";
    metadata?: z.objectOutputType<{
        correlationId: z.ZodOptional<z.ZodString>;
        locale: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough"> | undefined;
}, {
    caller: {
        systemId: string;
    };
    policy: {
        maxFileBytes?: number | undefined;
        allowedMimeTypes?: string[] | undefined;
    } & {
        [k: string]: unknown;
    };
    intent: "conveyor_draft_from_document";
    metadata?: z.objectInputType<{
        correlationId: z.ZodOptional<z.ZodString>;
        locale: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough"> | undefined;
}>;
export declare const argosIssueSchema: z.ZodObject<{
    category: z.ZodEnum<["fatal_error", "revisable_warning", "missing_field", "low_confidence_field"]>;
    code: z.ZodString;
    message: z.ZodOptional<z.ZodString>;
    fieldPath: z.ZodOptional<z.ZodString>;
    confidence: z.ZodOptional<z.ZodNumber>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    category: z.ZodEnum<["fatal_error", "revisable_warning", "missing_field", "low_confidence_field"]>;
    code: z.ZodString;
    message: z.ZodOptional<z.ZodString>;
    fieldPath: z.ZodOptional<z.ZodString>;
    confidence: z.ZodOptional<z.ZodNumber>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    category: z.ZodEnum<["fatal_error", "revisable_warning", "missing_field", "low_confidence_field"]>;
    code: z.ZodString;
    message: z.ZodOptional<z.ZodString>;
    fieldPath: z.ZodOptional<z.ZodString>;
    confidence: z.ZodOptional<z.ZodNumber>;
}, z.ZodTypeAny, "passthrough">>;
export declare const argosDocumentDescriptorSchema: z.ZodObject<{
    fileName: z.ZodOptional<z.ZodString>;
    mimeType: z.ZodOptional<z.ZodString>;
    pageCount: z.ZodOptional<z.ZodNumber>;
    contentSha256: z.ZodOptional<z.ZodString>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    fileName: z.ZodOptional<z.ZodString>;
    mimeType: z.ZodOptional<z.ZodString>;
    pageCount: z.ZodOptional<z.ZodNumber>;
    contentSha256: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    fileName: z.ZodOptional<z.ZodString>;
    mimeType: z.ZodOptional<z.ZodString>;
    pageCount: z.ZodOptional<z.ZodNumber>;
    contentSha256: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">>;
export declare const argosExtractedFactSchema: z.ZodObject<{
    key: z.ZodString;
    value: z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull]>;
    confidence: z.ZodOptional<z.ZodNumber>;
    sourcePage: z.ZodOptional<z.ZodNumber>;
    sourceSnippet: z.ZodOptional<z.ZodString>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    key: z.ZodString;
    value: z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull]>;
    confidence: z.ZodOptional<z.ZodNumber>;
    sourcePage: z.ZodOptional<z.ZodNumber>;
    sourceSnippet: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    key: z.ZodString;
    value: z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull]>;
    confidence: z.ZodOptional<z.ZodNumber>;
    sourcePage: z.ZodOptional<z.ZodNumber>;
    sourceSnippet: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">>;
export declare const argosConfidenceSummarySchema: z.ZodObject<{
    overall: z.ZodNumber;
    byField: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    overall: z.ZodNumber;
    byField: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    overall: z.ZodNumber;
    byField: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
}, z.ZodTypeAny, "passthrough">>;
export declare const argosDocumentIngestResultSchema: z.ZodObject<{
    requestId: z.ZodString;
    correlationId: z.ZodString;
    status: z.ZodEnum<["completed", "partial", "failed"]>;
    specialist: z.ZodString;
    strategy: z.ZodString;
    document: z.ZodObject<{
        fileName: z.ZodOptional<z.ZodString>;
        mimeType: z.ZodOptional<z.ZodString>;
        pageCount: z.ZodOptional<z.ZodNumber>;
        contentSha256: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        fileName: z.ZodOptional<z.ZodString>;
        mimeType: z.ZodOptional<z.ZodString>;
        pageCount: z.ZodOptional<z.ZodNumber>;
        contentSha256: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        fileName: z.ZodOptional<z.ZodString>;
        mimeType: z.ZodOptional<z.ZodString>;
        pageCount: z.ZodOptional<z.ZodNumber>;
        contentSha256: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>;
    extractedFacts: z.ZodArray<z.ZodObject<{
        key: z.ZodString;
        value: z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull]>;
        confidence: z.ZodOptional<z.ZodNumber>;
        sourcePage: z.ZodOptional<z.ZodNumber>;
        sourceSnippet: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        key: z.ZodString;
        value: z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull]>;
        confidence: z.ZodOptional<z.ZodNumber>;
        sourcePage: z.ZodOptional<z.ZodNumber>;
        sourceSnippet: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        key: z.ZodString;
        value: z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull]>;
        confidence: z.ZodOptional<z.ZodNumber>;
        sourcePage: z.ZodOptional<z.ZodNumber>;
        sourceSnippet: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    draft: z.ZodNullable<z.ZodObject<{
        schemaVersion: z.ZodLiteral<"1.0.0">;
        suggestedDados: z.ZodObject<{
            title: z.ZodOptional<z.ZodString>;
            clientName: z.ZodOptional<z.ZodString>;
            vehicleDescription: z.ZodOptional<z.ZodString>;
            modelVersion: z.ZodOptional<z.ZodString>;
            licensePlate: z.ZodOptional<z.ZodString>;
            notes: z.ZodOptional<z.ZodString>;
            suggestedResponsibleCollaboratorId: z.ZodOptional<z.ZodString>;
            estimatedDeadline: z.ZodOptional<z.ZodString>;
            priorityHint: z.ZodOptional<z.ZodEnum<["alta", "media", "baixa"]>>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            title: z.ZodOptional<z.ZodString>;
            clientName: z.ZodOptional<z.ZodString>;
            vehicleDescription: z.ZodOptional<z.ZodString>;
            modelVersion: z.ZodOptional<z.ZodString>;
            licensePlate: z.ZodOptional<z.ZodString>;
            notes: z.ZodOptional<z.ZodString>;
            suggestedResponsibleCollaboratorId: z.ZodOptional<z.ZodString>;
            estimatedDeadline: z.ZodOptional<z.ZodString>;
            priorityHint: z.ZodOptional<z.ZodEnum<["alta", "media", "baixa"]>>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            title: z.ZodOptional<z.ZodString>;
            clientName: z.ZodOptional<z.ZodString>;
            vehicleDescription: z.ZodOptional<z.ZodString>;
            modelVersion: z.ZodOptional<z.ZodString>;
            licensePlate: z.ZodOptional<z.ZodString>;
            notes: z.ZodOptional<z.ZodString>;
            suggestedResponsibleCollaboratorId: z.ZodOptional<z.ZodString>;
            estimatedDeadline: z.ZodOptional<z.ZodString>;
            priorityHint: z.ZodOptional<z.ZodEnum<["alta", "media", "baixa"]>>;
        }, z.ZodTypeAny, "passthrough">>;
        options: z.ZodArray<z.ZodObject<{
            orderIndex: z.ZodNumber;
            title: z.ZodString;
            areas: z.ZodArray<z.ZodObject<{
                orderIndex: z.ZodNumber;
                title: z.ZodString;
                steps: z.ZodArray<z.ZodObject<{
                    orderIndex: z.ZodNumber;
                    title: z.ZodString;
                    plannedMinutes: z.ZodOptional<z.ZodNumber>;
                    confidence: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    orderIndex: number;
                    title: string;
                    plannedMinutes?: number | undefined;
                    confidence?: number | undefined;
                }, {
                    orderIndex: number;
                    title: string;
                    plannedMinutes?: number | undefined;
                    confidence?: number | undefined;
                }>, "many">;
            }, "strip", z.ZodTypeAny, {
                orderIndex: number;
                title: string;
                steps: {
                    orderIndex: number;
                    title: string;
                    plannedMinutes?: number | undefined;
                    confidence?: number | undefined;
                }[];
            }, {
                orderIndex: number;
                title: string;
                steps: {
                    orderIndex: number;
                    title: string;
                    plannedMinutes?: number | undefined;
                    confidence?: number | undefined;
                }[];
            }>, "many">;
        }, "strip", z.ZodTypeAny, {
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
        }, {
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
        }>, "many">;
        extensions: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
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
    }, {
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
    }>>;
    warnings: z.ZodArray<z.ZodObject<{
        category: z.ZodEnum<["fatal_error", "revisable_warning", "missing_field", "low_confidence_field"]>;
        code: z.ZodString;
        message: z.ZodOptional<z.ZodString>;
        fieldPath: z.ZodOptional<z.ZodString>;
        confidence: z.ZodOptional<z.ZodNumber>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        category: z.ZodEnum<["fatal_error", "revisable_warning", "missing_field", "low_confidence_field"]>;
        code: z.ZodString;
        message: z.ZodOptional<z.ZodString>;
        fieldPath: z.ZodOptional<z.ZodString>;
        confidence: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        category: z.ZodEnum<["fatal_error", "revisable_warning", "missing_field", "low_confidence_field"]>;
        code: z.ZodString;
        message: z.ZodOptional<z.ZodString>;
        fieldPath: z.ZodOptional<z.ZodString>;
        confidence: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
    confidence: z.ZodNullable<z.ZodObject<{
        overall: z.ZodNumber;
        byField: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        overall: z.ZodNumber;
        byField: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        overall: z.ZodNumber;
        byField: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
    }, z.ZodTypeAny, "passthrough">>>;
}, "strip", z.ZodTypeAny, {
    status: "completed" | "partial" | "failed";
    confidence: z.objectOutputType<{
        overall: z.ZodNumber;
        byField: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
    }, z.ZodTypeAny, "passthrough"> | null;
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
    extractedFacts: z.objectOutputType<{
        key: z.ZodString;
        value: z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull]>;
        confidence: z.ZodOptional<z.ZodNumber>;
        sourcePage: z.ZodOptional<z.ZodNumber>;
        sourceSnippet: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">[];
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
    warnings: z.objectOutputType<{
        category: z.ZodEnum<["fatal_error", "revisable_warning", "missing_field", "low_confidence_field"]>;
        code: z.ZodString;
        message: z.ZodOptional<z.ZodString>;
        fieldPath: z.ZodOptional<z.ZodString>;
        confidence: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">[];
}, {
    status: "completed" | "partial" | "failed";
    confidence: z.objectInputType<{
        overall: z.ZodNumber;
        byField: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
    }, z.ZodTypeAny, "passthrough"> | null;
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
    extractedFacts: z.objectInputType<{
        key: z.ZodString;
        value: z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull]>;
        confidence: z.ZodOptional<z.ZodNumber>;
        sourcePage: z.ZodOptional<z.ZodNumber>;
        sourceSnippet: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">[];
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
    warnings: z.objectInputType<{
        category: z.ZodEnum<["fatal_error", "revisable_warning", "missing_field", "low_confidence_field"]>;
        code: z.ZodString;
        message: z.ZodOptional<z.ZodString>;
        fieldPath: z.ZodOptional<z.ZodString>;
        confidence: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">[];
}>;
export type ArgosDocumentIngestEnvelope = z.infer<typeof argosDocumentIngestEnvelopeSchema>;
export type ArgosDocumentIngestResult = z.infer<typeof argosDocumentIngestResultSchema>;
//# sourceMappingURL=document-draft.schemas.d.ts.map