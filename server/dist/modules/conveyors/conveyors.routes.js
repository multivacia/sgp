import { Router } from 'express';
import { asyncRoute } from '../../shared/asyncRoute.js';
import { documentDraftMulter, documentDraftMulterErrorHandler, } from '../argos-integration/document-draft.multer.js';
import { postDocumentDraft } from '../argos-integration/document-draft.controller.js';
import { requireAuth } from '../auth/auth.middleware.js';
import { requirePermission } from '../permissions/permissions.middleware.js';
import { postConveyor } from './conveyors.controller.js';
import { getConveyorById } from './conveyors.detail.controller.js';
import { getConveyorNodeWorkload } from './conveyors.nodeWorkload.controller.js';
import { getConveyors } from './conveyors.list.controller.js';
import { patchConveyorDados, patchConveyorStructure, } from './conveyors.patch.controller.js';
import { patchConveyorStatus } from './conveyors.status.controller.js';
const auth = [requireAuth()];
export function conveyorsRouter(env) {
    const r = Router();
    const uploadDraft = documentDraftMulter(env);
    r.get('/conveyors', ...auth, asyncRoute(getConveyors));
    r.patch('/conveyors/:id/status', requireAuth(), requirePermission('conveyors.edit_status'), asyncRoute(patchConveyorStatus));
    r.patch('/conveyors/:id/structure', requireAuth(), requirePermission('conveyors.create'), asyncRoute(patchConveyorStructure));
    r.patch('/conveyors/:id', requireAuth(), requirePermission('conveyors.create'), asyncRoute(patchConveyorDados));
    r.get('/conveyors/:id/node-workload', ...auth, asyncRoute(getConveyorNodeWorkload));
    r.get('/conveyors/:id', ...auth, asyncRoute(getConveyorById));
    r.post('/conveyors/document-draft', requireAuth(), requirePermission('conveyors.create'), (req, res, next) => {
        uploadDraft(req, res, (err) => {
            if (err) {
                documentDraftMulterErrorHandler(err, req, res, next);
                return;
            }
            next();
        });
    }, asyncRoute(postDocumentDraft));
    r.post('/conveyors', requireAuth(), requirePermission('conveyors.create'), asyncRoute(postConveyor));
    return r;
}
//# sourceMappingURL=conveyors.routes.js.map