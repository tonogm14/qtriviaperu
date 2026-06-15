import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
export declare function listNotifications(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
export declare function markAsRead(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
export declare function markAllAsRead(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
export declare function broadcastNotification(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
export declare function listScheduled(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
export declare function deleteScheduled(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=notifications.controller.d.ts.map