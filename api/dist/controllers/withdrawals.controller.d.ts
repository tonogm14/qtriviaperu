import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
export declare function listWithdrawals(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
export declare function requestWithdrawal(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
export declare function updateWithdrawalStatus(req: Request, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=withdrawals.controller.d.ts.map