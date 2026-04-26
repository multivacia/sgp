import { AppError } from '../../shared/errors/AppError.js';
import { ErrorCodes } from '../../shared/errors/errorCodes.js';
import { buildSupportTicketCode, mapBlockingToSeverity } from './support.code.js';
import * as repository from './support.repository.js';
import { dispatchNotifications } from './support.notifications.js';
import { resolveRoutingPlan } from './support.routing.js';
import { listMySupportTicketsQuerySchema } from './support.schemas.js';
function toDispatchItems(plan) {
    return plan.items.flatMap((item) => item.destinations.map((destination) => ({ channel: item.channel, destination })));
}
function buildSummary(results) {
    const grouped = {
        EMAIL: results.filter((r) => r.channel === 'EMAIL'),
        WHATSAPP: results.filter((r) => r.channel === 'WHATSAPP'),
    };
    const summarize = (items) => {
        if (items.length === 0)
            return 'SKIPPED';
        if (items.some((i) => i.status === 'SENT'))
            return 'SENT';
        if (items.some((i) => i.status === 'FAILED'))
            return 'FAILED';
        if (items.every((i) => i.status === 'SKIPPED'))
            return 'SKIPPED';
        return 'PENDING';
    };
    return {
        email: summarize(grouped.EMAIL),
        whatsapp: summarize(grouped.WHATSAPP),
    };
}
export async function createSupportTicket(pool, env, userId, input) {
    if (!env.supportTicketsEnabled) {
        throw new AppError('Módulo de suporte está desativado.', 404, ErrorCodes.NOT_FOUND);
    }
    const severity = mapBlockingToSeverity(input.isBlocking);
    const ticket = await repository.createTicketRecord(pool, {
        code: buildSupportTicketCode(),
        category: input.category,
        severity,
        title: input.title,
        description: input.description,
        createdByUserId: userId,
        moduleName: input.moduleName ?? null,
        routePath: input.routePath ?? null,
        context: input.context ?? {},
        requestId: input.requestId ?? null,
        correlationId: input.correlationId ?? null,
    });
    const routingPlan = resolveRoutingPlan(env, { severity, category: input.category });
    const dispatchItems = toDispatchItems(routingPlan);
    const dispatchResults = await dispatchNotifications(env, dispatchItems, ticket);
    if (!dispatchResults.some((item) => item.channel === 'EMAIL')) {
        dispatchResults.push({
            channel: 'EMAIL',
            destination: null,
            status: 'SKIPPED',
            errorMessage: 'Sem destinatário configurado para EMAIL.',
        });
    }
    if (!dispatchResults.some((item) => item.channel === 'WHATSAPP')) {
        dispatchResults.push({
            channel: 'WHATSAPP',
            destination: null,
            status: 'SKIPPED',
            errorMessage: 'Sem destinatário configurado para WHATSAPP.',
        });
    }
    await repository.insertNotificationAttempts(pool, ticket.id, dispatchResults.map((result) => ({
        channel: result.channel,
        destination: result.destination,
        status: result.status,
        providerMessageId: result.providerMessageId,
        errorMessage: result.errorMessage,
    })));
    return {
        id: ticket.id,
        code: ticket.code,
        status: ticket.status,
        notificationSummary: buildSummary(dispatchResults),
        createdAt: ticket.createdAt,
    };
}
export async function getMySupportTicketById(pool, env, userId, ticketId) {
    if (!env.supportTicketsEnabled) {
        throw new AppError('Módulo de suporte está desativado.', 404, ErrorCodes.NOT_FOUND);
    }
    const ticket = await repository.findTicketByIdForUser(pool, ticketId, userId);
    if (!ticket)
        throw new AppError('Chamado não encontrado.', 404, ErrorCodes.NOT_FOUND);
    return ticket;
}
export async function listMySupportTickets(pool, env, userId, filters) {
    if (!env.supportTicketsEnabled) {
        throw new AppError('Módulo de suporte está desativado.', 404, ErrorCodes.NOT_FOUND);
    }
    const q = filters ?? listMySupportTicketsQuerySchema.parse({});
    return repository.listTicketsByUserWithFilters(pool, userId, {
        q: q.q,
        status: q.status,
        category: q.category,
        severity: q.severity,
        period: q.period,
    });
}
//# sourceMappingURL=support.service.js.map