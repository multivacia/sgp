import { ZodError } from 'zod';
import { AppError } from './AppError.js';
import { ErrorCodes } from './errorCodes.js';
/** Caminho legível tipo `options[0].areas[1].steps[2].orderIndex` (sem stack). */
function formatZodIssuePath(path) {
    let s = '';
    for (const seg of path) {
        if (typeof seg === 'number')
            s += `[${seg}]`;
        else
            s += s === '' ? seg : `.${seg}`;
    }
    return s;
}
function firstZodIssueUserMessage(err) {
    const issue = err.issues[0];
    if (!issue)
        return 'Dados inválidos.';
    const pathStr = formatZodIssuePath(issue.path);
    const prefix = pathStr ? `Campo inválido: ${pathStr}. ` : '';
    return `${prefix}${issue.message}`.trim();
}
export function errorHandler(logger) {
    return (err, _req, res, _next) => {
        if (err instanceof ZodError) {
            const message = firstZodIssueUserMessage(err);
            logger.warn({ issues: err.issues.map((i) => ({ path: i.path, message: i.message })) }, 'validation failed');
            res.status(422).json({
                error: {
                    code: ErrorCodes.VALIDATION_ERROR,
                    message,
                    details: err.flatten(),
                },
            });
            return;
        }
        if (err instanceof AppError) {
            res.status(err.statusCode).json({
                error: {
                    code: err.code,
                    message: err.message,
                    ...(err.details !== undefined ? { details: err.details } : {}),
                },
            });
            return;
        }
        logger.error({ err }, 'unhandled error');
        res.status(500).json({
            error: {
                code: ErrorCodes.INTERNAL,
                message: 'Serviço temporariamente indisponível. Tente novamente em instantes.',
            },
        });
    };
}
//# sourceMappingURL=errorHandler.js.map