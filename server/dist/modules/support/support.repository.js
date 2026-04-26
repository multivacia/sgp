import { AppError } from '../../shared/errors/AppError.js';
import { ErrorCodes } from '../../shared/errors/errorCodes.js';
function mapTicketRow(row) {
    return {
        id: row.id,
        code: row.code,
        status: row.status,
        category: row.category,
        severity: row.severity,
        title: row.title,
        description: row.description,
        createdByUserId: row.created_by_user_id,
        createdByCollaboratorId: row.created_by_collaborator_id,
        moduleName: row.module_name,
        routePath: row.route_path,
        context: row.context_json ?? {},
        requestId: row.request_id,
        correlationId: row.correlation_id,
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
    };
}
export async function createTicketRecord(pool, input) {
    const creator = await pool.query(`
    SELECT collaborator_id::text
    FROM app_users
    WHERE id = $1::uuid AND deleted_at IS NULL
    `, [input.createdByUserId]);
    if (!creator.rows[0]) {
        throw new AppError('Usuário autenticado não encontrado.', 401, ErrorCodes.UNAUTHORIZED);
    }
    const result = await pool.query(`
    INSERT INTO support_tickets (
      code, status, source, category, severity, title, description,
      created_by_user_id, created_by_collaborator_id, module_name, route_path,
      context_json, request_id, correlation_id
    )
    VALUES (
      $1, 'OPEN', 'MANUAL', $2, $3, $4, $5,
      $6::uuid, $7::uuid, $8, $9,
      $10::jsonb, $11, $12
    )
    RETURNING
      id, code, status, category, severity, title, description,
      created_by_user_id, created_by_collaborator_id, module_name, route_path,
      context_json, request_id, correlation_id, created_at, updated_at
    `, [
        input.code,
        input.category,
        input.severity,
        input.title,
        input.description,
        input.createdByUserId,
        creator.rows[0].collaborator_id,
        input.moduleName,
        input.routePath,
        JSON.stringify(input.context ?? {}),
        input.requestId,
        input.correlationId,
    ]);
    return mapTicketRow(result.rows[0]);
}
export async function insertNotificationAttempts(pool, ticketId, attempts) {
    for (const attempt of attempts) {
        await pool.query(`
      INSERT INTO support_ticket_notifications (
        ticket_id, channel, destination, status,
        provider_message_id, error_message, sent_at
      )
      VALUES ($1::uuid, $2, $3, $4, $5, $6, $7)
      `, [
            ticketId,
            attempt.channel,
            attempt.destination,
            attempt.status,
            attempt.providerMessageId ?? null,
            attempt.errorMessage ?? null,
            attempt.status === 'SENT' ? new Date() : null,
        ]);
    }
}
export async function findTicketByIdForUser(pool, ticketId, userId) {
    const result = await pool.query(`
    SELECT
      id, code, status, category, severity, title, description,
      created_by_user_id, created_by_collaborator_id, module_name, route_path,
      context_json, request_id, correlation_id, created_at, updated_at
    FROM support_tickets
    WHERE id = $1::uuid
      AND created_by_user_id = $2::uuid
    `, [ticketId, userId]);
    const row = result.rows[0];
    return row ? mapTicketRow(row) : null;
}
export async function listTicketsByUserWithFilters(pool, userId, filters) {
    const conditions = ['created_by_user_id = $1::uuid'];
    const params = [userId];
    let i = 2;
    if (filters.status) {
        conditions.push(`status = $${i}`);
        params.push(filters.status);
        i++;
    }
    if (filters.category) {
        conditions.push(`category = $${i}`);
        params.push(filters.category);
        i++;
    }
    if (filters.severity) {
        conditions.push(`severity = $${i}`);
        params.push(filters.severity);
        i++;
    }
    if (filters.q) {
        const escaped = filters.q.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
        const pattern = `%${escaped}%`;
        conditions.push(`(code ILIKE $${i} ESCAPE '\\' OR title ILIKE $${i} ESCAPE '\\')`);
        params.push(pattern);
        i++;
    }
    if (filters.period === 'today') {
        conditions.push(`created_at >= date_trunc('day', now())`);
    }
    else if (filters.period === '7d') {
        conditions.push(`created_at >= (now() - interval '7 days')`);
    }
    else if (filters.period === '30d') {
        conditions.push(`created_at >= (now() - interval '30 days')`);
    }
    const result = await pool.query(`
    SELECT
      id, code, status, category, severity, title, description,
      created_by_user_id, created_by_collaborator_id, module_name, route_path,
      context_json, request_id, correlation_id, created_at, updated_at
    FROM support_tickets
    WHERE ${conditions.join(' AND ')}
    ORDER BY updated_at DESC, created_at DESC
    `, params);
    return result.rows.map(mapTicketRow);
}
//# sourceMappingURL=support.repository.js.map