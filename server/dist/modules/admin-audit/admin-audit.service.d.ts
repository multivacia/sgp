import type pg from 'pg';
import { type AdminAuditListFilters } from './admin-audit.repository.js';
import type { AdminAuditListItem } from './admin-audit.types.js';
export declare function serviceListAdminAuditEvents(pool: pg.Pool, filters: AdminAuditListFilters): Promise<{
    data: AdminAuditListItem[];
    total: number;
}>;
//# sourceMappingURL=admin-audit.service.d.ts.map