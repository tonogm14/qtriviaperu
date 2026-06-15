import { Request, Response, NextFunction, RequestHandler } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { PrismaClient, Prisma } from '@prisma/client';
import { sanitizeUser } from '../services/auth.service';
import { getUserLedger as getLedger } from '../services/ledger.service';
import { logActivity } from '../services/activity.service';
import { AuthRequest } from '../types';

function param(req: Request, key: string): string {
  const val = req.params[key];
  return Array.isArray(val) ? val[0] : (val ?? '');
}

const prisma = new PrismaClient();

const listUsersSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['active', 'disabled', 'archived']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().optional(),
  balance: z.number().min(0).optional(),
  lives: z.number().int().min(0).optional(),
  isVip: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isArchived: z.boolean().optional(),
  role: z.enum(['USER', 'ADMIN']).optional(),
  permissions: z.array(z.string()).optional(),
});

const createUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(8),
  role: z.enum(['USER', 'ADMIN']).default('ADMIN'),
  permissions: z.array(z.string()).default([]),
});

export async function createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = createUserSchema.parse(req.body);
    const hashedPassword = await bcrypt.hash(body.password, 12);
    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        username: body.username,
        password: hashedPassword,
        role: body.role,
        permissions: body.permissions,
      },
    });
    res.status(201).json({ data: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
}

export async function getUsersStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const [totalAdmins, totalUsers, newToday] = await prisma.$transaction([
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.user.count({ where: { role: 'USER' } }),
      prisma.user.count({ where: { role: 'USER', createdAt: { gte: todayStart } } }),
    ])

    res.json({ data: { totalAdmins, totalUsers, newToday } })
  } catch (err) {
    next(err)
  }
}

export async function listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = listUsersSchema.parse(req.query);
    const { page, limit, search, status } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};
    if (status === 'active')   { where.isActive = true;  where.isArchived = false; }
    if (status === 'disabled') { where.isActive = false; where.isArchived = false; }
    if (status === 'archived') { where.isArchived = true; }
    if (!status)               { where.isArchived = false; } // default: hide archived
    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [rawUsers, total] = await prisma.$transaction([
      prisma.user.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.user.count({ where }),
    ]);

    const users = rawUsers.map(sanitizeUser);

    res.json({ data: users, total, page, limit });
  } catch (err) {
    next(err);
  }
}

export async function getUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await prisma.user.findUnique({ where: { id: param(req, 'id') } });
    if (!user) {
      res.status(404).json({ error: 'User not found', code: 'NOT_FOUND' });
      return;
    }
    res.json({ data: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
}

export async function updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = updateUserSchema.parse(req.body);
    const targetId = param(req, 'id');
    const adminId = (req as AuthRequest).user?.id;
    const user = await prisma.user.update({
      where: { id: targetId },
      data: body,
    });
    if (adminId) {
      logActivity({ userId: adminId, type: 'admin_action', action: `Editó perfil del usuario ${user.username}`, meta: { targetId, fields: Object.keys(body) } });
    }
    res.json({ data: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
}

export const savePushToken: RequestHandler = async (req, res, next) => {
  try {
    const userId = (req as AuthRequest).user!.id;
    const { token } = z.object({ token: z.string().min(1) }).parse(req.body);

    await prisma.user.update({
      where: { id: userId },
      data: { pushToken: token },
    });

    res.json({ data: { success: true } });
  } catch (err) {
    next(err);
  }
};

export async function updatePermissions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { permissions } = z.object({
      permissions: z.array(z.string()),
    }).parse(req.body);

    const user = await prisma.user.update({
      where: { id: param(req, 'id') },
      data: { permissions },
    });
    res.json({ data: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
}

export async function getUserStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = param(req, 'id');

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ error: 'User not found', code: 'NOT_FOUND' });
      return;
    }

    const [totalEntries, wins, totalPrize] = await Promise.all([
      prisma.gameEntry.count({ where: { userId } }),
      prisma.gameEntry.count({ where: { userId, prize: { gt: 0 } } }),
      prisma.gameEntry.aggregate({
        where: { userId },
        _sum: { prize: true },
      }),
    ]);

    const recentGames = await prisma.gameEntry.findMany({
      where: { userId },
      orderBy: { joinedAt: 'desc' },
      take: 5,
      include: {
        game: { select: { id: true, title: true, scheduledAt: true, status: true } },
      },
    });

    res.json({
      data: {
        userId,
        gamesPlayed: totalEntries,
        gamesWon: wins,
        totalPrizes: totalPrize._sum?.prize ?? 0,
        winRate: totalEntries > 0 ? ((wins / totalEntries) * 100).toFixed(1) : '0.0',
        recentGames: recentGames.map((e) => ({
          gameId: e.gameId,
          title: e.game.title,
          scheduledAt: e.game.scheduledAt,
          status: e.game.status,
          score: e.score,
          isAlive: e.isAlive,
          prize: e.prize,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getUserLedger(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = param(req, 'id');
    const page  = Math.max(1, parseInt(String(req.query.page  ?? '1'),  10));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '30'), 10)));
    const result = await getLedger(userId, page, limit);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}
