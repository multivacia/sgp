import { countAdminAuditEvents, listAdminAuditEvents, } from './admin-audit.repository.js';
export async function serviceListAdminAuditEvents(pool, filters) {
    const [total, data] = await Promise.all([
        countAdminAuditEvents(pool, filters),
        listAdminAuditEvents(pool, filters),
    ]);
    return { data, total };
}
//# sourceMappingURL=admin-audit.service.js.map