import { Router } from 'express';
import { requireAuth } from '../auth/auth.middleware.js';
import { asyncRoute } from '../../shared/asyncRoute.js';
import { getMyActivities, getMyOperationalJourney, } from './my-activities.controller.js';
export function myActivitiesRouter() {
    const r = Router();
    r.get('/my-activities', requireAuth(), asyncRoute(getMyActivities));
    r.get('/my-operational-journey', requireAuth(), asyncRoute(getMyOperationalJourney));
    return r;
}
//# sourceMappingURL=my-activities.routes.js.map