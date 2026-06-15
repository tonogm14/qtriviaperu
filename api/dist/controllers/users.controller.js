"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.savePushToken = void 0;
exports.createUser = createUser;
exports.getUsersStats = getUsersStats;
exports.listUsers = listUsers;
exports.getUser = getUser;
exports.updateUser = updateUser;
exports.updatePermissions = updatePermissions;
exports.getUserStats = getUserStats;
exports.getUserLedger = getUserLedger;
const zod_1 = require("zod");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const client_1 = require("@prisma/client");
const auth_service_1 = require("../services/auth.service");
const ledger_service_1 = require("../services/ledger.service");
const activity_service_1 = require("../services/activity.service");
function param(req, key) {
    const val = req.params[key];
    return Array.isArray(val) ? val[0] : (val ?? '');
}
const prisma = new client_1.PrismaClient();
const listUsersSchema = zod_1.z.object({
    search: zod_1.z.string().optional(),
    status: zod_1.z.enum(['active', 'disabled', 'archived']).optional(),
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().positive().max(100).default(20),
});
const updateUserSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(100).optional(),
    phone: zod_1.z.string().optional(),
    balance: zod_1.z.number().min(0).optional(),
    lives: zod_1.z.number().int().min(0).optional(),
    isVip: zod_1.z.boolean().optional(),
    isActive: zod_1.z.boolean().optional(),
    isArchived: zod_1.z.boolean().optional(),
    role: zod_1.z.enum(['USER', 'ADMIN']).optional(),
    permissions: zod_1.z.array(zod_1.z.string()).optional(),
});
const createUserSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(100),
    email: zod_1.z.string().email(),
    username: zod_1.z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
    password: zod_1.z.string().min(8),
    role: zod_1.z.enum(['USER', 'ADMIN']).default('ADMIN'),
    permissions: zod_1.z.array(zod_1.z.string()).default([]),
});
async function createUser(req, res, next) {
    try {
        const body = createUserSchema.parse(req.body);
        const hashedPassword = await bcryptjs_1.default.hash(body.password, 12);
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
        res.status(201).json({ data: (0, auth_service_1.sanitizeUser)(user) });
    }
    catch (err) {
        next(err);
    }
}
async function getUsersStats(_req, res, next) {
    try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const [totalAdmins, totalUsers, newToday] = await prisma.$transaction([
            prisma.user.count({ where: { role: 'ADMIN' } }),
            prisma.user.count({ where: { role: 'USER' } }),
            prisma.user.count({ where: { role: 'USER', createdAt: { gte: todayStart } } }),
        ]);
        res.json({ data: { totalAdmins, totalUsers, newToday } });
    }
    catch (err) {
        next(err);
    }
}
async function listUsers(req, res, next) {
    try {
        const query = listUsersSchema.parse(req.query);
        const { page, limit, search, status } = query;
        const skip = (page - 1) * limit;
        const where = {};
        if (status === 'active') {
            where.isActive = true;
            where.isArchived = false;
        }
        if (status === 'disabled') {
            where.isActive = false;
            where.isArchived = false;
        }
        if (status === 'archived') {
            where.isArchived = true;
        }
        if (!status) {
            where.isArchived = false;
        } // default: hide archived
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
        const users = rawUsers.map(auth_service_1.sanitizeUser);
        res.json({ data: users, total, page, limit });
    }
    catch (err) {
        next(err);
    }
}
async function getUser(req, res, next) {
    try {
        const user = await prisma.user.findUnique({ where: { id: param(req, 'id') } });
        if (!user) {
            res.status(404).json({ error: 'User not found', code: 'NOT_FOUND' });
            return;
        }
        res.json({ data: (0, auth_service_1.sanitizeUser)(user) });
    }
    catch (err) {
        next(err);
    }
}
async function updateUser(req, res, next) {
    try {
        const body = updateUserSchema.parse(req.body);
        const targetId = param(req, 'id');
        const adminId = req.user?.id;
        const user = await prisma.user.update({
            where: { id: targetId },
            data: body,
        });
        if (adminId) {
            (0, activity_service_1.logActivity)({ userId: adminId, type: 'admin_action', action: `Editó perfil del usuario ${user.username}`, meta: { targetId, fields: Object.keys(body) } });
        }
        res.json({ data: (0, auth_service_1.sanitizeUser)(user) });
    }
    catch (err) {
        next(err);
    }
}
const savePushToken = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { token } = zod_1.z.object({ token: zod_1.z.string().min(1) }).parse(req.body);
        await prisma.user.update({
            where: { id: userId },
            data: { pushToken: token },
        });
        res.json({ data: { success: true } });
    }
    catch (err) {
        next(err);
    }
};
exports.savePushToken = savePushToken;
async function updatePermissions(req, res, next) {
    try {
        const { permissions } = zod_1.z.object({
            permissions: zod_1.z.array(zod_1.z.string()),
        }).parse(req.body);
        const user = await prisma.user.update({
            where: { id: param(req, 'id') },
            data: { permissions },
        });
        res.json({ data: (0, auth_service_1.sanitizeUser)(user) });
    }
    catch (err) {
        next(err);
    }
}
async function getUserStats(req, res, next) {
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
    }
    catch (err) {
        next(err);
    }
}
async function getUserLedger(req, res, next) {
    try {
        const userId = param(req, 'id');
        const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10));
        const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '30'), 10)));
        const result = await (0, ledger_service_1.getUserLedger)(userId, page, limit);
        res.json({ data: result });
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=users.controller.js.map