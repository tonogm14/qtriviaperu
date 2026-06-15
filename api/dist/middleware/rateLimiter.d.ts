import { Request, Response, NextFunction } from 'express';
export declare function rateLimit(opts: {
    max: number;
    windowMs: number;
    keyFn?: (req: Request) => string;
    message?: string;
}): (req: Request, res: Response, next: NextFunction) => void;
export declare const loginLimiter: (req: Request, res: Response, next: NextFunction) => void;
export declare const registerLimiter: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=rateLimiter.d.ts.map