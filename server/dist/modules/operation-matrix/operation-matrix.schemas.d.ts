import { z } from 'zod';
export declare const listMatrixItemsQuerySchema: z.ZodEffects<z.ZodObject<{
    search: z.ZodOptional<z.ZodString>;
    is_active: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    is_active?: string | undefined;
    search?: string | undefined;
}, {
    is_active?: string | undefined;
    search?: string | undefined;
}>, {
    search: string | undefined;
    is_active: boolean | undefined;
}, {
    is_active?: string | undefined;
    search?: string | undefined;
}>;
export declare const createMatrixNodeBodySchema: z.ZodEffects<z.ZodObject<{
    nodeType: z.ZodEnum<["ITEM", "TASK", "SECTOR", "ACTIVITY"]>;
    parentId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    name: z.ZodString;
    code: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    orderIndex: z.ZodOptional<z.ZodNumber>;
    isActive: z.ZodOptional<z.ZodBoolean>;
    plannedMinutes: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    defaultResponsibleId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    teamIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    required: z.ZodOptional<z.ZodBoolean>;
    sourceKey: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    metadataJson: z.ZodOptional<z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    name: string;
    nodeType: "ITEM" | "TASK" | "SECTOR" | "ACTIVITY";
    code?: string | null | undefined;
    isActive?: boolean | undefined;
    orderIndex?: number | undefined;
    description?: string | null | undefined;
    plannedMinutes?: number | null | undefined;
    required?: boolean | undefined;
    parentId?: string | null | undefined;
    defaultResponsibleId?: string | null | undefined;
    teamIds?: string[] | undefined;
    sourceKey?: string | null | undefined;
    metadataJson?: unknown;
}, {
    name: string;
    nodeType: "ITEM" | "TASK" | "SECTOR" | "ACTIVITY";
    code?: string | null | undefined;
    isActive?: boolean | undefined;
    orderIndex?: number | undefined;
    description?: string | null | undefined;
    plannedMinutes?: number | null | undefined;
    required?: boolean | undefined;
    parentId?: string | null | undefined;
    defaultResponsibleId?: string | null | undefined;
    teamIds?: string[] | undefined;
    sourceKey?: string | null | undefined;
    metadataJson?: unknown;
}>, {
    name: string;
    nodeType: "ITEM" | "TASK" | "SECTOR" | "ACTIVITY";
    code?: string | null | undefined;
    isActive?: boolean | undefined;
    orderIndex?: number | undefined;
    description?: string | null | undefined;
    plannedMinutes?: number | null | undefined;
    required?: boolean | undefined;
    parentId?: string | null | undefined;
    defaultResponsibleId?: string | null | undefined;
    teamIds?: string[] | undefined;
    sourceKey?: string | null | undefined;
    metadataJson?: unknown;
}, {
    name: string;
    nodeType: "ITEM" | "TASK" | "SECTOR" | "ACTIVITY";
    code?: string | null | undefined;
    isActive?: boolean | undefined;
    orderIndex?: number | undefined;
    description?: string | null | undefined;
    plannedMinutes?: number | null | undefined;
    required?: boolean | undefined;
    parentId?: string | null | undefined;
    defaultResponsibleId?: string | null | undefined;
    teamIds?: string[] | undefined;
    sourceKey?: string | null | undefined;
    metadataJson?: unknown;
}>;
export declare const patchMatrixNodeBodySchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    code: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    orderIndex: z.ZodOptional<z.ZodNumber>;
    isActive: z.ZodOptional<z.ZodBoolean>;
    plannedMinutes: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    defaultResponsibleId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    teamIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    required: z.ZodOptional<z.ZodBoolean>;
    sourceKey: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    metadataJson: z.ZodOptional<z.ZodUnknown>;
}, "strict", z.ZodTypeAny, {
    code?: string | null | undefined;
    isActive?: boolean | undefined;
    orderIndex?: number | undefined;
    name?: string | undefined;
    description?: string | null | undefined;
    plannedMinutes?: number | null | undefined;
    required?: boolean | undefined;
    defaultResponsibleId?: string | null | undefined;
    teamIds?: string[] | undefined;
    sourceKey?: string | null | undefined;
    metadataJson?: unknown;
}, {
    code?: string | null | undefined;
    isActive?: boolean | undefined;
    orderIndex?: number | undefined;
    name?: string | undefined;
    description?: string | null | undefined;
    plannedMinutes?: number | null | undefined;
    required?: boolean | undefined;
    defaultResponsibleId?: string | null | undefined;
    teamIds?: string[] | undefined;
    sourceKey?: string | null | undefined;
    metadataJson?: unknown;
}>;
export declare const reorderBodySchema: z.ZodObject<{
    direction: z.ZodEnum<["up", "down"]>;
}, "strip", z.ZodTypeAny, {
    direction: "up" | "down";
}, {
    direction: "up" | "down";
}>;
export type CreateMatrixNodeBody = z.infer<typeof createMatrixNodeBodySchema>;
export type PatchMatrixNodeBody = z.infer<typeof patchMatrixNodeBodySchema>;
export type ReorderBody = z.infer<typeof reorderBodySchema>;
export declare const uuidParamSchema: z.ZodString;
//# sourceMappingURL=operation-matrix.schemas.d.ts.map