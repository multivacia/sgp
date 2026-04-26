import { Router } from 'express';
import { asyncRoute } from '../../shared/asyncRoute.js';
import { requireAuth } from '../auth/auth.middleware.js';
import { requirePermission } from '../permissions/permissions.middleware.js';
import { getExecutiveDashboard, getOperationalDashboard, } from './dashboard.controller.js';
export function dashboardRouter() {
    const r = Router();
    r.get('/dashboard/operational', requireAuth(), requirePermission('dashboard.view_operational'), asyncRoute(getOperationalDashboard));
    r.get('/dashboard/executive', requireAuth(), requirePermission('dashboard.view_executive'), asyncRoute(getExecutiveDashboard));
    return r;
}
//# sourceMappingURL=dashboard.routes.js.map