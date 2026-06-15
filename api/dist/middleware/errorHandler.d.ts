import { Request, Response, NextFunction } from 'express';
export declare function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void;
export declare class AppError extends Error {
    statusCode: number;
    code: string;
    constructor(message: string, statusCode?: number, code?: string);
}
//# sourceMappingURL=errorHandler.d.ts.map