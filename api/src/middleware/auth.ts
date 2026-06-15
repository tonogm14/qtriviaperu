import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AuthRequest } from '../types';
import { Role } from '@prisma/client';
import { hasPermission, isSuperAdmin, Permission } from '../config/permissions';

interface JwtPayload {
  id: string;
  email: string;
  username: string;
  role: Role;
  permissions: string[];
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authorization token required', code: 'MISSING_TOKEN' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
    req.user = {
      id: decoded.id,
      email: decoded.email,
      username: decoded.username,
      role: decoded.role,
      permissions: decoded.permissions ?? [],
    };
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token', code: 'INVALID_TOKEN' });
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required', code: 'UNAUTHENTICATED' });
    return;
  }
  if (req.user.role !== 'ADMIN') {
    res.status(403).json({ error: 'Admin access required', code: 'FORBIDDEN' });
    return;
  }
  next();
}

/** Blocks admin accounts — mobile-only endpoints */
export function requireUser(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required', code: 'UNAUTHENTICATED' });
    return;
  }
  if (req.user.role !== 'USER') {
    res.status(403).json({ error: 'This endpoint is for player accounts only', code: 'FORBIDDEN' });
    return;
  }
  next();
}

/** Allows the resource owner or any admin */
export function requireOwnerOrAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required', code: 'UNAUTHENTICATED' });
    return;
  }
  const resourceId = req.params.id;
  if (req.user.role !== 'ADMIN' && req.user.id !== resourceId) {
    res.status(403).json({ error: 'Access denied', code: 'FORBIDDEN' });
    return;
  }
  next();
}

/**
 * Middleware factory — requires an authenticated ADMIN with a specific permission.
 * Superadmins (empty permissions array) pass automatically.
 */
export function requirePermission(perm: Permission) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required', code: 'UNAUTHENTICATED' });
      return;
    }
    if (req.user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Admin access required', code: 'FORBIDDEN' });
      return;
    }
    if (!hasPermission(req.user.permissions, perm)) {
      res.status(403).json({
        error: `Missing permission: ${perm}`,
        code: 'MISSING_PERMISSION',
      });
      return;
    }
    next();
  };
}
