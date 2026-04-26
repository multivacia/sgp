import { z } from 'zod';
export declare const createSupportTicketBodySchema: z.ZodObject<{
    category: z.ZodString;
    title: z.ZodString;
    description: z.ZodString;
    isBlocking: z.ZodBoolean;
    moduleName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    routePath: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    context: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    requestId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    correlationId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    description: string;
    title: string;
    category: string;
    isBlocking: boolean;
    correlationId?: string | null | undefined;
    requestId?: string | null | undefined;
    moduleName?: string | null | undefined;
    routePath?: string | null | undefined;
    context?: Record<string, unknown> | undefined;
}, {
    description: string;
    title: string;
    category: string;
    isBlocking: boolean;
    correlationId?: string | null | undefined;
    requestId?: string | null | undefined;
    moduleName?: string | null | undefined;
    routePath?: string | null | undefined;
    context?: Record<string, unknown> | undefined;
}>;
export declare const supportTicketIdParamSchema: z.ZodString;
export declare const listMySupportTicketsQuerySchema: z.ZodEffects<z.ZodObject<{
    q: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]>>;
    category: z.ZodOptional<z.ZodString>;
    severity: z.ZodOptional<z.ZodEnum<["LOW", "MEDIUM", "HIGH", "CRITICAL"]>>;
    period: z.ZodDefault<z.ZodOptional<z.ZodEnum<["all", "today", "7d", "30d"]>>>;
}, "strip", z.ZodTypeAny, {
    period: "all" | "7d" | "30d" | "today";
    status?: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED" | undefined;
    category?: string | undefined;
    q?: string | undefined;
    severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | undefined;
}, {
    status?: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED" | undefined;
    period?: "all" | "7d" | "30d" | "today" | undefined;
    category?: string | undefined;
    q?: string | undefined;
    severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | undefined;
}>, {
    q: string | undefined;
    status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED" | undefined;
    category: string | undefined;
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | undefined;
    period: "all" | "7d" | "30d" | "today";
}, {
    status?: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED" | undefined;
    period?: "all" | "7d" | "30d" | "today" | undefined;
    category?: string | undefined;
    q?: string | undefined;
    severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | undefined;
}>;
export type ListMySupportTicketsQuery = z.infer<typeof listMySupportTicketsQuerySchema>;
export type CreateSupportTicketBody = z.infer<typeof createSupportTicketBodySchema>;
//# sourceMappingURL=support.schemas.d.ts.map