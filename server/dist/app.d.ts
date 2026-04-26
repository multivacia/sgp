import { type Express } from 'express';
import type { Logger } from 'pino';
import type pg from 'pg';
import type { Env } from './config/env.js';
export declare function createApp(pool: pg.Pool, logger: Logger, env: Env): Express;
//# sourceMappingURL=app.d.ts.map