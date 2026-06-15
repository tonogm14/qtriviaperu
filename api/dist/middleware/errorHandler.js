"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
exports.errorHandler = errorHandler;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
function errorHandler(err, req, res, 
// eslint-disable-next-line @typescript-eslint/no-unused-vars
_next) {
    console.error('[Error]', err);
    // Zod validation errors
    if (err instanceof zod_1.ZodError) {
        res.status(400).json({
            error: 'Validation error',
            code: 'VALIDATION_ERROR',
            details: err.errors.map((e) => ({
                field: e.path.join('.'),
                message: e.message,
            })),
        });
        return;
    }
    // Prisma errors
    if (err instanceof client_1.Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2002') {
            const fields = err.meta?.target ?? [];
            res.status(409).json({
                error: `A record with this ${fields.join(', ')} already exists`,
                code: 'DUPLICATE_RECORD',
            });
            return;
        }
        if (err.code === 'P2025') {
            res.status(404).json({
                error: 'Record not found',
                code: 'NOT_FOUND',
            });
            return;
        }
    }
    // Custom app errors
    if (err instanceof AppError) {
        res.status(err.statusCode).json({
            error: err.message,
            code: err.code,
        });
        return;
    }
    // Generic error
    if (err instanceof Error) {
        res.status(500).json({
            error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
            code: 'INTERNAL_ERROR',
        });
        return;
    }
    res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
    });
}
class AppError extends Error {
    constructor(message, statusCode = 500, code = 'APP_ERROR') {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.name = 'AppError';
    }
}
exports.AppError = AppError;
//# sourceMappingURL=errorHandler.js.map