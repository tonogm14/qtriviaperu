import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { config } from '../config';

const prisma = new PrismaClient();

const LIMA_TZ = config.timezone;

const leaderboardSchema = z.object({
  period: z.enum(['today', 'week', 'month', 'all']).default('all'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

function getPeriodRange(period: string): { gte?: Date; lte?: Date } {
  if (period === 'all') return {};

  const nowUtc = new Date();
  const nowLima = toZonedTime(nowUtc, LIMA_TZ);

  let startLima: Date;
  let endLima: Date;

  switch (period) {
    case 'today':
      startLima = startOfDay(nowLima);
      endLima = endOfDay(nowLima);
      break;
    case 'week':
      startLima = startOfWeek(nowLima, { weekStartsOn: 1 }); // Monday
      endLima = endOfWeek(nowLima, { weekStartsOn: 1 });
      break;
    case 'month':
      startLima = startOfMonth(nowLima);
      endLima = endOfMonth(nowLima);
      break;
    default:
      return {};
  }

  return {
    gte: fromZonedTime(startLima, LIMA_TZ),
    lte: fromZonedTime(endLima, LIMA_TZ),
  };
}

export async function getLeaderboard(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = leaderboardSchema.parse(req.query);
    const { period, page, limit } = query;
    const skip = (page - 1) * limit;

    const range = getPeriodRange(period);

    // Prize aggregation per user for the period (only won prizes)
    const prizeWhere: Record<string, unknown> = { prize: { gt: 0 } };
    if (range.gte || range.lte) prizeWhere.joinedAt = range;

    const [allUsers, prizeAgg] = await Promise.all([
      prisma.user.findMany({
        select: { id: true, username: true, name: true, isVip: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.gameEntry.groupBy({
        by: ['userId'],
        where: prizeWhere,
        _sum: { prize: true },
        _count: { id: true },
      }),
    ]);

    const prizeMap = new Map(prizeAgg.map((r) => [r.userId, r]));

    // Merge all users with their prize data, sort by totalPrize desc then by registration (asc)
    const sorted = allUsers
      .map((u) => ({
        userId: u.id,
        username: u.username,
        name: u.name,
        isVip: u.isVip,
        totalPrize: prizeMap.get(u.id)?._sum?.prize ?? 0,
        gamesWon: prizeMap.get(u.id)?._count?.id ?? 0,
      }))
      .sort((a, b) => b.totalPrize - a.totalPrize);

    const total = sorted.length;
    const leaderboard = sorted.slice(skip, skip + limit).map((entry, idx) => ({
      rank: skip + idx + 1,
      ...entry,
    }));

    res.json({ data: leaderboard, total, page, limit, period });
  } catch (err) {
    next(err);
  }
}
