"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.startGameScheduler = startGameScheduler;
const client_1 = require("@prisma/client");
const pushNotifications_1 = require("./pushNotifications");
const gameSocket_1 = require("../socket/gameSocket");
const gameService = __importStar(require("./game.service"));
const prisma = new client_1.PrismaClient();
const PRIZE_FMT = (n) => `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 0 })}`;
async function notifyAllUsers(title, body, type, gameId) {
    const users = await prisma.user.findMany({ select: { id: true } });
    if (users.length === 0)
        return 0;
    await prisma.notification.createMany({
        data: users.map((u) => ({ userId: u.id, type, title, body, isRead: false })),
        skipDuplicates: false,
    });
    return (0, pushNotifications_1.sendBroadcast)(title, body, { data: { type, gameId } });
}
async function fireScheduledNotifications(now) {
    const pending = await prisma.scheduledNotification.findMany({
        where: { scheduledFor: { lte: now }, sentAt: null },
    });
    for (const notif of pending) {
        let userIds;
        if (notif.target === 'user' && notif.userEmail) {
            const user = await prisma.user.findUnique({ where: { email: notif.userEmail }, select: { id: true } });
            userIds = user ? [user.id] : [];
        }
        else if (notif.target === 'vip') {
            const users = await prisma.user.findMany({ where: { isVip: true }, select: { id: true } });
            userIds = users.map((u) => u.id);
        }
        else if (notif.target === 'game' && notif.gameId) {
            const entries = await prisma.gameEntry.findMany({
                where: { gameId: notif.gameId },
                select: { userId: true },
            });
            userIds = entries.map((e) => e.userId);
        }
        else {
            const users = await prisma.user.findMany({ select: { id: true } });
            userIds = users.map((u) => u.id);
        }
        if (userIds.length > 0) {
            await prisma.notification.createMany({
                data: userIds.map((userId) => ({
                    userId,
                    type: notif.type,
                    title: notif.title,
                    body: notif.body,
                    isRead: false,
                })),
                skipDuplicates: false,
            });
            await (0, pushNotifications_1.sendBroadcast)(notif.title, notif.body, {
                gameId: notif.gameId ?? undefined,
                data: { type: notif.type, gameId: notif.gameId },
            });
        }
        await prisma.scheduledNotification.update({
            where: { id: notif.id },
            data: { sentAt: now },
        });
        console.log(`[scheduler] scheduled notification fired → "${notif.title}" (id: ${notif.id})`);
    }
}
async function tick(io) {
    const now = new Date();
    const in1h5m = new Date(now.getTime() + 65 * 60 * 1000); // look-ahead window for 1h
    const in10m = new Date(now.getTime() + 10 * 60 * 1000); // look-ahead window for 5m
    // Fetch all PENDING/LOBBY games not yet fully notified
    const games = await prisma.game.findMany({
        where: {
            status: { in: ['PENDING', 'LOBBY'] },
            scheduledAt: { lte: in1h5m },
            OR: [
                { notified1h: false },
                { notified5m: false },
            ],
        },
    });
    for (const game of games) {
        const msUntil = game.scheduledAt.getTime() - now.getTime();
        const prize = PRIZE_FMT(game.prize);
        // ── 1-hour reminder (fire between 55–65 min before) ──────────────────────
        if (!game.notified1h && msUntil >= 55 * 60 * 1000 && msUntil <= 65 * 60 * 1000) {
            await notifyAllUsers(`⏰ En 1 hora: ${game.title}`, `El gran juego comienza en 1 hora. Premio: ${prize}. ¡Prepárate!`, 'reminder', game.id);
            await prisma.game.update({ where: { id: game.id }, data: { notified1h: true } });
            console.log(`[scheduler] 1h reminder sent → ${game.title}`);
        }
        // ── 5-minute reminder (fire between 3–7 min before) ──────────────────────
        if (!game.notified5m && msUntil >= 3 * 60 * 1000 && msUntil <= 7 * 60 * 1000) {
            await notifyAllUsers(`🔥 ¡Ya casi! ${game.title}`, `El juego inicia en 5 minutos. Premio: ${prize}. ¡No te lo pierdas!`, 'reminder', game.id);
            await prisma.game.update({ where: { id: game.id }, data: { notified5m: true } });
            console.log(`[scheduler] 5m reminder sent → ${game.title}`);
        }
    }
    // ── Auto-start recurring games that reached their scheduled time ────────────
    // Recurring PENDING games whose scheduledAt has passed get started automatically
    // in "autoPlay" mode: questions advance on timer without a host.
    const dueGames = await prisma.game.findMany({
        where: {
            isRecurring: true,
            status: 'PENDING',
            scheduledAt: { lt: now },
        },
    });
    for (const game of dueGames) {
        try {
            await gameService.startGame(game.id);
            // Fire-and-forget: runs the full question loop in the background
            (0, gameSocket_1.broadcastGameStart)(io, game.id, true).catch((err) => console.error(`[scheduler] autoPlay error for ${game.id}:`, err));
            console.log(`[scheduler] auto-started recurring game → ${game.title} (${game.id})`);
        }
        catch (err) {
            console.error(`[scheduler] failed to auto-start ${game.id}:`, err);
        }
    }
    // ── Auto-finish LIVE games stuck for more than 1 hour ────────────────────────
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const stuckGames = await prisma.game.findMany({
        where: {
            status: 'LIVE',
            // scheduledAt is the start time proxy — if started over an hour ago
            scheduledAt: { lt: oneHourAgo },
        },
    });
    for (const game of stuckGames) {
        try {
            await gameService.finishGame(game.id);
            console.log(`[scheduler] force-finished stuck LIVE game → ${game.title} (${game.id})`);
        }
        catch (err) {
            console.error(`[scheduler] failed to force-finish ${game.id}:`, err);
        }
    }
    // ── Manually scheduled notifications ────────────────────────────────────────
    await fireScheduledNotifications(now);
    // ── Game-started notification (fires when status transitions to LIVE) ───────
    const liveGames = await prisma.game.findMany({
        where: { status: 'LIVE', notifiedStart: false },
    });
    for (const game of liveGames) {
        const prize = PRIZE_FMT(game.prize);
        await notifyAllUsers(`🎮 ¡Acaba de iniciar! ${game.title}`, `El juego ya comenzó. Premio: ${prize}. ¡Entra ahora y no te lo pierdas!`, 'reminder', game.id);
        await prisma.game.update({ where: { id: game.id }, data: { notifiedStart: true } });
        console.log(`[scheduler] start notification sent → ${game.title}`);
    }
}
function startGameScheduler(io) {
    console.log('[scheduler] Game notification scheduler started (interval: 60s)');
    tick(io).catch((err) => console.error('[scheduler] tick error:', err));
    setInterval(() => {
        tick(io).catch((err) => console.error('[scheduler] tick error:', err));
    }, 60 * 1000);
}
//# sourceMappingURL=gameScheduler.js.map