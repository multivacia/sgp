import { Router } from 'express';
import { asyncRoute } from '../../shared/asyncRoute.js';
import { requireAuth } from '../auth/auth.middleware.js';
import { requirePermission } from '../permissions/permissions.middleware.js';
import { deleteOperationalCollaboratorRole, deleteOperationalSector, getOperationalCollaboratorRoles, getOperationalSectors, patchOperationalCollaboratorRole, patchOperationalSector, postOperationalCollaboratorRole, postOperationalSector, } from './operational-settings.controller.js';
function ap(code) {
    return [requireAuth(), requirePermission(code)];
}
export function operationalSettingsRouter() {
    const r = Router();
    const m = 'operational_settings.manage';
    r.get('/admin/operational-settings/sectors', ...ap(m), asyncRoute(getOperationalSectors));
    r.post('/admin/operational-settings/sectors', ...ap(m), asyncRoute(postOperationalSector));
    r.patch('/admin/operational-settings/sectors/:id', ...ap(m), asyncRoute(patchOperationalSector));
    r.delete('/admin/operational-settings/sectors/:id', ...ap(m), asyncRoute(deleteOperationalSector));
    r.get('/admin/operational-settings/collaborator-roles', ...ap(m), asyncRoute(getOperationalCollaboratorRoles));
    r.post('/admin/operational-settings/collaborator-roles', ...ap(m), asyncRoute(postOperationalCollaboratorRole));
    r.patch('/admin/operational-settings/collaborator-roles/:id', ...ap(m), asyncRoute(patchOperationalCollaboratorRole));
    r.delete('/admin/operational-settings/collaborator-roles/:id', ...ap(m), asyncRoute(deleteOperationalCollaboratorRole));
    return r;
}
//# sourceMappingURL=operational-settings.routes.js.map