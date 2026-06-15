import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { PrismaClient, Prisma } from '@prisma/client';
import { AuthRequest } from '../types';
import { sendBroadcast } from '../services/pushNotifications';

function param(req: Request, key: string): string {
  const val = req.params[key];
  return Array.isArray(val) ? val[0] : (val ?? '');
}

const prisma = new PrismaClient();

const listNotificationsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  unreadOnly: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
});

export async function listNotifications(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = listNotificationsSchema.parse(req.query);
    const { page, limit, unreadOnly } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.NotificationWhereInput = { userId: req.user!.id };
    if (unreadOnly) where.isRead = false;

    const [notifications, total] = await prisma.$transaction([
      prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where }),
    ]);

    res.json({ data: notifications, total, page, limit });
  } catch (err) {
    next(err);
  }
}

export async function markAsRead(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const notifId = param(req as Request, 'id');
    const notification = await prisma.notification.findUnique({
      where: { id: notifId },
    });

    if (!notification) {
      res.status(404).json({ error: 'Notification not found', code: 'NOT_FOUND' });
      return;
    }

    if (notification.userId !== req.user!.id) {
      res.status(403).json({ error: 'Access denied', code: 'FORBIDDEN' });
      return;
    }

    const updated = await prisma.notification.update({
      where: { id: notifId },
      data: { isRead: true },
    });

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
}

export async function markAllAsRead(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { count } = await prisma.notification.updateMany({
      where: { userId: req.user!.id, isRead: false },
      data: { isRead: true },
    });

    res.json({ data: { message: `${count} notifications marked as read` } });
  } catch (err) {
    next(err);
  }
}

const broadcastSchema = z.object({
  title: z.string().min(1).max(100),
  body: z.string().min(1).max(500),
  type: z.enum(['reminder', 'bonus', 'win', 'rank', 'life', 'general']).default('general'),
  target: z.enum(['all', 'game', 'user', 'vip']).default('all'),
  gameId: z.string().optional(),
  userEmail: z.string().email().optional(),
  scheduledFor: z.string().datetime().optional(),
});

async function resolveUserIds(
  target: string,
  gameId?: string,
  userEmail?: string
): Promise<{ userIds: string[]; error?: string }> {
  if (target === 'user') {
    if (!userEmail) return { userIds: [], error: 'Se requiere un email para target=user' };
    const user = await prisma.user.findUnique({ where: { email: userEmail }, select: { id: true } });
    if (!user) return { userIds: [], error: `No existe ningún usuario con el email "${userEmail}"` };
    return { userIds: [user.id] };
  }
  if (target === 'vip') {
    const users = await prisma.user.findMany({ where: { isVip: true }, select: { id: true } });
    return { userIds: users.map((u) => u.id) };
  }
  if (target === 'game') {
    if (!gameId) return { userIds: [] };
    const entries = await prisma.gameEntry.findMany({ where: { gameId }, select: { userId: true } });
    return { userIds: entries.map((e) => e.userId) };
  }
  const users = await prisma.user.findMany({ select: { id: true } });
  return { userIds: users.map((u) => u.id) };
}

export async function broadcastNotification(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { title, body, type, target, gameId, userEmail, scheduledFor } = broadcastSchema.parse(req.body);

    // Validate user email early even for scheduled sends
    if (target === 'user') {
      if (!userEmail) {
        res.status(400).json({ error: 'Se requiere un email para target=user', code: 'MISSING_EMAIL' });
        return;
      }
      const exists = await prisma.user.findUnique({ where: { email: userEmail }, select: { id: true } });
      if (!exists) {
        res.status(404).json({ error: `No existe ningún usuario con el email "${userEmail}"`, code: 'USER_NOT_FOUND' });
        return;
      }
    }

    // If scheduledFor is in the future, save for later delivery
    if (scheduledFor) {
      const fireAt = new Date(scheduledFor);
      if (fireAt > new Date()) {
        await prisma.scheduledNotification.create({
          data: { title, body, type, target, gameId, userEmail, scheduledFor: fireAt },
        });
        res.json({
          data: {
            scheduled: true,
            scheduledFor: fireAt.toISOString(),
            message: `Notificación programada para ${fireAt.toLocaleString('es-PE', { timeZone: 'America/Lima' })}.`,
          },
        });
        return;
      }
    }

    // Immediate send
    const { userIds, error } = await resolveUserIds(target, gameId, userEmail);
    if (error) {
      res.status(400).json({ error, code: 'RESOLVE_ERROR' });
      return;
    }

    if (userIds.length === 0) {
      res.json({ data: { dbSaved: 0, pushSent: 0 } });
      return;
    }

    await prisma.notification.createMany({
      data: userIds.map((userId) => ({ userId, type, title, body, isRead: false })),
      skipDuplicates: false,
    });

    const pushSent = await sendBroadcast(title, body, {
      gameId: target === 'game' ? gameId : undefined,
      data: { type, gameId, userEmail },
    });

    res.json({
      data: {
        scheduled: false,
        dbSaved: userIds.length,
        pushSent,
        message: target === 'user'
          ? `Notificación enviada a ${userEmail} (${pushSent} push enviado).`
          : target === 'vip'
          ? `Notificación enviada a ${userIds.length} usuarios VIP (${pushSent} push enviados).`
          : `Notificación enviada a ${userIds.length} usuarios (${pushSent} push enviados).`,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function listScheduled(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const items = await prisma.scheduledNotification.findMany({
      where: { sentAt: null },
      orderBy: { scheduledFor: 'asc' },
    });
    res.json({ data: items });
  } catch (err) {
    next(err);
  }
}

export async function deleteScheduled(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = param(req as Request, 'id');
    const item = await prisma.scheduledNotification.findUnique({ where: { id } });
    if (!item) {
      res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
      return;
    }
    if (item.sentAt) {
      res.status(400).json({ error: 'Already sent', code: 'ALREADY_SENT' });
      return;
    }
    await prisma.scheduledNotification.delete({ where: { id } });
    res.json({ data: { deleted: true } });
  } catch (err) {
    next(err);
  }
}
