import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { Permission } from '../config/permissions';
export declare function authenticate(req: AuthRequest, res: Response, next: NextFunction): void;
export declare function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void;
/** Blocks admin accounts — mobile-only endpoints */
export declare function requireUser(req: AuthRequest, res: Response, next: NextFunction): void;
/** Allows the resource owner or any admin */
export declare function requireOwnerOrAdmin(req: AuthRequest, res: Response, next: NextFunction): void;
/**
 * Middleware factory — requires an authenticated ADMIN with a specific permission.
 * Superadmins (empty permissions array) pass automatically.
 */
export declare function requirePermission(perm: Permission): (req: AuthRequest, res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.d.ts.map