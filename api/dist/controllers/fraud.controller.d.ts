import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
export declare function getFlaggedUsers(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
export declare function getSharedDevicesHandler(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
export declare function unflagUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
export declare function banUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
export declare function getUserDevices(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=fraud.controller.d.ts.map