import { Response, NextFunction, Request } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../types';
import geoip from 'geoip-lite';

function countryFromIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const clean = ip.startsWith('::ffff:') ? ip.slice(7) : ip;
  const geo = geoip.lookup(clean);
  return geo?.country ?? null;
}

const prisma = new PrismaClient();

const VALID_TYPES = new Set([
  'login', 'logout', 'register', 'profile_update', 'password_change',
  'page_view', 'tap', 'join_game', 'withdrawal_request', 'buy_lives', 'order_merch',
  'push_open', 'notification_view', 'admin_login', 'admin_action', 'unknown',
]);

export async function logBatch(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const events: any[] = Array.isArray(req.body?.events) ? req.body.events.slice(0, 50) : [];

    if (events.length === 0) {
      res.json({ data: { logged: 0 } });
      return;
    }

    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip;
    const now = Date.now();

    await prisma.activityLog.createMany({
      data: events.map((e) => ({
        userId,
        type: VALID_TYPES.has(e.type) ? String(e.type) : 'unknown',
        screen: e.screen ? String(e.screen).slice(0, 80) : null,
        action: e.action ? String(e.action).slice(0, 120) : null,
        meta: e.meta ? JSON.stringify(e.meta).slice(0, 500) : null,
        ip,
        // Honour client timestamp only if it's within the last hour
        createdAt: e.ts && typeof e.ts === 'number' && now - e.ts < 3_600_000
          ? new Date(e.ts)
          : new Date(),
      })),
    });

    res.json({ data: { logged: events.length } });
  } catch (err) {
    next(err);
  }
}

export async function listActivity(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.query.userId as string | undefined;
    const type   = req.query.type   as string | undefined;
    const screen = req.query.screen as string | undefined;
    const from   = req.query.from   as string | undefined;
    const to     = req.query.to     as string | undefined;
    const limit  = Math.min(Number(req.query.limit) || 50, 200);
    const page   = Math.max(Number(req.query.page)  || 1, 1);

    const where: Record<string, any> = {};
    if (userId) where.userId = userId;
    if (type)   where.type   = type;
    if (screen) where.screen = { contains: screen, mode: 'insensitive' };
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to)   where.createdAt.lte = new Date(to);
    }

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, username: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.activityLog.count({ where }),
    ]);

    const enriched = logs.map((l) => ({ ...l, country: countryFromIp(l.ip) }));
    res.json({ data: { logs: enriched, total, page, limit } });
  } catch (err) {
    next(err);
  }
}
