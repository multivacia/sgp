import { ok } from '../../shared/http/ok.js';
import { AppError } from '../../shared/errors/AppError.js';
import { ErrorCodes } from '../../shared/errors/errorCodes.js';
import { findCollaboratorIdByAppUserId } from '../auth/auth.repository.js';
import { serviceGetOperationalJourney } from '../operational-journey/operational-journey.service.js';
import { operationalJourneyQuerySchema } from '../operational-journey/operational-journey.schemas.js';
import { serviceListMyActivities } from './my-activities.service.js';
function queryString(v) {
    if (typeof v === 'string')
        return v;
    if (Array.isArray(v) && typeof v[0] === 'string')
        return v[0];
    return undefined;
}
export async function getMyActivities(req, res) {
    const pool = req.app.locals.pool;
    const auth = req.authUser;
    const { items, resolvedCollaboratorId } = await serviceListMyActivities(pool, {
        userId: auth.id,
    });
    res.json(ok(items, {
        collaboratorId: resolvedCollaboratorId,
    }));
}
/**
 * Mesma carga que GET /collaborators/:id/operational-journey, mas o colaborador
 * vem exclusivamente da sessão (sem path/query de id).
 */
export async function getMyOperationalJourney(req, res) {
    const pool = req.app.locals.pool;
    const auth = req.authUser;
    const collaboratorId = await findCollaboratorIdByAppUserId(pool, auth.id);
    if (!collaboratorId) {
        throw new AppError('Operação indisponível: o seu utilizador não tem colaborador operacional vinculado (app_users.collaborator_id). Peça ao administrador de governança para associar o seu acesso a um colaborador.', 422, ErrorCodes.VALIDATION_ERROR);
    }
    const q = operationalJourneyQuerySchema.parse({
        periodPreset: queryString(req.query.periodPreset),
        from: queryString(req.query.from),
        to: queryString(req.query.to),
        limit: queryString(req.query.limit),
        conveyorId: queryString(req.query.conveyorId),
    });
    const data = await serviceGetOperationalJourney(pool, { collaboratorId, query: q });
    res.json(ok(data));
}
//# sourceMappingURL=my-activities.controller.js.map