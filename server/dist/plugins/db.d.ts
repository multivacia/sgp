import pg from 'pg';
import type { Env } from '../config/env.js';
export declare function getPool(env: Env): pg.Pool;
export declare function closePool(): Promise<void>;
//# sourceMappingURL=db.d.ts.map