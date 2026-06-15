"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSummary = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const getSummary = async (req, res, next) => {
    try {
        const days = parseInt(String(req.query.days ?? '7'), 10) || 7;
        const since = new Date();
        since.setDate(since.getDate() - days);
        const [totalUsers, totalGames, totalPrizes, pendingWithdrawals,] = await Promise.all([
            prisma.user.count({ where: { role: 'USER', isArchived: false } }),
            prisma.game.count(),
            prisma.withdrawal.aggregate({ where: { status: 'DONE' }, _sum: { amount: true } }),
            prisma.withdrawal.count({ where: { status: 'PENDING' } }),
        ]);
        // Daily prizes paid (finished game entries with prizes, grouped by date)
        const dailyEntries = await prisma.gameEntry.findMany({
            where: { prize: { gt: 0 }, game: { status: 'FINISHED', scheduledAt: { gte: since } } },
            include: { game: { select: { scheduledAt: true, title: true } } },
        });
        const dailyMap = {};
        const dailyGamesMap = {};
        for (const e of dailyEntries) {
            const day = e.game.scheduledAt.toISOString().slice(0, 10);
            dailyMap[day] = (dailyMap[day] ?? 0) + (e.prize ?? 0);
            dailyGamesMap[day] = (dailyGamesMap[day] ?? 0) + 1;
        }
        const dailyPrizes = Object.entries(dailyMap)
            .map(([day, prize]) => ({
            day: day.slice(5).replace('-', '/'), // "05/04"
            prize,
            games: dailyGamesMap[day] ?? 0,
        }))
            .sort((a, b) => a.day.localeCompare(b.day));
        // User growth — new registrations per day (last N days)
        const newUsers = await prisma.user.findMany({
            where: { role: 'USER', createdAt: { gte: since } },
            select: { createdAt: true },
        });
        const userGrowthMap = {};
        for (const u of newUsers) {
            const day = u.createdAt.toISOString().slice(0, 10);
            userGrowthMap[day] = (userGrowthMap[day] ?? 0) + 1;
        }
        const userGrowth = Object.entries(userGrowthMap)
            .map(([day, count]) => ({ day: day.slice(5).replace('-', '/'), count }))
            .sort((a, b) => a.day.localeCompare(b.day));
        // Withdrawal by method
        const withdrawalsByMethod = await prisma.withdrawal.groupBy({
            by: ['method'],
            where: { status: 'DONE' },
            _sum: { amount: true },
            _count: { id: true },
        });
        const byMethod = withdrawalsByMethod.map((m) => ({
            method: m.method,
            total: m._sum.amount ?? 0,
            count: m._count.id,
        }));
        // Top winners (by total prize across all game entries)
        const winnerAgg = await prisma.gameEntry.groupBy({
            by: ['userId'],
            where: { prize: { gt: 0 } },
            _sum: { prize: true },
            _count: { id: true },
            orderBy: { _sum: { prize: 'desc' } },
            take: 10,
        });
        const winnerIds = winnerAgg.map((w) => w.userId);
        const winnerUsers = await prisma.user.findMany({
            where: { id: { in: winnerIds } },
            select: { id: true, username: true, name: true },
        });
        const winnerMap = {};
        for (const u of winnerUsers)
            winnerMap[u.id] = u;
        const topWinners = winnerAgg.map((w) => ({
            userId: w.userId,
            username: winnerMap[w.userId]?.username ?? '—',
            name: winnerMap[w.userId]?.name ?? '—',
            wins: w._count.id,
            total: w._sum.prize ?? 0,
        }));
        res.json({
            data: {
                totalUsers,
                totalGames,
                totalPrizesPaid: totalPrizes._sum.amount ?? 0,
                pendingWithdrawals,
                dailyPrizes,
                userGrowth,
                byMethod,
                topWinners,
            },
        });
    }
    catch (err) {
        next(err);
    }
};
exports.getSummary = getSummary;
//# sourceMappingURL=metrics.controller.js.map