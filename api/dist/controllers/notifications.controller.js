"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listNotifications = listNotifications;
exports.markAsRead = markAsRead;
exports.markAllAsRead = markAllAsRead;
exports.broadcastNotification = broadcastNotification;
exports.listScheduled = listScheduled;
exports.deleteScheduled = deleteScheduled;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
const pushNotifications_1 = require("../services/pushNotifications");
function param(req, key) {
    const val = req.params[key];
    return Array.isArray(val) ? val[0] : (val ?? '');
}
const prisma = new client_1.PrismaClient();
const listNotificationsSchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().positive().max(100).default(20),
    unreadOnly: zod_1.z
        .string()
        .optional()
        .transform((v) => v === 'true'),
});
async function listNotifications(req, res, next) {
    try {
        const query = listNotificationsSchema.parse(req.query);
        const { page, limit, unreadOnly } = query;
        const skip = (page - 1) * limit;
        const where = { userId: req.user.id };
        if (unreadOnly)
            where.isRead = false;
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
    }
    catch (err) {
        next(err);
    }
}
async function markAsRead(req, res, next) {
    try {
        const notifId = param(req, 'id');
        const notification = await prisma.notification.findUnique({
            where: { id: notifId },
        });
        if (!notification) {
            res.status(404).json({ error: 'Notification not found', code: 'NOT_FOUND' });
            return;
        }
        if (notification.userId !== req.user.id) {
            res.status(403).json({ error: 'Access denied', code: 'FORBIDDEN' });
            return;
        }
        const updated = await prisma.notification.update({
            where: { id: notifId },
            data: { isRead: true },
        });
        res.json({ data: updated });
    }
    catch (err) {
        next(err);
    }
}
async function markAllAsRead(req, res, next) {
    try {
        const { count } = await prisma.notification.updateMany({
            where: { userId: req.user.id, isRead: false },
            data: { isRead: true },
        });
        res.json({ data: { message: `${count} notifications marked as read` } });
    }
    catch (err) {
        next(err);
    }
}
const broadcastSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(100),
    body: zod_1.z.string().min(1).max(500),
    type: zod_1.z.enum(['reminder', 'bonus', 'win', 'rank', 'life', 'general']).default('general'),
    target: zod_1.z.enum(['all', 'game', 'user', 'vip']).default('all'),
    gameId: zod_1.z.string().optional(),
    userEmail: zod_1.z.string().email().optional(),
    scheduledFor: zod_1.z.string().datetime().optional(),
});
async function resolveUserIds(target, gameId, userEmail) {
    if (target === 'user') {
        if (!userEmail)
            return { userIds: [], error: 'Se requiere un email para target=user' };
        const user = await prisma.user.findUnique({ where: { email: userEmail }, select: { id: true } });
        if (!user)
            return { userIds: [], error: `No existe ningún usuario con el email "${userEmail}"` };
        return { userIds: [user.id] };
    }
    if (target === 'vip') {
        const users = await prisma.user.findMany({ where: { isVip: true }, select: { id: true } });
        return { userIds: users.map((u) => u.id) };
    }
    if (target === 'game') {
        if (!gameId)
            return { userIds: [] };
        const entries = await prisma.gameEntry.findMany({ where: { gameId }, select: { userId: true } });
        return { userIds: entries.map((e) => e.userId) };
    }
    const users = await prisma.user.findMany({ select: { id: true } });
    return { userIds: users.map((u) => u.id) };
}
async function broadcastNotification(req, res, next) {
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
        const pushSent = await (0, pushNotifications_1.sendBroadcast)(title, body, {
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
    }
    catch (err) {
        next(err);
    }
}
async function listScheduled(req, res, next) {
    try {
        const items = await prisma.scheduledNotification.findMany({
            where: { sentAt: null },
            orderBy: { scheduledFor: 'asc' },
        });
        res.json({ data: items });
    }
    catch (err) {
        next(err);
    }
}
async function deleteScheduled(req, res, next) {
    try {
        const id = param(req, 'id');
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
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=notifications.controller.js.map