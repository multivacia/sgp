import { Router } from 'express';
import { asyncRoute } from '../../shared/asyncRoute.js';
import { requireAuth } from '../auth/auth.middleware.js';
import { getMySupportTickets, getSupportTicketById, getSupportTickets, postSupportTicket, } from './support.controller.js';
export function supportRouter() {
    const r = Router();
    r.post('/support/tickets', requireAuth(), asyncRoute(postSupportTicket));
    r.get('/support/tickets/my', requireAuth(), asyncRoute(getMySupportTickets));
    r.get('/support/tickets', requireAuth(), asyncRoute(getSupportTickets));
    r.get('/support/tickets/:id', requireAuth(), asyncRoute(getSupportTicketById));
    return r;
}
//# sourceMappingURL=support.routes.js.map