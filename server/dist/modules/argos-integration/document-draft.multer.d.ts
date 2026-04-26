import type { NextFunction, Request, Response } from 'express';
import type { Env } from '../../config/env.js';
export declare function documentDraftMulter(env: Env): import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
export declare function documentDraftMulterErrorHandler(err: unknown, _req: Request, _res: Response, next: NextFunction): void;
//# sourceMappingURL=document-draft.multer.d.ts.map