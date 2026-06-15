"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logBatch = logBatch;
exports.listActivity = listActivity;
const client_1 = require("@prisma/client");
const geoip_lite_1 = __importDefault(require("geoip-lite"));
function countryFromIp(ip) {
    if (!ip)
        return null;
    const clean = ip.startsWith('::ffff:') ? ip.slice(7) : ip;
    const geo = geoip_lite_1.default.lookup(clean);
    return geo?.country ?? null;
}
const prisma = new client_1.PrismaClient();
const VALID_TYPES = new Set([
    'login', 'logout', 'register', 'profile_update', 'password_change',
    'page_view', 'tap', 'join_game', 'withdrawal_request', 'buy_lives', 'order_merch',
    'push_open', 'notification_view', 'admin_login', 'admin_action', 'unknown',
]);
async function logBatch(req, res, next) {
    try {
        const userId = req.user.id;
        const events = Array.isArray(req.body?.events) ? req.body.events.slice(0, 50) : [];
        if (events.length === 0) {
            res.json({ data: { logged: 0 } });
            return;
        }
        const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
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
                createdAt: e.ts && typeof e.ts === 'number' && now - e.ts < 3600000
                    ? new Date(e.ts)
                    : new Date(),
            })),
        });
        res.json({ data: { logged: events.length } });
    }
    catch (err) {
        next(err);
    }
}
async function listActivity(req, res, next) {
    try {
        const userId = req.query.userId;
        const type = req.query.type;
        const screen = req.query.screen;
        const from = req.query.from;
        const to = req.query.to;
        const limit = Math.min(Number(req.query.limit) || 50, 200);
        const page = Math.max(Number(req.query.page) || 1, 1);
        const where = {};
        if (userId)
            where.userId = userId;
        if (type)
            where.type = type;
        if (screen)
            where.screen = { contains: screen, mode: 'insensitive' };
        if (from || to) {
            where.createdAt = {};
            if (from)
                where.createdAt.gte = new Date(from);
            if (to)
                where.createdAt.lte = new Date(to);
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
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=activity.controller.js.map