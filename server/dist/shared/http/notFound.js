import { ErrorCodes } from '../errors/errorCodes.js';
/** Rotas não registradas: envelope alinhado ao restante da API. */
export function notFoundHandler(_req, res) {
    if (res.headersSent)
        return;
    res.status(404).json({
        error: {
            code: ErrorCodes.ROUTE_NOT_FOUND,
            message: 'Rota não encontrada.',
            details: {},
        },
    });
}
//# sourceMappingURL=notFound.js.map