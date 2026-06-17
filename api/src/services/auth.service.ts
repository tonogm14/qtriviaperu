import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient, User } from '@prisma/client';
import { config } from '../config';
import { AppError } from '../middleware/errorHandler';
import { logActivity } from './activity.service';

const prisma = new PrismaClient();

export type SafeUser = Omit<User, 'password'>;

export function generateToken(user: SafeUser): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      permissions: user.permissions,
    },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn } as jwt.SignOptions
  );
}

export function sanitizeUser(user: User): SafeUser {
  const { password: _password, ...safeUser } = user;
  return safeUser;
}

export async function registerUser(data: {
  name: string;
  email: string;
  username: string;
  password: string;
  phone?: string;
}): Promise<{ token: string; user: SafeUser }> {
  const hashedPassword = await bcrypt.hash(data.password, 12);

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email.toLowerCase(),
      username: data.username.toLowerCase(),
      password: hashedPassword,
      phone: data.phone,
    },
  });

  const safeUser = sanitizeUser(user);
  const token = generateToken(safeUser);

  logActivity({ userId: user.id, type: 'register', action: 'Cuenta creada' });

  return { token, user: safeUser };
}

export async function checkAvailability(data: {
  email?: string;
  username?: string;
}): Promise<{ emailTaken: boolean; usernameTaken: boolean }> {
  const [emailUser, usernameUser] = await Promise.all([
    data.email ? prisma.user.findUnique({ where: { email: data.email.toLowerCase() } }) : null,
    data.username ? prisma.user.findUnique({ where: { username: data.username.toLowerCase() } }) : null,
  ]);
  return { emailTaken: !!emailUser, usernameTaken: !!usernameUser };
}

export async function loginUser(data: {
  email: string;
  password: string;
}): Promise<{ token: string; user: SafeUser }> {
  const identifier = data.email.toLowerCase();
  const user = await prisma.user.findFirst({
    where: { OR: [{ email: identifier }, { username: identifier }] },
  });

  if (!user) {
    throw new AppError('Usuario o clave inválidos', 401, 'INVALID_CREDENTIALS');
  }

  const isPasswordValid = await bcrypt.compare(data.password, user.password);
  if (!isPasswordValid) {
    throw new AppError('Usuario o clave inválidos', 401, 'INVALID_CREDENTIALS');
  }

  if (user.isArchived) {
    throw new AppError('Cuenta eliminada', 403, 'ACCOUNT_ARCHIVED');
  }
  if (!user.isActive) {
    throw new AppError('Cuenta deshabilitada. Contacta al soporte.', 403, 'ACCOUNT_DISABLED');
  }

  const safeUser = sanitizeUser(user);
  const token = generateToken(safeUser);

  logActivity({ userId: user.id, type: 'login', action: 'Inicio de sesión' });

  return { token, user: safeUser };
}

export async function getUserById(id: string): Promise<SafeUser | null> {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return null;
  return sanitizeUser(user);
}

export async function updateUserProfile(
  id: string,
  data: {
    name?: string;
    phone?: string;
    username?: string;
    password?: string;
    avatarUrl?: string;
  }
): Promise<SafeUser> {
  const updateData: Partial<User> = {};

  if (data.name) updateData.name = data.name;
  if (data.phone) updateData.phone = data.phone;
  if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;
  if (data.username) {
    const newUsername = data.username.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { username: newUsername } });
    if (existing && existing.id !== id) {
      throw new AppError('Ese nombre de usuario ya está en uso', 400, 'USERNAME_TAKEN');
    }
    updateData.username = newUsername;
  }
  if (data.password) {
    updateData.password = await bcrypt.hash(data.password, 12);
  }

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
  });

  const actionType = data.password ? 'password_change' : 'profile_update';
  const actionLabel = data.password ? 'Contraseña actualizada' : 'Perfil actualizado';
  logActivity({ userId: id, type: actionType, action: actionLabel });

  return sanitizeUser(user);
}

export async function loginOrRegisterWithGoogle(googleUser: {
  email: string;
  name: string;
  picture?: string;
}): Promise<{ token: string; user: SafeUser }> {
  let user = await prisma.user.findUnique({ where: { email: googleUser.email.toLowerCase() } });

  if (!user) {
    // Generate a unique username from name
    const base = googleUser.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 20) || 'user';
    let username = base;
    let suffix = 1;
    while (await prisma.user.findUnique({ where: { username } })) {
      username = `${base}${suffix++}`;
    }

    user = await prisma.user.create({
      data: {
        email: googleUser.email.toLowerCase(),
        name: googleUser.name,
        username,
        password: await bcrypt.hash(Math.random().toString(36), 12),
        avatarUrl: googleUser.picture ?? null,
      },
    });

    logActivity({ userId: user.id, type: 'register', action: 'Cuenta creada vía Google' });
  } else {
    // Update avatar from Google if user has none
    if (!user.avatarUrl && googleUser.picture) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { avatarUrl: googleUser.picture },
      });
    }
    logActivity({ userId: user.id, type: 'login', action: 'Inicio de sesión vía Google' });
  }

  const safeUser = sanitizeUser(user);
  const token = generateToken(safeUser);
  return { token, user: safeUser };
}
