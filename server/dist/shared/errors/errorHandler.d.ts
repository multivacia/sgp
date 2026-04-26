import type { NextFunction, Request, Response } from 'express';
import type { Logger } from 'pino';
export declare function errorHandler(logger: Logger): (err: unknown, _req: Request, res: Response, _next: NextFunction) => void;
//# sourceMappingURL=errorHandler.d.ts.map