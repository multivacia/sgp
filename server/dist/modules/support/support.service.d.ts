import type pg from 'pg';
import type { Env } from '../../config/env.js';
import { type ListMySupportTicketsQuery } from './support.schemas.js';
import type { CreateSupportTicketInput, NotificationSummary } from './support.types.js';
export declare function createSupportTicket(pool: pg.Pool, env: Env, userId: string, input: CreateSupportTicketInput): Promise<{
    id: string;
    code: string;
    status: string;
    notificationSummary: NotificationSummary;
    createdAt: string;
}>;
export declare function getMySupportTicketById(pool: pg.Pool, env: Env, userId: string, ticketId: string): Promise<import("./support.types.js").PersistedSupportTicket>;
export declare function listMySupportTickets(pool: pg.Pool, env: Env, userId: string, filters?: ListMySupportTicketsQuery): Promise<import("./support.types.js").PersistedSupportTicket[]>;
//# sourceMappingURL=support.service.d.ts.map