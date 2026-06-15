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

    // Aggregate prize per user within the period
    const gameEntryWhere: Record<string, unknown> = {
      prize: { gt: 0 },
    };

    if (range.gte || range.lte) {
      gameEntryWhere.joinedAt = range;
    }

    // Get aggregated prize per user
    const prizeAgg = await prisma.gameEntry.groupBy({
      by: ['userId'],
      where: gameEntryWhere,
      _sum: { prize: true },
      _count: { id: true },
      orderBy: { _sum: { prize: 'desc' } },
      skip,
      take: limit,
    });

    // Get total distinct users who have won
    const totalCount = await prisma.gameEntry.groupBy({
      by: ['userId'],
      where: gameEntryWhere,
      _sum: { prize: true },
    });

    // Fetch user details
    const userIds = prizeAgg.map((r) => r.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, name: true, isVip: true },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    const leaderboard = prizeAgg.map((entry, idx) => {
      const user = userMap.get(entry.userId);
      return {
        rank: skip + idx + 1,
        userId: entry.userId,
        username: user?.username ?? 'Unknown',
        name: user?.name ?? 'Unknown',
        isVip: user?.isVip ?? false,
        totalPrize: entry._sum.prize ?? 0,
        gamesPlayed: entry._count.id,
      };
    });

    res.json({
      data: leaderboard,
      total: totalCount.length,
      page,
      limit,
      period,
    });
  } catch (err) {
    next(err);
  }
}
