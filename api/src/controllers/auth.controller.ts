import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as authService from '../services/auth.service';
import { AuthRequest } from '../types';
import { logActivity } from '../services/activity.service';
import { bindDevice } from '../services/device.service';

const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: z.string().min(8),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
});

const recoverSchema = z.object({
  email: z.string().email(),
});

const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().optional(),
  password: z.string().min(8).optional(),
});

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = registerSchema.parse(req.body);
    const result = await authService.registerUser(body);
    const deviceId = req.headers['x-device-id'] as string | undefined;
    const platform = req.headers['x-platform'] as string | undefined;
    if (deviceId) bindDevice(result.user.id, deviceId, platform).catch(() => {});
    res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = loginSchema.parse(req.body);
    const result = await authService.loginUser(body);
    const deviceId = req.headers['x-device-id'] as string | undefined;
    const platform = req.headers['x-platform'] as string | undefined;
    if (deviceId) bindDevice(result.user.id, deviceId, platform).catch(() => {});
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function recover(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    recoverSchema.parse(req.body);
    // In production, send email with reset link
    // For now return a generic success response to avoid enumeration
    res.json({ data: { message: 'If an account with that email exists, a recovery link has been sent.' } });
  } catch (err) {
    next(err);
  }
}

export async function getMe(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await authService.getUserById(req.user!.id);
    if (!user) {
      res.status(404).json({ error: 'User not found', code: 'NOT_FOUND' });
      return;
    }
    res.json({ data: user });
  } catch (err) {
    next(err);
  }
}

export async function updateMe(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = updateProfileSchema.parse(req.body);
    const user = await authService.updateUserProfile(req.user!.id, body);
    res.json({ data: user });
  } catch (err) {
    next(err);
  }
}

export async function checkAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, username } = req.query as { email?: string; username?: string };
    const result = await authService.checkAvailability({ email, username });
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function adminLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = loginSchema.parse(req.body);
    const result = await authService.loginUser(body);
    if (result.user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Esta cuenta no tiene permisos de administrador.', code: 'NOT_ADMIN' });
      return;
    }
    logActivity({ userId: result.user.id, type: 'admin_login', action: 'Inicio de sesión en el panel de administración' });
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}
