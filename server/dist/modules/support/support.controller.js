import { ok } from '../../shared/http/ok.js';
import { createSupportTicketBodySchema, listMySupportTicketsQuerySchema, supportTicketIdParamSchema, } from './support.schemas.js';
import { createSupportTicket, getMySupportTicketById, listMySupportTickets } from './support.service.js';
function queryString(v) {
    if (v === undefined || v === null)
        return undefined;
    if (Array.isArray(v))
        return queryString(v[0]);
    if (typeof v !== 'string')
        return undefined;
    const s = v.trim();
    return s.length ? s : undefined;
}
export async function postSupportTicket(req, res) {
    const pool = req.app.locals.pool;
    const env = req.app.locals.env;
    const body = createSupportTicketBodySchema.parse(req.body);
    const data = await createSupportTicket(pool, env, req.authUser.id, body);
    res.status(201).json(ok(data));
}
export async function getSupportTicketById(req, res) {
    const pool = req.app.locals.pool;
    const env = req.app.locals.env;
    const id = supportTicketIdParamSchema.parse(req.params.id);
    const data = await getMySupportTicketById(pool, env, req.authUser.id, id);
    res.json(ok(data));
}
export async function getMySupportTickets(req, res) {
    const pool = req.app.locals.pool;
    const env = req.app.locals.env;
    const data = await listMySupportTickets(pool, env, req.authUser.id);
    res.json(ok(data, { total: data.length }));
}
export async function getSupportTickets(req, res) {
    const pool = req.app.locals.pool;
    const env = req.app.locals.env;
    const query = listMySupportTicketsQuerySchema.parse({
        q: queryString(req.query.q),
        status: queryString(req.query.status),
        category: queryString(req.query.category),
        severity: queryString(req.query.severity),
        period: queryString(req.query.period),
    });
    const items = await listMySupportTickets(pool, env, req.authUser.id, query);
    res.json(ok({ items, total: items.length }));
}
//# sourceMappingURL=support.controller.js.map