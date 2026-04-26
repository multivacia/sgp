import { ok } from '../../shared/http/ok.js';
import { createAdminUserBodySchema, eligibleCollaboratorsQuerySchema, listAdminUsersQuerySchema, patchAdminUserBodySchema, uuidParamSchema, } from './admin-users.schemas.js';
import { serviceActivate, serviceCollaboratorLinkageSummary, serviceCreateUser, serviceEligibleCollaborators, serviceForcePasswordChange, serviceGetUserById, serviceInactivate, serviceResetPassword, serviceListUsers, servicePatchUser, serviceRestore, serviceSoftDelete, } from './admin-users.service.js';
function queryString(v) {
    if (typeof v === 'string')
        return v;
    if (Array.isArray(v) && typeof v[0] === 'string')
        return v[0];
    return undefined;
}
export async function getCollaboratorLinkageSummary(req, res) {
    const pool = req.app.locals.pool;
    const data = await serviceCollaboratorLinkageSummary(pool);
    res.json(ok(data));
}
export async function getAdminUsers(req, res) {
    const pool = req.app.locals.pool;
    const q = listAdminUsersQuerySchema.parse({
        search: queryString(req.query.search),
        role_id: queryString(req.query.role_id),
        limit: queryString(req.query.limit),
        offset: queryString(req.query.offset),
    });
    const filters = {
        search: q.search,
        roleId: q.roleId,
        limit: q.limit,
        offset: q.offset,
    };
    const { data, total } = await serviceListUsers(pool, filters);
    res.json(ok(data, { total, limit: q.limit, offset: q.offset }));
}
export async function getAdminUserById(req, res) {
    const id = uuidParamSchema.parse(req.params.id);
    const pool = req.app.locals.pool;
    const data = await serviceGetUserById(pool, id);
    res.json(ok(data));
}
export async function postAdminUser(req, res) {
    const body = createAdminUserBodySchema.parse(req.body);
    const pool = req.app.locals.pool;
    const actorId = req.authUser.id;
    const created = await serviceCreateUser(pool, actorId, body);
    res.status(201).json(ok(created));
}
export async function patchAdminUser(req, res) {
    const id = uuidParamSchema.parse(req.params.id);
    const body = patchAdminUserBodySchema.parse(req.body);
    const pool = req.app.locals.pool;
    const actorId = req.authUser.id;
    const updated = await servicePatchUser(pool, actorId, id, body);
    res.json(ok(updated));
}
export async function postAdminUserActivate(req, res) {
    const id = uuidParamSchema.parse(req.params.id);
    const pool = req.app.locals.pool;
    const actorId = req.authUser.id;
    const row = await serviceActivate(pool, actorId, id);
    res.json(ok(row));
}
export async function postAdminUserInactivate(req, res) {
    const id = uuidParamSchema.parse(req.params.id);
    const pool = req.app.locals.pool;
    const actorId = req.authUser.id;
    const row = await serviceInactivate(pool, actorId, id);
    res.json(ok(row));
}
export async function postAdminUserSoftDelete(req, res) {
    const id = uuidParamSchema.parse(req.params.id);
    const pool = req.app.locals.pool;
    const actorId = req.authUser.id;
    const row = await serviceSoftDelete(pool, actorId, id);
    res.json(ok(row));
}
export async function postAdminUserRestore(req, res) {
    const id = uuidParamSchema.parse(req.params.id);
    const pool = req.app.locals.pool;
    const actorId = req.authUser.id;
    const row = await serviceRestore(pool, actorId, id);
    res.json(ok(row));
}
export async function postAdminUserForcePasswordChange(req, res) {
    const id = uuidParamSchema.parse(req.params.id);
    const pool = req.app.locals.pool;
    const actorId = req.authUser.id;
    const row = await serviceForcePasswordChange(pool, actorId, id);
    res.json(ok(row));
}
export async function postAdminUserResetPassword(req, res) {
    const id = uuidParamSchema.parse(req.params.id);
    const pool = req.app.locals.pool;
    const actorId = req.authUser.id;
    const result = await serviceResetPassword(pool, actorId, id);
    res.json(ok(result));
}
export async function getEligibleCollaboratorsForLink(req, res) {
    const q = eligibleCollaboratorsQuerySchema.parse({
        excludeUserId: queryString(req.query.excludeUserId),
    });
    const pool = req.app.locals.pool;
    const data = await serviceEligibleCollaborators(pool, q.excludeUserId);
    res.json(ok(data, { total: data.length }));
}
//# sourceMappingURL=admin-users.controller.js.map