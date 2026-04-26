import type { Request, Response } from 'express';
export declare function getCollaboratorLinkageSummary(req: Request, res: Response): Promise<void>;
export declare function getAdminUsers(req: Request, res: Response): Promise<void>;
export declare function getAdminUserById(req: Request, res: Response): Promise<void>;
export declare function postAdminUser(req: Request, res: Response): Promise<void>;
export declare function patchAdminUser(req: Request, res: Response): Promise<void>;
export declare function postAdminUserActivate(req: Request, res: Response): Promise<void>;
export declare function postAdminUserInactivate(req: Request, res: Response): Promise<void>;
export declare function postAdminUserSoftDelete(req: Request, res: Response): Promise<void>;
export declare function postAdminUserRestore(req: Request, res: Response): Promise<void>;
export declare function postAdminUserForcePasswordChange(req: Request, res: Response): Promise<void>;
export declare function postAdminUserResetPassword(req: Request, res: Response): Promise<void>;
export declare function getEligibleCollaboratorsForLink(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=admin-users.controller.d.ts.map