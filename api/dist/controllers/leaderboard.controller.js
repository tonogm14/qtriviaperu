"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLeaderboard = getLeaderboard;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
const date_fns_tz_1 = require("date-fns-tz");
const date_fns_1 = require("date-fns");
const config_1 = require("../config");
const prisma = new client_1.PrismaClient();
const LIMA_TZ = config_1.config.timezone;
const leaderboardSchema = zod_1.z.object({
    period: zod_1.z.enum(['today', 'week', 'month', 'all']).default('all'),
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().positive().max(100).default(20),
});
function getPeriodRange(period) {
    if (period === 'all')
        return {};
    const nowUtc = new Date();
    const nowLima = (0, date_fns_tz_1.toZonedTime)(nowUtc, LIMA_TZ);
    let startLima;
    let endLima;
    switch (period) {
        case 'today':
            startLima = (0, date_fns_1.startOfDay)(nowLima);
            endLima = (0, date_fns_1.endOfDay)(nowLima);
            break;
        case 'week':
            startLima = (0, date_fns_1.startOfWeek)(nowLima, { weekStartsOn: 1 }); // Monday
            endLima = (0, date_fns_1.endOfWeek)(nowLima, { weekStartsOn: 1 });
            break;
        case 'month':
            startLima = (0, date_fns_1.startOfMonth)(nowLima);
            endLima = (0, date_fns_1.endOfMonth)(nowLima);
            break;
        default:
            return {};
    }
    return {
        gte: (0, date_fns_tz_1.fromZonedTime)(startLima, LIMA_TZ),
        lte: (0, date_fns_tz_1.fromZonedTime)(endLima, LIMA_TZ),
    };
}
async function getLeaderboard(req, res, next) {
    try {
        const query = leaderboardSchema.parse(req.query);
        const { period, page, limit } = query;
        const skip = (page - 1) * limit;
        const range = getPeriodRange(period);
        // Aggregate prize per user within the period
        const gameEntryWhere = {
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
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=leaderboard.controller.js.map