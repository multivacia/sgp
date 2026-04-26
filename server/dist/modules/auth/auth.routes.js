import { Router } from 'express';
import { asyncRoute } from '../../shared/asyncRoute.js';
import { getMe, postChangePassword, postLogin, postLogout } from './auth.controller.js';
import { requireAuth } from './auth.middleware.js';
export function authRouter() {
    const r = Router();
    r.post('/auth/login', asyncRoute(postLogin));
    r.post('/auth/logout', asyncRoute(postLogout));
    r.get('/auth/me', requireAuth(), asyncRoute(getMe));
    r.post('/auth/change-password', requireAuth(), asyncRoute(postChangePassword));
    return r;
}
//# sourceMappingURL=auth.routes.js.map