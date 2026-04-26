import type pg from 'pg';
import type { Env } from '../../config/env.js';
import type { AuthMeUser } from './auth.types.js';
export declare function serviceLogin(pool: pg.Pool, env: Env, email: string, password: string): Promise<{
    user: AuthMeUser;
    token: string;
}>;
export declare function serviceGetMe(pool: pg.Pool, userId: string): Promise<AuthMeUser>;
export declare function serviceChangePassword(pool: pg.Pool, userId: string, currentPassword: string, newPassword: string): Promise<AuthMeUser>;
//# sourceMappingURL=auth.service.d.ts.map