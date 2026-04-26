import { z } from 'zod';
import { ok } from '../../shared/http/ok.js';
import { putRolePermissionsBodySchema } from './rbac.schemas.js';
import { serviceGetRolePermissionCodes, serviceListRbacPermissionsCatalog, serviceListRbacRoles, servicePutRolePermissions, } from './rbac.service.js';
export async function getRbacRoles(req, res) {
    const pool = req.app.locals.pool;
    const rows = await serviceListRbacRoles(pool);
    res.json(ok(rows, { total: rows.length }));
}
export async function getRbacPermissionsCatalog(req, res) {
    const pool = req.app.locals.pool;
    const rows = await serviceListRbacPermissionsCatalog(pool);
    res.json(ok(rows, { total: rows.length }));
}
const roleIdParamSchema = z.string().uuid();
export async function getRbacRolePermissions(req, res) {
    const pool = req.app.locals.pool;
    const roleId = roleIdParamSchema.parse(req.params.roleId);
    const { role, permissionCodes } = await serviceGetRolePermissionCodes(pool, roleId);
    res.json(ok({ role, permissionCodes }, { total: permissionCodes.length }));
}
export async function putRbacRolePermissions(req, res) {
    const pool = req.app.locals.pool;
    const uid = req.authUser?.id;
    if (!uid) {
        res.status(401).json({ message: 'Sessão não autenticada.' });
        return;
    }
    const roleId = roleIdParamSchema.parse(req.params.roleId);
    const body = putRolePermissionsBodySchema.parse(req.body ?? {});
    const { permissionCodes } = await servicePutRolePermissions(pool, uid, roleId, body);
    res.json(ok({ permissionCodes }, {}));
}
//# sourceMappingURL=rbac.controller.js.map