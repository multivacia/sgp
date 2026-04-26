import { ErrorCodes } from './errorCodes.js';
type Code = (typeof ErrorCodes)[keyof typeof ErrorCodes] | string;
export declare class AppError extends Error {
    readonly statusCode: number;
    readonly code: Code;
    readonly details?: unknown;
    constructor(message: string, statusCode: number, code: Code, details?: unknown);
}
export {};
//# sourceMappingURL=AppError.d.ts.map