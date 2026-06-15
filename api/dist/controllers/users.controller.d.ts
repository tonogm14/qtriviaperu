import { Request, Response, NextFunction, RequestHandler } from 'express';
export declare function createUser(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function getUsersStats(_req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function listUsers(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function getUser(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function updateUser(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare const savePushToken: RequestHandler;
export declare function updatePermissions(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function getUserStats(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function getUserLedger(req: Request, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=users.controller.d.ts.map