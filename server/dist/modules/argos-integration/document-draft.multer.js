import multer from 'multer';
import { AppError } from '../../shared/errors/AppError.js';
import { ErrorCodes } from '../../shared/errors/errorCodes.js';
export function documentDraftMulter(env) {
    return multer({
        storage: multer.memoryStorage(),
        limits: { fileSize: env.documentDraftMaxFileBytes },
    }).single('file');
}
export function documentDraftMulterErrorHandler(err, _req, _res, next) {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        next(new AppError('Ficheiro excede o tamanho máximo permitido.', 413, ErrorCodes.VALIDATION_ERROR));
        return;
    }
    next(err);
}
//# sourceMappingURL=document-draft.multer.js.map