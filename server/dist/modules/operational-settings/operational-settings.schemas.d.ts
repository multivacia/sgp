import { z } from 'zod';
export declare const uuidParamSchema: z.ZodString;
export declare const createSectorBodySchema: z.ZodObject<{
    name: z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
}, {
    name: string;
}>;
export declare const patchSectorBodySchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>>;
    isActive: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    isActive?: boolean | undefined;
    name?: string | undefined;
}, {
    isActive?: boolean | undefined;
    name?: string | undefined;
}>;
export declare const createCollaboratorRoleBodySchema: z.ZodObject<{
    name: z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>;
    /** Opcional; se omitido ou vazio, o servidor gera código único `OPF_*`. */
    code: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>;
}, "strip", z.ZodTypeAny, {
    name: string;
    code?: string | undefined;
}, {
    name: string;
    code?: unknown;
}>;
export declare const patchCollaboratorRoleBodySchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>>;
    code: z.ZodOptional<z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>>;
    isActive: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    code?: string | undefined;
    isActive?: boolean | undefined;
    name?: string | undefined;
}, {
    code?: string | undefined;
    isActive?: boolean | undefined;
    name?: string | undefined;
}>;
export type CreateSectorBody = z.infer<typeof createSectorBodySchema>;
export type PatchSectorBody = z.infer<typeof patchSectorBodySchema>;
export type CreateCollaboratorRoleBody = z.infer<typeof createCollaboratorRoleBodySchema>;
export type PatchCollaboratorRoleBody = z.infer<typeof patchCollaboratorRoleBodySchema>;
//# sourceMappingURL=operational-settings.schemas.d.ts.map