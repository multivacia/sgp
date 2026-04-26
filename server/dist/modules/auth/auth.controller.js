import { AppError } from '../../shared/errors/AppError.js';
import { ErrorCodes } from '../../shared/errors/errorCodes.js';
import { ok } from '../../shared/http/ok.js';
import { changePasswordBodySchema, loginBodySchema } from './auth.schemas.js';
import { signSessionToken } from './auth.jwt.js';
import { serviceChangePassword, serviceGetMe, serviceLogin } from './auth.service.js';
function getEnv(req) {
    return req.app.locals.env;
}
function cookieOptions(env) {
    const maxAgeMs = env.jwtExpiresDays * 24 * 60 * 60 * 1000;
    return {
        httpOnly: true,
        sameSite: 'lax',
        secure: env.nodeEnv === 'production',
        path: '/',
        maxAge: maxAgeMs,
    };
}
export async function postLogin(req, res) {
    const pool = req.app.locals.pool;
    const env = getEnv(req);
    const logger = req.app.locals.logger;
    const body = loginBodySchema.parse(req.body);
    try {
        const { user, token } = await serviceLogin(pool, env, body.email, body.password);
        res.cookie(env.authCookieName, token, cookieOptions(env));
        res.status(200).json(ok({ user }));
    }
    catch (e) {
        if (e instanceof AppError) {
            if (e.statusCode === 401) {
                logger.warn({ code: e.code }, 'auth_login_denied');
            }
            else if (e.statusCode === 403) {
                logger.warn({ code: e.code }, e.code === ErrorCodes.ACCOUNT_TEMPORARILY_LOCKED
                    ? 'auth_login_temporarily_locked'
                    : 'auth_login_inactive');
            }
        }
        throw e;
    }
}
export async function postLogout(req, res) {
    const env = getEnv(req);
    res.clearCookie(env.authCookieName, {
        httpOnly: true,
        sameSite: 'lax',
        secure: env.nodeEnv === 'production',
        path: '/',
    });
    res.status(204).end();
}
export async function getMe(req, res) {
    const pool = req.app.locals.pool;
    const logger = req.app.locals.logger;
    try {
        const user = await serviceGetMe(pool, req.authUser.id);
        res.json(ok({ user }));
    }
    catch (e) {
        if (e instanceof AppError && e.statusCode === 403) {
            logger.warn({ code: e.code }, 'auth_me_inactive');
        }
        throw e;
    }
}
export async function postChangePassword(req, res) {
    const pool = req.app.locals.pool;
    const env = getEnv(req);
    const body = changePasswordBodySchema.parse(req.body);
    const user = await serviceChangePassword(pool, req.authUser.id, body.currentPassword, body.newPassword);
    const pwdStampMs = user.passwordChangedAt != null
        ? Date.parse(user.passwordChangedAt)
        : 0;
    const token = signSessionToken(user.userId, user.email, pwdStampMs, env);
    res.cookie(env.authCookieName, token, cookieOptions(env));
    res.json(ok({ user }));
}
//# sourceMappingURL=auth.controller.js.map