import { AppError } from '../../shared/errors/AppError.js';
import { ErrorCodes } from '../../shared/errors/errorCodes.js';
import { ok } from '../../shared/http/ok.js';
import { createTeamBodySchema, createTeamMemberBodySchema, listTeamsQuerySchema, patchTeamBodySchema, patchTeamMemberBodySchema, uuidParamSchema, } from './teams.schemas.js';
import { serviceSemanticDeleteTeam, serviceAddMember, serviceCreateTeam, serviceGetTeam, serviceListMembers, serviceListTeams, servicePatchMember, servicePatchTeam, serviceSemanticDeleteMember, } from './teams.service.js';
function queryString(v) {
    if (typeof v === 'string')
        return v;
    if (Array.isArray(v) && typeof v[0] === 'string')
        return v[0];
    return undefined;
}
export async function getTeams(req, res) {
    const pool = req.app.locals.pool;
    const q = listTeamsQuerySchema.parse({
        search: queryString(req.query.search),
        is_active: queryString(req.query.is_active),
        limit: queryString(req.query.limit),
        offset: queryString(req.query.offset),
    });
    const { data, total } = await serviceListTeams(pool, q);
    res.json(ok(data, { total, limit: q.limit, offset: q.offset }));
}
export async function postTeam(req, res) {
    const body = createTeamBodySchema.parse(req.body);
    const pool = req.app.locals.pool;
    const created = await serviceCreateTeam(pool, body);
    res.status(201).json(ok(created));
}
export async function getTeamById(req, res) {
    const id = uuidParamSchema.parse(req.params.id);
    const pool = req.app.locals.pool;
    const row = await serviceGetTeam(pool, id);
    if (!row) {
        throw new AppError('Equipe não encontrada.', 404, ErrorCodes.NOT_FOUND);
    }
    res.json(ok(row));
}
export async function patchTeam(req, res) {
    const id = uuidParamSchema.parse(req.params.id);
    const body = patchTeamBodySchema.parse(req.body);
    const pool = req.app.locals.pool;
    const updated = await servicePatchTeam(pool, id, body);
    if (!updated) {
        throw new AppError('Equipe não encontrada.', 404, ErrorCodes.NOT_FOUND);
    }
    res.json(ok(updated));
}
export async function deleteTeam(req, res) {
    const id = uuidParamSchema.parse(req.params.id);
    const pool = req.app.locals.pool;
    const updated = await serviceSemanticDeleteTeam(pool, id);
    if (!updated) {
        throw new AppError('Equipe não encontrada.', 404, ErrorCodes.NOT_FOUND);
    }
    res.json(ok(updated));
}
export async function getTeamMembers(req, res) {
    const teamId = uuidParamSchema.parse(req.params.teamId);
    const pool = req.app.locals.pool;
    const data = await serviceListMembers(pool, teamId);
    if (data === null) {
        throw new AppError('Equipe não encontrada.', 404, ErrorCodes.NOT_FOUND);
    }
    res.json(ok(data, { total: data.length }));
}
export async function postTeamMember(req, res) {
    const teamId = uuidParamSchema.parse(req.params.teamId);
    const body = createTeamMemberBodySchema.parse(req.body);
    const pool = req.app.locals.pool;
    const created = await serviceAddMember(pool, teamId, body);
    res.status(201).json(ok(created));
}
export async function patchTeamMember(req, res) {
    const teamId = uuidParamSchema.parse(req.params.teamId);
    const memberId = uuidParamSchema.parse(req.params.memberId);
    const body = patchTeamMemberBodySchema.parse(req.body);
    const pool = req.app.locals.pool;
    const updated = await servicePatchMember(pool, teamId, memberId, body);
    if (!updated) {
        throw new AppError('Membro não encontrado nesta equipe.', 404, ErrorCodes.NOT_FOUND);
    }
    res.json(ok(updated));
}
export async function deleteTeamMember(req, res) {
    const teamId = uuidParamSchema.parse(req.params.teamId);
    const memberId = uuidParamSchema.parse(req.params.memberId);
    const pool = req.app.locals.pool;
    const updated = await serviceSemanticDeleteMember(pool, teamId, memberId);
    if (!updated) {
        throw new AppError('Membro não encontrado nesta equipe.', 404, ErrorCodes.NOT_FOUND);
    }
    res.json(ok(updated));
}
//# sourceMappingURL=teams.controller.js.map