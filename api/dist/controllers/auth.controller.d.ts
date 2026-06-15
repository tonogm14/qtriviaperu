import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
export declare function register(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function login(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function recover(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function getMe(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
export declare function updateMe(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
export declare function checkAvailability(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function adminLogin(req: Request, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=auth.controller.d.ts.map