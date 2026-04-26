import type { Request, Response } from 'express';
export declare function getMyActivities(req: Request, res: Response): Promise<void>;
/**
 * Mesma carga que GET /collaborators/:id/operational-journey, mas o colaborador
 * vem exclusivamente da sessão (sem path/query de id).
 */
export declare function getMyOperationalJourney(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=my-activities.controller.d.ts.map