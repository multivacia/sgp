import { z } from 'zod';
/** Alinhado a `NovaEsteiraNoOrigem` — minúsculas no JSON e na BD. */
export declare const sourceOriginNodeSchema: z.ZodEnum<["manual", "reaproveitada", "base"]>;
export declare const postConveyorStepAssigneeSchema: z.ZodEffects<z.ZodObject<{
    /** Retrocompat: ausente => COLLABORATOR. */
    type: z.ZodOptional<z.ZodEnum<["COLLABORATOR", "TEAM"]>>;
    collaboratorId: z.ZodOptional<z.ZodString>;
    teamId: z.ZodOptional<z.ZodString>;
    isPrimary: z.ZodBoolean;
    assignmentOrigin: z.ZodOptional<z.ZodEnum<["manual", "base", "reaproveitada"]>>;
    orderIndex: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    isPrimary: boolean;
    type?: "COLLABORATOR" | "TEAM" | undefined;
    collaboratorId?: string | undefined;
    teamId?: string | undefined;
    assignmentOrigin?: "manual" | "base" | "reaproveitada" | undefined;
    orderIndex?: number | undefined;
}, {
    isPrimary: boolean;
    type?: "COLLABORATOR" | "TEAM" | undefined;
    collaboratorId?: string | undefined;
    teamId?: string | undefined;
    assignmentOrigin?: "manual" | "base" | "reaproveitada" | undefined;
    orderIndex?: number | undefined;
}>, {
    isPrimary: boolean;
    type?: "COLLABORATOR" | "TEAM" | undefined;
    collaboratorId?: string | undefined;
    teamId?: string | undefined;
    assignmentOrigin?: "manual" | "base" | "reaproveitada" | undefined;
    orderIndex?: number | undefined;
}, {
    isPrimary: boolean;
    type?: "COLLABORATOR" | "TEAM" | undefined;
    collaboratorId?: string | undefined;
    teamId?: string | undefined;
    assignmentOrigin?: "manual" | "base" | "reaproveitada" | undefined;
    orderIndex?: number | undefined;
}>;
export declare const postConveyorStepSchema: z.ZodEffects<z.ZodObject<{
    titulo: z.ZodString;
    orderIndex: z.ZodNumber;
    plannedMinutes: z.ZodNumber;
    sourceOrigin: z.ZodEnum<["manual", "reaproveitada", "base"]>;
    required: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    assignees: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodObject<{
        /** Retrocompat: ausente => COLLABORATOR. */
        type: z.ZodOptional<z.ZodEnum<["COLLABORATOR", "TEAM"]>>;
        collaboratorId: z.ZodOptional<z.ZodString>;
        teamId: z.ZodOptional<z.ZodString>;
        isPrimary: z.ZodBoolean;
        assignmentOrigin: z.ZodOptional<z.ZodEnum<["manual", "base", "reaproveitada"]>>;
        orderIndex: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        isPrimary: boolean;
        type?: "COLLABORATOR" | "TEAM" | undefined;
        collaboratorId?: string | undefined;
        teamId?: string | undefined;
        assignmentOrigin?: "manual" | "base" | "reaproveitada" | undefined;
        orderIndex?: number | undefined;
    }, {
        isPrimary: boolean;
        type?: "COLLABORATOR" | "TEAM" | undefined;
        collaboratorId?: string | undefined;
        teamId?: string | undefined;
        assignmentOrigin?: "manual" | "base" | "reaproveitada" | undefined;
        orderIndex?: number | undefined;
    }>, {
        isPrimary: boolean;
        type?: "COLLABORATOR" | "TEAM" | undefined;
        collaboratorId?: string | undefined;
        teamId?: string | undefined;
        assignmentOrigin?: "manual" | "base" | "reaproveitada" | undefined;
        orderIndex?: number | undefined;
    }, {
        isPrimary: boolean;
        type?: "COLLABORATOR" | "TEAM" | undefined;
        collaboratorId?: string | undefined;
        teamId?: string | undefined;
        assignmentOrigin?: "manual" | "base" | "reaproveitada" | undefined;
        orderIndex?: number | undefined;
    }>, "many">>>;
}, "strip", z.ZodTypeAny, {
    assignees: {
        isPrimary: boolean;
        type?: "COLLABORATOR" | "TEAM" | undefined;
        collaboratorId?: string | undefined;
        teamId?: string | undefined;
        assignmentOrigin?: "manual" | "base" | "reaproveitada" | undefined;
        orderIndex?: number | undefined;
    }[];
    orderIndex: number;
    plannedMinutes: number;
    titulo: string;
    sourceOrigin: "manual" | "base" | "reaproveitada";
    required: boolean;
}, {
    orderIndex: number;
    plannedMinutes: number;
    titulo: string;
    sourceOrigin: "manual" | "base" | "reaproveitada";
    assignees?: {
        isPrimary: boolean;
        type?: "COLLABORATOR" | "TEAM" | undefined;
        collaboratorId?: string | undefined;
        teamId?: string | undefined;
        assignmentOrigin?: "manual" | "base" | "reaproveitada" | undefined;
        orderIndex?: number | undefined;
    }[] | undefined;
    required?: boolean | undefined;
}>, {
    assignees: {
        isPrimary: boolean;
        type?: "COLLABORATOR" | "TEAM" | undefined;
        collaboratorId?: string | undefined;
        teamId?: string | undefined;
        assignmentOrigin?: "manual" | "base" | "reaproveitada" | undefined;
        orderIndex?: number | undefined;
    }[];
    orderIndex: number;
    plannedMinutes: number;
    titulo: string;
    sourceOrigin: "manual" | "base" | "reaproveitada";
    required: boolean;
}, {
    orderIndex: number;
    plannedMinutes: number;
    titulo: string;
    sourceOrigin: "manual" | "base" | "reaproveitada";
    assignees?: {
        isPrimary: boolean;
        type?: "COLLABORATOR" | "TEAM" | undefined;
        collaboratorId?: string | undefined;
        teamId?: string | undefined;
        assignmentOrigin?: "manual" | "base" | "reaproveitada" | undefined;
        orderIndex?: number | undefined;
    }[] | undefined;
    required?: boolean | undefined;
}>;
export declare const postConveyorAreaSchema: z.ZodObject<{
    titulo: z.ZodString;
    orderIndex: z.ZodNumber;
    sourceOrigin: z.ZodEnum<["manual", "reaproveitada", "base"]>;
    steps: z.ZodArray<z.ZodEffects<z.ZodObject<{
        titulo: z.ZodString;
        orderIndex: z.ZodNumber;
        plannedMinutes: z.ZodNumber;
        sourceOrigin: z.ZodEnum<["manual", "reaproveitada", "base"]>;
        required: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        assignees: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodObject<{
            /** Retrocompat: ausente => COLLABORATOR. */
            type: z.ZodOptional<z.ZodEnum<["COLLABORATOR", "TEAM"]>>;
            collaboratorId: z.ZodOptional<z.ZodString>;
            teamId: z.ZodOptional<z.ZodString>;
            isPrimary: z.ZodBoolean;
            assignmentOrigin: z.ZodOptional<z.ZodEnum<["manual", "base", "reaproveitada"]>>;
            orderIndex: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            isPrimary: boolean;
            type?: "COLLABORATOR" | "TEAM" | undefined;
            collaboratorId?: string | undefined;
            teamId?: string | undefined;
            assignmentOrigin?: "manual" | "base" | "reaproveitada" | undefined;
            orderIndex?: number | undefined;
        }, {
            isPrimary: boolean;
            type?: "COLLABORATOR" | "TEAM" | undefined;
            collaboratorId?: string | undefined;
            teamId?: string | undefined;
            assignmentOrigin?: "manual" | "base" | "reaproveitada" | undefined;
            orderIndex?: number | undefined;
        }>, {
            isPrimary: boolean;
            type?: "COLLABORATOR" | "TEAM" | undefined;
            collaboratorId?: string | undefined;
            teamId?: string | undefined;
            assignmentOrigin?: "manual" | "base" | "reaproveitada" | undefined;
            orderIndex?: number | undefined;
        }, {
            isPrimary: boolean;
            type?: "COLLABORATOR" | "TEAM" | undefined;
            collaboratorId?: string | undefined;
            teamId?: string | undefined;
            assignmentOrigin?: "manual" | "base" | "reaproveitada" | undefined;
            orderIndex?: number | undefined;
        }>, "many">>>;
    }, "strip", z.ZodTypeAny, {
        assignees: {
            isPrimary: boolean;
            type?: "COLLABORATOR" | "TEAM" | undefined;
            collaboratorId?: string | undefined;
            teamId?: string | undefined;
            assignmentOrigin?: "manual" | "base" | "reaproveitada" | undefined;
            orderIndex?: number | undefined;
        }[];
        orderIndex: number;
        plannedMinutes: number;
        titulo: string;
        sourceOrigin: "manual" | "base" | "reaproveitada";
        required: boolean;
    }, {
        orderIndex: number;
        plannedMinutes: number;
        titulo: string;
        sourceOrigin: "manual" | "base" | "reaproveitada";
        assignees?: {
            isPrimary: boolean;
            type?: "COLLABORATOR" | "TEAM" | undefined;
            collaboratorId?: string | undefined;
            teamId?: string | undefined;
            assignmentOrigin?: "manual" | "base" | "reaproveitada" | undefined;
            orderIndex?: number | undefined;
        }[] | undefined;
        required?: boolean | undefined;
    }>, {
        assignees: {
            isPrimary: boolean;
            type?: "COLLABORATOR" | "TEAM" | undefined;
            collaboratorId?: string | undefined;
            teamId?: string | undefined;
            assignmentOrigin?: "manual" | "base" | "reaproveitada" | undefined;
            orderIndex?: number | undefined;
        }[];
        orderIndex: number;
        plannedMinutes: number;
        titulo: string;
        sourceOrigin: "manual" | "base" | "reaproveitada";
        required: boolean;
    }, {
        orderIndex: number;
        plannedMinutes: number;
        titulo: string;
        sourceOrigin: "manual" | "base" | "reaproveitada";
        assignees?: {
            isPrimary: boolean;
            type?: "COLLABORATOR" | "TEAM" | undefined;
            collaboratorId?: string | undefined;
            teamId?: string | undefined;
            assignmentOrigin?: "manual" | "base" | "reaproveitada" | undefined;
            orderIndex?: number | undefined;
        }[] | undefined;
        required?: boolean | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    orderIndex: number;
    steps: {
        assignees: {
            isPrimary: boolean;
            type?: "COLLABORATOR" | "TEAM" | undefined;
            collaboratorId?: string | undefined;
            teamId?: string | undefined;
            assignmentOrigin?: "manual" | "base" | "reaproveitada" | undefined;
            orderIndex?: number | undefined;
        }[];
        orderIndex: number;
        plannedMinutes: number;
        titulo: string;
        sourceOrigin: "manual" | "base" | "reaproveitada";
        required: boolean;
    }[];
    titulo: string;
    sourceOrigin: "manual" | "base" | "reaproveitada";
}, {
    orderIndex: number;
    steps: {
        orderIndex: number;
        plannedMinutes: number;
        titulo: string;
        sourceOrigin: "manual" | "base" | "reaproveitada";
        assignees?: {
            isPrimary: boolean;
            type?: "COLLABORATOR" | "TEAM" | undefined;
            collaboratorId?: string | undefined;
            teamId?: string | undefined;
            assignmentOrigin?: "manual" | "base" | "reaproveitada" | undefined;
            orderIndex?: number | undefined;
        }[] | undefined;
        required?: boolean | undefined;
    }[];
    titulo: string;
    sourceOrigin: "manual" | "base" | "reaproveitada";
}>;
export declare const postConveyorOptionSchema: z.ZodObject<{
    titulo: z.ZodString;
    orderIndex: z.ZodNumber;
    sourceOrigin: z.ZodEnum<["manual", "reaproveitada", "base"]>;
    areas: z.ZodArray<z.ZodObject<{
        titulo: z.ZodString;
        orderIndex: z.ZodNumber;
        sourceOrigin: z.ZodEnum<["manual", "reaproveitada", "base"]>;
        steps: z.ZodArray<z.ZodEffects<z.ZodObject<{
            titulo: z.ZodString;
            orderIndex: z.ZodNumber;
            plannedMinutes: z.ZodNumber;
            sourceOrigin: z.ZodEnum<["manual", "reaproveitada", "base"]>;
            required: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
            assignees: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodObject<{
                /** Retrocompat: ausente => COLLABORATOR. */
                type: z.ZodOptional<z.ZodEnum<["COLLABORATOR", "TEAM"]>>;
                collaboratorId: z.ZodOptional<z.ZodString>;
                teamId: z.ZodOptional<z.ZodString>;
                isPrimary: z.ZodBoolean;
                assignmentOrigin: z.ZodOptional<z.ZodEnum<["manual", "base", "reaproveitada"]>>;
                orderIndex: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                isPrimary: boolean;
                type?: "COLLABORATOR" | "TEAM" | undefined;
                collaboratorId?: string | undefined;
                teamId?: string | undefined;
                assignmentOrigin?: "manual" | "base" | "reaproveitada" | undefined;
                orderIndex?: number | undefined;
            }, {
                isPrimary: boolean;
                type?: "COLLABORATOR" | "TEAM" | undefined;
                collaboratorId?: string | undefined;
                teamId?: string | undefined;
                assignmentOrigin?: "manual" | "base" | "reaproveitada" | undefined;
                orderIndex?: number | undefined;
            }>, {
                isPrimary: boolean;
                type?: "COLLABORATOR" | "TEAM" | undefined;
                collaboratorId?: string | undefined;
                teamId?: string | undefined;
                assignmentOrigin?: "manual" | "base" | "reaproveitada" | undefined;
                orderIndex?: number | undefined;
            }, {
                isPrimary: boolean;
                type?: "COLLABORATOR" | "TEAM" | undefined;
                collaboratorId?: string | undefined;
                teamId?: string | undefined;
                assignmentOrigin?: "manual" | "base" | "reaproveitada" | undefined;
                orderIndex?: number | undefined;
            }>, "many">>>;
        }, "strip", z.ZodTypeAny, {
            assignees: {
                isPrimary: boolean;
                type?: "COLLABORATOR" | "TEAM" | undefined;
                collaboratorId?: string | undefined;
                teamId?: string | undefined;
                assignmentOrigin?: "manual" | "base" | "reaproveitada" | undefined;
                orderIndex?: number | undefined;
            }[];
            orderIndex: number;
            plannedMinutes: number;
            titulo: string;
            sourceOrigin: "manual" | "base" | "reaproveitada";
            required: boolean;
        }, {
            orderIndex: number;
            plannedMinutes: number;
            titulo: string;
            sourceOrigin: "manual" | "base" | "reaproveitada";
            assignees?: {
                isPrimary: boolean;
                type?: "COLLABORATOR" | "TEAM" | undefined;
                collaboratorId?: string | undefined;
                teamId?: string | undefined;
                assignmentOrigin?: "manual" | "base" | "reaproveitada" | undefined;
                orderIndex?: number | undefined;
            }[] | undefined;
            required?: boolean | undefined;
        }>, {
            assignees: {
                isPrimary: boolean;
                type?: "COLLABORATOR" | "TEAM" | undefined;
                collaboratorId?: string | undefined;
                teamId?: string | undefined;
                assignmentOrigin?: "manual" | "base" | "reaproveitada" | undefined;
                orderIndex?: number | undefined;
            }[];
            orderIndex: number;
            plannedMinutes: number;
            titulo: string;
            sourceOrigin: "manual" | "base" | "reaproveitada";
            required: boolean;
        }, {
            orderIndex: number;
            plannedMinutes: number;
            titulo: string;
            sourceOrigin: "manual" | "base" | "reaproveitada";
            assignees?: {
                isPrimary: boolean;
                type?: "COLLABORATOR" | "TEAM" | undefined;
                collaboratorId?: string | undefined;
                teamId?: string | undefined;
                assignmentOrigin?: "manual" | "base" | "reaproveitada" | undefined;
                orderIndex?: number | undefined;
            }[] | undefined;
            required?: boolean | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        orderIndex: number;
        steps: {
            assignees: {
                isPrimary: boolean;
                type?: "COLLABORATOR" | "TEAM" | undefined;
                collaboratorId?: string | undefined;
                teamId?: string | undefined;
                assignmentOrigin?: "manual" | "base" | "reaproveitada" | undefined;
                orderIndex?: number | undefined;
            }[];
            orderIndex: number;
            plannedMinutes: number;
            titulo: string;
            sourceOrigin: "manual" | "base" | "reaproveitada";
            required: boolean;
        }[];
        titulo: string;
        sourceOrigin: "manual" | "base" | "reaproveitada";
    }, {
        orderIndex: number;
        steps: {
            orderIndex: number;
            plannedMinutes: number;
            titulo: string;
            sourceOrigin: "manual" | "base" | "reaproveitada";
            assignees?: {
                isPrimary: boolean;
                type?: "COLLABORATOR" | "TEAM" | undefined;
                collaboratorId?: string | undefined;
                teamId?: string | undefined;
                assignmentOrigin?: "manual" | "base" | "reaproveitada" | undefined;
                orderIndex?: number | undefined;
            }[] | undefined;
            required?: boolean | undefined;
        }[];
        titulo: string;
        sourceOrigin: "manual" | "base" | "reaproveitada";
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    orderIndex: number;
    areas: {
        orderIndex: number;
        steps: {
            assignees: {
                isPrimary: boolean;
                type?: "COLLABORATOR" | "TEAM" | undefined;
                collaboratorId?: string | undefined;
                teamId?: string | undefined;
                assignmentOrigin?: "manual" | "base" | "reaproveitada" | undefined;
                orderIndex?: number | undefined;
            }[];
            orderIndex: number;
            plannedMinutes: number;
            titulo: string;
            sourceOrigin: "manual" | "base" | "reaproveitada";
            required: boolean;
        }[];
        titulo: string;
        sourceOrigin: "manual" | "base" | "reaproveitada";
    }[];
    titulo: string;
    sourceOrigin: "manual" | "base" | "reaproveitada";
}, {
    orderIndex: number;
    areas: {
        orderIndex: number;
        steps: {
            orderIndex: number;
            plannedMinutes: number;
            titulo: string;
            sourceOrigin: "manual" | "base" | "reaproveitada";
            assignees?: {
                isPrimary: boolean;
                type?: "COLLABORATOR" | "TEAM" | undefined;
                collaboratorId?: string | undefined;
                teamId?: string | undefined;
                assignmentOrigin?: "manual" | "base" | "reaproveitada" | undefined;
                orderIndex?: number | undefined;
            }[] | undefined;
            required?: boolean | undefined;
        }[];
        titulo: string;
        sourceOrigin: "manual" | "base" | "reaproveitada";
    }[];
    titulo: string;
    sourceOrigin: "manual" | "base" | "reaproveitada";
}>;
export declare const postConveyorDadosSchema: z.ZodObject<{
    nome: z.ZodString;
    cliente: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    veiculo: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    modeloVersao: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    placa: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    observacoes: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    responsavel: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    prazoEstimado: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    prioridade: z.ZodOptional<z.ZodUnion<[z.ZodEnum<["alta", "media", "baixa"]>, z.ZodLiteral<"">]>>;
    colaboradorId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    nome: string;
    cliente: string;
    veiculo: string;
    modeloVersao: string;
    placa: string;
    observacoes: string;
    responsavel: string;
    prazoEstimado: string;
    prioridade?: "" | "alta" | "media" | "baixa" | undefined;
    colaboradorId?: string | null | undefined;
}, {
    nome: string;
    cliente?: string | undefined;
    veiculo?: string | undefined;
    modeloVersao?: string | undefined;
    placa?: string | undefined;
    observacoes?: string | undefined;
    responsavel?: string | undefined;
    prazoEstimado?: string | undefined;
    prioridade?: "" | "alta" | "media" | "baixa" | undefined;
    colaboradorId?: string | null | undefined;
}>;
export declare const postConveyorBodySchema: z.ZodObject<{
    dados: z.ZodObject<{
        nome: z.ZodString;
        cliente: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        veiculo: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        modeloVersao: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        placa: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        observacoes: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        responsavel: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        prazoEstimado: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        prioridade: z.ZodOptional<z.ZodUnion<[z.ZodEnum<["alta", "media", "baixa"]>, z.ZodLiteral<"">]>>;
        colaboradorId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        nome: string;
        cliente: string;
        veiculo: string;
        modeloVersao: string;
        placa: string;
        observacoes: string;
        responsavel: string;
        prazoEstimado: string;
        prioridade?: "" | "alta" | "media" | "baixa" | undefined;
        colaboradorId?: string | null | undefined;
    }, {
        nome: string;
        cliente?: string | undefined;
        veiculo?: string | undefined;
        modeloVersao?: string | undefined;
        placa?: string | undefined;
        observacoes?: string | undefined;
        responsavel?: string | undefined;
        prazoEstimado?: string | undefined;
        prioridade?: "" | "alta" | "media" | "baixa" | undefined;
        colaboradorId?: string | null | undefined;
    }>;
    originType: z.ZodEnum<["MANUAL", "BASE", "HYBRID"]>;
    baseId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    baseCode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    baseName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    baseVersion: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    /** Item raiz da matriz operacional (auditoria / rastreio). */
    matrixRootItemId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    options: z.ZodArray<z.ZodObject<{
        titulo: z.ZodString;
        orderIndex: z.ZodNumber;
        sourceOrigin: z.ZodEnum<["manual", "reaproveitada", "base"]>;
        areas: z.ZodArray<z.ZodObject<{
            titulo: z.ZodString;
            orderIndex: z.ZodNumber;
            sourceOrigin: z.ZodEnum<["manual", "reaproveitada", "base"]>;
            steps: z.ZodArray<z.ZodEffects<z.ZodObject<{
                titulo: z.ZodString;
                orderIndex: z.ZodNumber;
                plannedMinutes: z.ZodNumber;
                sourceOrigin: z.ZodEnum<["manual", "reaproveitada", "base"]>;
                required: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
                assignees: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodObject<{
                    /** Retrocompat: ausente => COLLABORATOR. */
                    type: z.ZodOptional<z.ZodEnum<["COLLABORATOR", "TEAM"]>>;
                    collaboratorId: z.ZodOptional<z.ZodString>;
                    teamId: z.ZodOptional<z.ZodString>;
                    isPrimary: z.ZodBoolean;
                    assignmentOrigin: z.ZodOptional<z.ZodEnum<["manual", "base", "reaproveitada"]>>;
                    orderIndex: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    isPrimary: boolean;
                    type?: "COLLABORATOR" | "TEAM" | undefined;
                    collaboratorId?: string | undefined;
                    teamId?: string | undefined;
                    assignmentOrigin?: "manual" | "base" | "reaproveitada" | undefined;
                    orderIndex?: number | undefined;
                }, {
                    isPrimary: boolean;
                    type?: "COLLABORATOR" | "TEAM" | undefined;
                    collaboratorId?: string | undefined;
                    teamId?: string | undefined;
                    assignmentOrigin?: "manual" | "base" | "reaproveitada" | undefined;
                    orderIndex?: number | undefined;
                }>, {
                    isPrimary: boolean;
                    type?: "COLLABORATOR" | "TEAM" | undefined;
                    collaboratorId?: string | undefined;
                    teamId?: string | undefined;
                    assignmentOrigin?: "manual" | "base" | "reaproveitada" | undefined;
                    orderIndex?: number | undefined;
                }, {
                    isPrimary: boolean;
                    type?: "COLLABORATOR" | "TEAM" | undefined;
                    collaboratorId?: string | undefined;
                    teamId?: string | undefined;
                    assignmentOrigin?: "manual" | "base" | "reaproveitada" | undefined;
                    orderIndex?: number | undefined;
                }>, "many">>>;
            }, "strip", z.ZodTypeAny, {
                assignees: {
                    isPrimary: boolean;
                    type?: "COLLABORATOR" | "TEAM" | undefined;
                    collaboratorId?: string | undefined;
                    teamId?: string | undefined;
                    assignmentOrigin?: "manual" | "base" | "reaproveitada" | undefined;
                    orderIndex?: number | undefined;
                }[];
                orderIndex: number;
                plannedMinutes: number;
                titulo: string;
                sourceOrigin: "manual" | "base" | "reaproveitada";
                required: boolean;
            }, {
                orderIndex: number;
                plannedMinutes: number;
                titulo: string;
                sourceOrigin: "manual" | "base" | "reaproveitada";
                assignees?: {
                    isPrimary: boolean;
                    type?: "COLLABORATOR" | "TEAM" | undefined;
                    collaboratorId?: string | undefined;
                    teamId?: string | undefined;
                    assignmentOrigin?: "manual" | "base" | "reaproveitada" | undefined;
                    orderIndex?: number | undefined;
                }[] | undefined;
                required?: boolean | undefined;
            }>, {
                assignees: {
                    isPrimary: boolean;
                    type?: "COLLABORATOR" | "TEAM" | undefined;
                    collaboratorId?: string | undefined;
                    teamId?: string | undefined;
                    assignmentOrigin?: "manual" | "base" | "reaproveitada" | undefined;
                    orderIndex?: number | undefined;
                }[];
                orderIndex: number;
                plannedMinutes: number;
                titulo: string;
                sourceOrigin: "manual" | "base" | "reaproveitada";
                required: boolean;
            }, {
                orderIndex: number;
                plannedMinutes: number;
                titulo: string;
                sourceOrigin: "manual" | "base" | "reaproveitada";
                assignees?: {
                    isPrimary: boolean;
                    type?: "COLLABORATOR" | "TEAM" | undefined;
                    collaboratorId?: string | undefined;
                    teamId?: string | undefined;
                    assignmentOrigin?: "manual" | "base" | "reaproveitada" | undefined;
                    orderIndex?: number | undefined;
                }[] | undefined;
                required?: boolean | undefined;
            }>, "many">;
        }, "strip", z.ZodTypeAny, {
            orderIndex: number;
            steps: {
                assignees: {
                    isPrimary: boolean;
                    type?: "COLLABORATOR" | "TEAM" | undefined;
                    collaboratorId?: string | undefined;
                    teamId?: string | undefined;
                    assignmentOrigin?: "manual" | "base" | "reaproveitada" | undefined;
                    orderIndex?: number | undefined;
                }[];
                orderIndex: number;
                plannedMinutes: number;
                titulo: string;
                sourceOrigin: "manual" | "base" | "reaproveitada";
                required: boolean;
            }[];
            titulo: string;
            sourceOrigin: "manual" | "base" | "reaproveitada";
        }, {
            orderIndex: number;
            steps: {
                orderIndex: number;
                plannedMinutes: number;
                titulo: string;
                sourceOrigin: "manual" | "base" | "reaproveitada";
                assignees?: {
                    isPrimary: boolean;
                    type?: "COLLABORATOR" | "TEAM" | undefined;
                    collaboratorId?: string | undefined;
                    teamId?: string | undefined;
                    assignmentOrigin?: "manual" | "base" | "reaproveitada" | undefined;
                    orderIndex?: number | undefined;
                }[] | undefined;
                required?: boolean | undefined;
            }[];
            titulo: string;
            sourceOrigin: "manual" | "base" | "reaproveitada";
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        orderIndex: number;
        areas: {
            orderIndex: number;
            steps: {
                assignees: {
                    isPrimary: boolean;
                    type?: "COLLABORATOR" | "TEAM" | undefined;
                    collaboratorId?: string | undefined;
                    teamId?: string | undefined;
                    assignmentOrigin?: "manual" | "base" | "reaproveitada" | undefined;
                    orderIndex?: number | undefined;
                }[];
                orderIndex: number;
                plannedMinutes: number;
                titulo: string;
                sourceOrigin: "manual" | "base" | "reaproveitada";
                required: boolean;
            }[];
            titulo: string;
            sourceOrigin: "manual" | "base" | "reaproveitada";
        }[];
        titulo: string;
        sourceOrigin: "manual" | "base" | "reaproveitada";
    }, {
        orderIndex: number;
        areas: {
            orderIndex: number;
            steps: {
                orderIndex: number;
                plannedMinutes: number;
                titulo: string;
                sourceOrigin: "manual" | "base" | "reaproveitada";
                assignees?: {
                    isPrimary: boolean;
                    type?: "COLLABORATOR" | "TEAM" | undefined;
                    collaboratorId?: string | undefined;
                    teamId?: string | undefined;
                    assignmentOrigin?: "manual" | "base" | "reaproveitada" | undefined;
                    orderIndex?: number | undefined;
                }[] | undefined;
                required?: boolean | undefined;
            }[];
            titulo: string;
            sourceOrigin: "manual" | "base" | "reaproveitada";
        }[];
        titulo: string;
        sourceOrigin: "manual" | "base" | "reaproveitada";
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    options: {
        orderIndex: number;
        areas: {
            orderIndex: number;
            steps: {
                assignees: {
                    isPrimary: boolean;
                    type?: "COLLABORATOR" | "TEAM" | undefined;
                    collaboratorId?: string | undefined;
                    teamId?: string | undefined;
                    assignmentOrigin?: "manual" | "base" | "reaproveitada" | undefined;
                    orderIndex?: number | undefined;
                }[];
                orderIndex: number;
                plannedMinutes: number;
                titulo: string;
                sourceOrigin: "manual" | "base" | "reaproveitada";
                required: boolean;
            }[];
            titulo: string;
            sourceOrigin: "manual" | "base" | "reaproveitada";
        }[];
        titulo: string;
        sourceOrigin: "manual" | "base" | "reaproveitada";
    }[];
    dados: {
        nome: string;
        cliente: string;
        veiculo: string;
        modeloVersao: string;
        placa: string;
        observacoes: string;
        responsavel: string;
        prazoEstimado: string;
        prioridade?: "" | "alta" | "media" | "baixa" | undefined;
        colaboradorId?: string | null | undefined;
    };
    originType: "MANUAL" | "BASE" | "HYBRID";
    baseId?: string | null | undefined;
    baseCode?: string | null | undefined;
    baseName?: string | null | undefined;
    baseVersion?: number | null | undefined;
    matrixRootItemId?: string | null | undefined;
}, {
    options: {
        orderIndex: number;
        areas: {
            orderIndex: number;
            steps: {
                orderIndex: number;
                plannedMinutes: number;
                titulo: string;
                sourceOrigin: "manual" | "base" | "reaproveitada";
                assignees?: {
                    isPrimary: boolean;
                    type?: "COLLABORATOR" | "TEAM" | undefined;
                    collaboratorId?: string | undefined;
                    teamId?: string | undefined;
                    assignmentOrigin?: "manual" | "base" | "reaproveitada" | undefined;
                    orderIndex?: number | undefined;
                }[] | undefined;
                required?: boolean | undefined;
            }[];
            titulo: string;
            sourceOrigin: "manual" | "base" | "reaproveitada";
        }[];
        titulo: string;
        sourceOrigin: "manual" | "base" | "reaproveitada";
    }[];
    dados: {
        nome: string;
        cliente?: string | undefined;
        veiculo?: string | undefined;
        modeloVersao?: string | undefined;
        placa?: string | undefined;
        observacoes?: string | undefined;
        responsavel?: string | undefined;
        prazoEstimado?: string | undefined;
        prioridade?: "" | "alta" | "media" | "baixa" | undefined;
        colaboradorId?: string | null | undefined;
    };
    originType: "MANUAL" | "BASE" | "HYBRID";
    baseId?: string | null | undefined;
    baseCode?: string | null | undefined;
    baseName?: string | null | undefined;
    baseVersion?: number | null | undefined;
    matrixRootItemId?: string | null | undefined;
}>;
export type PostConveyorBody = z.infer<typeof postConveyorBodySchema>;
/** PATCH /api/v1/conveyors/:id — pelo menos um campo. */
export declare const patchConveyorDadosBodySchema: z.ZodEffects<z.ZodObject<{
    nome: z.ZodOptional<z.ZodString>;
    cliente: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodString>>>;
    veiculo: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodString>>>;
    modeloVersao: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodString>>>;
    placa: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodString>>>;
    observacoes: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodString>>>;
    responsavel: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodString>>>;
    prazoEstimado: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodString>>>;
    prioridade: z.ZodOptional<z.ZodOptional<z.ZodUnion<[z.ZodEnum<["alta", "media", "baixa"]>, z.ZodLiteral<"">]>>>;
    colaboradorId: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
}, "strip", z.ZodTypeAny, {
    nome?: string | undefined;
    cliente?: string | undefined;
    veiculo?: string | undefined;
    modeloVersao?: string | undefined;
    placa?: string | undefined;
    observacoes?: string | undefined;
    responsavel?: string | undefined;
    prazoEstimado?: string | undefined;
    prioridade?: "" | "alta" | "media" | "baixa" | undefined;
    colaboradorId?: string | null | undefined;
}, {
    nome?: string | undefined;
    cliente?: string | undefined;
    veiculo?: string | undefined;
    modeloVersao?: string | undefined;
    placa?: string | undefined;
    observacoes?: string | undefined;
    responsavel?: string | undefined;
    prazoEstimado?: string | undefined;
    prioridade?: "" | "alta" | "media" | "baixa" | undefined;
    colaboradorId?: string | null | undefined;
}>, {
    nome?: string | undefined;
    cliente?: string | undefined;
    veiculo?: string | undefined;
    modeloVersao?: string | undefined;
    placa?: string | undefined;
    observacoes?: string | undefined;
    responsavel?: string | undefined;
    prazoEstimado?: string | undefined;
    prioridade?: "" | "alta" | "media" | "baixa" | undefined;
    colaboradorId?: string | null | undefined;
}, {
    nome?: string | undefined;
    cliente?: string | undefined;
    veiculo?: string | undefined;
    modeloVersao?: string | undefined;
    placa?: string | undefined;
    observacoes?: string | undefined;
    responsavel?: string | undefined;
    prazoEstimado?: string | undefined;
    prioridade?: "" | "alta" | "media" | "baixa" | undefined;
    colaboradorId?: string | null | undefined;
}>;
export type PatchConveyorDadosBody = z.infer<typeof patchConveyorDadosBodySchema>;
/** PATCH /api/v1/conveyors/:id/structure — substitui árvore (regras no serviço). */
export declare const patchConveyorStructureBodySchema: z.ZodObject<{
    originType: z.ZodEnum<["MANUAL", "BASE", "HYBRID"]>;
    baseId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    baseCode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    baseName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    baseVersion: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    matrixRootItemId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    options: z.ZodArray<z.ZodObject<{
        titulo: z.ZodString;
        orderIndex: z.ZodNumber;
        sourceOrigin: z.ZodEnum<["manual", "reaproveitada", "base"]>;
        areas: z.ZodArray<z.ZodObject<{
            titulo: z.ZodString;
            orderIndex: z.ZodNumber;
            sourceOrigin: z.ZodEnum<["manual", "reaproveitada", "base"]>;
            steps: z.ZodArray<z.ZodEffects<z.ZodObject<{
                titulo: z.ZodString;
                orderIndex: z.ZodNumber;
                plannedMinutes: z.ZodNumber;
                sourceOrigin: z.ZodEnum<["manual", "reaproveitada", "base"]>;
                required: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
                assignees: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodObject<{
                    /** Retrocompat: ausente => COLLABORATOR. */
                    type: z.ZodOptional<z.ZodEnum<["COLLABORATOR", "TEAM"]>>;
                    collaboratorId: z.ZodOptional<z.ZodString>;
                    teamId: z.ZodOptional<z.ZodString>;
                    isPrimary: z.ZodBoolean;
                    assignmentOrigin: z.ZodOptional<z.ZodEnum<["manual", "base", "reaproveitada"]>>;
                    orderIndex: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    isPrimary: boolean;
                    type?: "COLLABORATOR" | "TEAM" | undefined;
                    collaboratorId?: string | undefined;
                    teamId?: string | undefined;
                    assignmentOrigin?: "manual" | "base" | "reaproveitada" | undefined;
                    orderIndex?: number | undefined;
                }, {
                    isPrimary: boolean;
                    type?: "COLLABORATOR" | "TEAM" | undefined;
                    collaboratorId?: string | undefined;
                    teamId?: string | undefined;
                    assignmentOrigin?: "manual" | "base" | "reaproveitada" | undefined;
                    orderIndex?: number | undefined;
                }>, {
                    isPrimary: boolean;
                    type?: "COLLABORATOR" | "TEAM" | undefined;
                    collaboratorId?: string | undefined;
                    teamId?: string | undefined;
                    assignmentOrigin?: "manual" | "base" | "reaproveitada" | undefined;
                    orderIndex?: number | undefined;
                }, {
                    isPrimary: boolean;
                    type?: "COLLABORATOR" | "TEAM" | undefined;
                    collaboratorId?: string | undefined;
                    teamId?: string | undefined;
                    assignmentOrigin?: "manual" | "base" | "reaproveitada" | undefined;
                    orderIndex?: number | undefined;
                }>, "many">>>;
            }, "strip", z.ZodTypeAny, {
                assignees: {
                    isPrimary: boolean;
                    type?: "COLLABORATOR" | "TEAM" | undefined;
                    collaboratorId?: string | undefined;
                    teamId?: string | undefined;
                    assignmentOrigin?: "manual" | "base" | "reaproveitada" | undefined;
                    orderIndex?: number | undefined;
                }[];
                orderIndex: number;
                plannedMinutes: number;
                titulo: string;
                sourceOrigin: "manual" | "base" | "reaproveitada";
                required: boolean;
            }, {
                orderIndex: number;
                plannedMinutes: number;
                titulo: string;
                sourceOrigin: "manual" | "base" | "reaproveitada";
                assignees?: {
                    isPrimary: boolean;
                    type?: "COLLABORATOR" | "TEAM" | undefined;
                    collaboratorId?: string | undefined;
                    teamId?: string | undefined;
                    assignmentOrigin?: "manual" | "base" | "reaproveitada" | undefined;
                    orderIndex?: number | undefined;
                }[] | undefined;
                required?: boolean | undefined;
            }>, {
                assignees: {
                    isPrimary: boolean;
                    type?: "COLLABORATOR" | "TEAM" | undefined;
                    collaboratorId?: string | undefined;
                    teamId?: string | undefined;
                    assignmentOrigin?: "manual" | "base" | "reaproveitada" | undefined;
                    orderIndex?: number | undefined;
                }[];
                orderIndex: number;
                plannedMinutes: number;
                titulo: string;
                sourceOrigin: "manual" | "base" | "reaproveitada";
                required: boolean;
            }, {
                orderIndex: number;
                plannedMinutes: number;
                titulo: string;
                sourceOrigin: "manual" | "base" | "reaproveitada";
                assignees?: {
                    isPrimary: boolean;
                    type?: "COLLABORATOR" | "TEAM" | undefined;
                    collaboratorId?: string | undefined;
                    teamId?: string | undefined;
                    assignmentOrigin?: "manual" | "base" | "reaproveitada" | undefined;
                    orderIndex?: number | undefined;
                }[] | undefined;
                required?: boolean | undefined;
            }>, "many">;
        }, "strip", z.ZodTypeAny, {
            orderIndex: number;
            steps: {
                assignees: {
                    isPrimary: boolean;
                    type?: "COLLABORATOR" | "TEAM" | undefined;
                    collaboratorId?: string | undefined;
                    teamId?: string | undefined;
                    assignmentOrigin?: "manual" | "base" | "reaproveitada" | undefined;
                    orderIndex?: number | undefined;
                }[];
                orderIndex: number;
                plannedMinutes: number;
                titulo: string;
                sourceOrigin: "manual" | "base" | "reaproveitada";
                required: boolean;
            }[];
            titulo: string;
            sourceOrigin: "manual" | "base" | "reaproveitada";
        }, {
            orderIndex: number;
            steps: {
                orderIndex: number;
                plannedMinutes: number;
                titulo: string;
                sourceOrigin: "manual" | "base" | "reaproveitada";
                assignees?: {
                    isPrimary: boolean;
                    type?: "COLLABORATOR" | "TEAM" | undefined;
                    collaboratorId?: string | undefined;
                    teamId?: string | undefined;
                    assignmentOrigin?: "manual" | "base" | "reaproveitada" | undefined;
                    orderIndex?: number | undefined;
                }[] | undefined;
                required?: boolean | undefined;
            }[];
            titulo: string;
            sourceOrigin: "manual" | "base" | "reaproveitada";
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        orderIndex: number;
        areas: {
            orderIndex: number;
            steps: {
                assignees: {
                    isPrimary: boolean;
                    type?: "COLLABORATOR" | "TEAM" | undefined;
                    collaboratorId?: string | undefined;
                    teamId?: string | undefined;
                    assignmentOrigin?: "manual" | "base" | "reaproveitada" | undefined;
                    orderIndex?: number | undefined;
                }[];
                orderIndex: number;
                plannedMinutes: number;
                titulo: string;
                sourceOrigin: "manual" | "base" | "reaproveitada";
                required: boolean;
            }[];
            titulo: string;
            sourceOrigin: "manual" | "base" | "reaproveitada";
        }[];
        titulo: string;
        sourceOrigin: "manual" | "base" | "reaproveitada";
    }, {
        orderIndex: number;
        areas: {
            orderIndex: number;
            steps: {
                orderIndex: number;
                plannedMinutes: number;
                titulo: string;
                sourceOrigin: "manual" | "base" | "reaproveitada";
                assignees?: {
                    isPrimary: boolean;
                    type?: "COLLABORATOR" | "TEAM" | undefined;
                    collaboratorId?: string | undefined;
                    teamId?: string | undefined;
                    assignmentOrigin?: "manual" | "base" | "reaproveitada" | undefined;
                    orderIndex?: number | undefined;
                }[] | undefined;
                required?: boolean | undefined;
            }[];
            titulo: string;
            sourceOrigin: "manual" | "base" | "reaproveitada";
        }[];
        titulo: string;
        sourceOrigin: "manual" | "base" | "reaproveitada";
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    options: {
        orderIndex: number;
        areas: {
            orderIndex: number;
            steps: {
                assignees: {
                    isPrimary: boolean;
                    type?: "COLLABORATOR" | "TEAM" | undefined;
                    collaboratorId?: string | undefined;
                    teamId?: string | undefined;
                    assignmentOrigin?: "manual" | "base" | "reaproveitada" | undefined;
                    orderIndex?: number | undefined;
                }[];
                orderIndex: number;
                plannedMinutes: number;
                titulo: string;
                sourceOrigin: "manual" | "base" | "reaproveitada";
                required: boolean;
            }[];
            titulo: string;
            sourceOrigin: "manual" | "base" | "reaproveitada";
        }[];
        titulo: string;
        sourceOrigin: "manual" | "base" | "reaproveitada";
    }[];
    originType: "MANUAL" | "BASE" | "HYBRID";
    baseId?: string | null | undefined;
    baseCode?: string | null | undefined;
    baseName?: string | null | undefined;
    baseVersion?: number | null | undefined;
    matrixRootItemId?: string | null | undefined;
}, {
    options: {
        orderIndex: number;
        areas: {
            orderIndex: number;
            steps: {
                orderIndex: number;
                plannedMinutes: number;
                titulo: string;
                sourceOrigin: "manual" | "base" | "reaproveitada";
                assignees?: {
                    isPrimary: boolean;
                    type?: "COLLABORATOR" | "TEAM" | undefined;
                    collaboratorId?: string | undefined;
                    teamId?: string | undefined;
                    assignmentOrigin?: "manual" | "base" | "reaproveitada" | undefined;
                    orderIndex?: number | undefined;
                }[] | undefined;
                required?: boolean | undefined;
            }[];
            titulo: string;
            sourceOrigin: "manual" | "base" | "reaproveitada";
        }[];
        titulo: string;
        sourceOrigin: "manual" | "base" | "reaproveitada";
    }[];
    originType: "MANUAL" | "BASE" | "HYBRID";
    baseId?: string | null | undefined;
    baseCode?: string | null | undefined;
    baseName?: string | null | undefined;
    baseVersion?: number | null | undefined;
    matrixRootItemId?: string | null | undefined;
}>;
export type PatchConveyorStructureBody = z.infer<typeof patchConveyorStructureBodySchema>;
export declare const conveyorOperationalStatusQueryEnum: z.ZodEnum<["NO_BACKLOG", "EM_REVISAO", "PRONTA_LIBERAR", "EM_PRODUCAO", "CONCLUIDA"]>;
/** Query string do GET /conveyors — valores vazios ignorados. */
export declare const getConveyorsQuerySchema: z.ZodObject<{
    q: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
    priority: z.ZodEffects<z.ZodOptional<z.ZodEnum<["alta", "media", "baixa"]>>, "alta" | "media" | "baixa" | undefined, unknown>;
    responsible: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
    operationalStatus: z.ZodEffects<z.ZodOptional<z.ZodEnum<["NO_BACKLOG", "EM_REVISAO", "PRONTA_LIBERAR", "EM_PRODUCAO", "CONCLUIDA"]>>, "NO_BACKLOG" | "EM_REVISAO" | "PRONTA_LIBERAR" | "EM_PRODUCAO" | "CONCLUIDA" | undefined, unknown>;
}, "strip", z.ZodTypeAny, {
    q?: string | undefined;
    priority?: "alta" | "media" | "baixa" | undefined;
    responsible?: string | undefined;
    operationalStatus?: "NO_BACKLOG" | "EM_REVISAO" | "PRONTA_LIBERAR" | "EM_PRODUCAO" | "CONCLUIDA" | undefined;
}, {
    q?: unknown;
    priority?: unknown;
    responsible?: unknown;
    operationalStatus?: unknown;
}>;
export type GetConveyorsQuery = z.infer<typeof getConveyorsQuerySchema>;
export declare const conveyorIdParamSchema: z.ZodString;
export declare const patchConveyorStatusBodySchema: z.ZodObject<{
    operationalStatus: z.ZodEnum<["NO_BACKLOG", "EM_REVISAO", "PRONTA_LIBERAR", "EM_PRODUCAO", "CONCLUIDA"]>;
}, "strip", z.ZodTypeAny, {
    operationalStatus: "NO_BACKLOG" | "EM_REVISAO" | "PRONTA_LIBERAR" | "EM_PRODUCAO" | "CONCLUIDA";
}, {
    operationalStatus: "NO_BACKLOG" | "EM_REVISAO" | "PRONTA_LIBERAR" | "EM_PRODUCAO" | "CONCLUIDA";
}>;
export type PatchConveyorStatusBody = z.infer<typeof patchConveyorStatusBodySchema>;
//# sourceMappingURL=conveyors.schemas.d.ts.map