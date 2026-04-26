export declare const SUPPORT_TICKET_STATUS: readonly ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
export type SupportTicketStatus = (typeof SUPPORT_TICKET_STATUS)[number];
export declare const SUPPORT_TICKET_SEVERITY: readonly ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
export type SupportTicketSeverity = (typeof SUPPORT_TICKET_SEVERITY)[number];
export declare const SUPPORT_NOTIFICATION_CHANNEL: readonly ["EMAIL", "WHATSAPP"];
export type SupportNotificationChannel = (typeof SUPPORT_NOTIFICATION_CHANNEL)[number];
export declare const SUPPORT_NOTIFICATION_STATUS: readonly ["PENDING", "SENT", "FAILED", "SKIPPED"];
export type SupportNotificationStatus = (typeof SUPPORT_NOTIFICATION_STATUS)[number];
export type CreateSupportTicketInput = {
    category: string;
    title: string;
    description: string;
    isBlocking: boolean;
    moduleName?: string | null;
    routePath?: string | null;
    context?: Record<string, unknown>;
    requestId?: string | null;
    correlationId?: string | null;
};
export type PersistedSupportTicket = {
    id: string;
    code: string;
    status: SupportTicketStatus;
    category: string;
    severity: SupportTicketSeverity;
    title: string;
    description: string;
    createdByUserId: string;
    createdByCollaboratorId: string | null;
    moduleName: string | null;
    routePath: string | null;
    context: Record<string, unknown>;
    requestId: string | null;
    correlationId: string | null;
    createdAt: string;
    updatedAt: string;
};
export type NotificationAttemptInput = {
    channel: SupportNotificationChannel;
    destination: string | null;
    status: SupportNotificationStatus;
    providerMessageId?: string;
    errorMessage?: string;
};
export type NotificationSummary = {
    email: 'SENT' | 'FAILED' | 'SKIPPED' | 'PENDING';
    whatsapp: 'SENT' | 'FAILED' | 'SKIPPED' | 'PENDING';
};
export type RoutingPlanItem = {
    channel: SupportNotificationChannel;
    destinations: string[];
};
export type RoutingPlan = {
    items: RoutingPlanItem[];
};
export type DispatchableNotification = {
    channel: SupportNotificationChannel;
    destination: string;
};
export type DispatchResult = {
    channel: SupportNotificationChannel;
    destination: string | null;
    status: 'SENT' | 'FAILED' | 'SKIPPED';
    providerMessageId?: string;
    errorMessage?: string;
};
//# sourceMappingURL=support.types.d.ts.map