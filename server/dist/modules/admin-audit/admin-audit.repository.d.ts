import type pg from 'pg';
import type { DbExecutor } from '../../shared/db/dbExecutor.js';
import type { AdminAuditEventType, AdminAuditListItem } from './admin-audit.types.js';
export type InsertAdminAuditInput = {
    eventType: AdminAuditEventType;
    actorUserId: string;
    targetUserId: string | null;
    targetCollaboratorId: string | null;
    metadata: Record<string, unknown> | null | undefined;
};
export declare function insertAdminAuditEvent(db: DbExecutor, input: InsertAdminAuditInput): Promise<void>;
export type AdminAuditListFilters = {
    eventType?: AdminAuditEventType;
    targetUserId?: string;
    occurredFrom?: Date;
    occurredTo?: Date;
    limit: number;
    offset: number;
};
export declare function countAdminAuditEvents(pool: pg.Pool, filters: AdminAuditListFilters): Promise<number>;
export declare function listAdminAuditEvents(pool: pg.Pool, filters: AdminAuditListFilters): Promise<AdminAuditListItem[]>;
//# sourceMappingURL=admin-audit.repository.d.ts.map