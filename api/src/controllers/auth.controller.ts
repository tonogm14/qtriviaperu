import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import path from 'path';
import fs from 'fs';
import https from 'https';
import multer from 'multer';
import * as authService from '../services/auth.service';
import { AuthRequest } from '../types';
import { logActivity } from '../services/activity.service';
import { bindDevice } from '../services/device.service';

const AVATARS_DIR = path.join(__dirname, '../../uploads/avatars');
if (!fs.existsSync(AVATARS_DIR)) fs.mkdirSync(AVATARS_DIR, { recursive: true });

export const avatarUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, AVATARS_DIR),
    filename: (req, _file, cb) => {
      const userId = (req as AuthRequest).user!.id;
      const ext = path.extname(_file.originalname).toLowerCase() || '.jpg';
      cb(null, `${userId}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Solo imágenes JPEG, PNG, WebP o GIF'));
  },
}).single('avatar');

const passwordSchema = z.string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .regex(/[A-Z]/, 'Debe tener al menos una letra mayúscula')
  .regex(/[0-9]/, 'Debe tener al menos un número')
  .regex(/[^a-zA-Z0-9]/, 'Debe tener al menos un carácter especial');

const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: passwordSchema,
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
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/).optional(),
  password: passwordSchema.optional(),
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

export async function googleLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { accessToken } = z.object({ accessToken: z.string().min(1) }).parse(req.body);

    const googleUser = await new Promise<{ email: string; name: string; picture?: string }>((resolve, reject) => {
      const request = https.get(
        `https://www.googleapis.com/oauth2/v3/userinfo`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
        (r) => {
          let body = '';
          r.on('data', (chunk: string) => { body += chunk; });
          r.on('end', () => {
            try {
              const data = JSON.parse(body);
              if (!data.email) { reject(new Error('Token de Google inválido')); return; }
              resolve({ email: data.email, name: data.name ?? data.email, picture: data.picture });
            } catch {
              reject(new Error('Respuesta de Google inválida'));
            }
          });
        }
      );
      request.on('error', reject);
    });

    const result = await authService.loginOrRegisterWithGoogle(googleUser);
    const deviceId = req.headers['x-device-id'] as string | undefined;
    const platform = req.headers['x-platform'] as string | undefined;
    if (deviceId) bindDevice(result.user.id, deviceId, platform).catch(() => {});
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function uploadAvatar(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) { res.status(400).json({ error: 'No se recibió imagen' }); return; }

    const userId = req.user!.id;

    // Remove old avatar if it was a local upload (not a Google URL)
    const existing = await authService.getUserById(userId);
    if (existing?.avatarUrl && existing.avatarUrl.startsWith('/uploads/')) {
      const oldPath = path.join(AVATARS_DIR, path.basename(existing.avatarUrl));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const avatarUrl = `/uploads/avatars/${file.filename}`;
    const user = await authService.updateUserProfile(userId, { avatarUrl });
    res.json({ data: { avatarUrl, user } });
  } catch (err) {
    next(err);
  }
}
