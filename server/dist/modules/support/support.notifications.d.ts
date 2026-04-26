import type { Env } from '../../config/env.js';
import type { DispatchResult, DispatchableNotification, PersistedSupportTicket } from './support.types.js';
type NotifierSendInput = {
    destination: string;
    ticketCode: string;
    title: string;
    description: string;
    severity: string;
    category: string;
    moduleName?: string | null;
    routePath?: string | null;
    createdByUserId: string;
    createdAt: string;
};
export declare function buildSupportEmailSubject(env: Env, ticketCode: string, severity: string, category: string, title: string): string;
export declare function buildSupportEmailText(input: NotifierSendInput): string;
export declare function dispatchNotifications(env: Env, plan: DispatchableNotification[], ticket: PersistedSupportTicket): Promise<DispatchResult[]>;
export {};
//# sourceMappingURL=support.notifications.d.ts.map