import { ok } from '../../shared/http/ok.js';
import { listAdminAuditEventsQuerySchema } from './admin-audit.schemas.js';
import { serviceListAdminAuditEvents } from './admin-audit.service.js';
function queryString(v) {
    if (typeof v === 'string')
        return v;
    if (Array.isArray(v) && typeof v[0] === 'string')
        return v[0];
    return undefined;
}
export async function getAdminAuditEvents(req, res) {
    const pool = req.app.locals.pool;
    const q = listAdminAuditEventsQuerySchema.parse({
        event_type: queryString(req.query.event_type),
        target_user_id: queryString(req.query.target_user_id),
        occurred_from: queryString(req.query.occurred_from),
        occurred_to: queryString(req.query.occurred_to),
        limit: queryString(req.query.limit),
        offset: queryString(req.query.offset),
    });
    const filters = {
        eventType: q.eventType,
        targetUserId: q.targetUserId,
        occurredFrom: q.occurredFrom,
        occurredTo: q.occurredTo,
        limit: q.limit,
        offset: q.offset,
    };
    const { data, total } = await serviceListAdminAuditEvents(pool, filters);
    res.json(ok(data, { total, limit: q.limit, offset: q.offset }));
}
//# sourceMappingURL=admin-audit.controller.js.map