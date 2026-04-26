import type pg from 'pg';
import type { NotificationAttemptInput, PersistedSupportTicket, SupportTicketSeverity, SupportTicketStatus } from './support.types.js';
export type ListSupportTicketsForUserFilters = {
    q?: string;
    status?: SupportTicketStatus;
    category?: string;
    severity?: SupportTicketSeverity;
    period: 'all' | 'today' | '7d' | '30d';
};
export type CreateTicketRecordInput = {
    code: string;
    category: string;
    severity: SupportTicketSeverity;
    title: string;
    description: string;
    createdByUserId: string;
    moduleName: string | null;
    routePath: string | null;
    context: Record<string, unknown>;
    requestId: string | null;
    correlationId: string | null;
};
export declare function createTicketRecord(pool: pg.Pool, input: CreateTicketRecordInput): Promise<PersistedSupportTicket>;
export declare function insertNotificationAttempts(pool: pg.Pool, ticketId: string, attempts: NotificationAttemptInput[]): Promise<void>;
export declare function findTicketByIdForUser(pool: pg.Pool, ticketId: string, userId: string): Promise<PersistedSupportTicket | null>;
export declare function listTicketsByUserWithFilters(pool: pg.Pool, userId: string, filters: ListSupportTicketsForUserFilters): Promise<PersistedSupportTicket[]>;
//# sourceMappingURL=support.repository.d.ts.map