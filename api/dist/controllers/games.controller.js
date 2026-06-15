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
exports.getNextOccurrenceUTC = getNextOccurrenceUTC;
exports.listGames = listGames;
exports.getGame = getGame;
exports.createGame = createGame;
exports.updateGame = updateGame;
exports.deleteGame = deleteGame;
exports.setGameQuestions = setGameQuestions;
exports.getMyEntry = getMyEntry;
exports.joinGame = joinGame;
exports.startGame = startGame;
exports.getGameEntries = getGameEntries;
exports.getGameLog = getGameLog;
exports.getGameLeaderboard = getGameLeaderboard;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
const gameService = __importStar(require("../services/game.service"));
const gameSocket_1 = require("../socket/gameSocket");
const index_1 = require("../index");
const errorHandler_1 = require("../middleware/errorHandler");
function param(req, key) {
    const val = req.params[key];
    return Array.isArray(val) ? val[0] : (val ?? '');
}
const prisma = new client_1.PrismaClient();
// ─── Recurring game helpers ───────────────────────────────────────────────────
// Lima is UTC-5 with no DST. Compute the next UTC datetime for a Lima HH:MM.
function getNextOccurrenceUTC(recurringTime) {
    const [hh, mm] = recurringTime.split(':').map(Number);
    const now = new Date();
    // Get today's date in Lima (UTC-5)
    const limaToday = new Date(now.getTime() - 5 * 60 * 60 * 1000);
    // Build today's occurrence in UTC (Lima HH:MM → UTC HH+5:MM)
    const occurrence = new Date(Date.UTC(limaToday.getUTCFullYear(), limaToday.getUTCMonth(), limaToday.getUTCDate(), hh + 5, // JS Date handles overflow (26 = next day 02:00 UTC)
    mm, 0, 0));
    // If the occurrence has already passed, roll to tomorrow
    if (now.getTime() >= occurrence.getTime()) {
        occurrence.setUTCDate(occurrence.getUTCDate() + 1);
    }
    return occurrence;
}
// Inject computed scheduledAt for recurring games
function withNextOccurrence(game) {
    if (game.isRecurring && game.recurringTime) {
        return { ...game, scheduledAt: getNextOccurrenceUTC(game.recurringTime) };
    }
    return game;
}
// ─── Validation schemas ───────────────────────────────────────────────────────
const prizeSlotSchema = zod_1.z.object({
    place: zod_1.z.number().int().min(1),
    percent: zod_1.z.number().min(0).max(100),
});
const createGameSchema = zod_1.z.object({
    title: zod_1.z.string().min(3).max(200),
    type: zod_1.z.nativeEnum(client_1.GameType).default(client_1.GameType.SPECIAL),
    scheduledAt: zod_1.z.coerce.date().optional(),
    prize: zod_1.z.number().positive(),
    entryFee: zod_1.z.number().min(0).default(0),
    maxQuestions: zod_1.z.number().int().min(1).max(50).default(12),
    timePerQuestion: zod_1.z.number().int().min(5).max(60).default(10),
    host: zod_1.z.string().optional(),
    category: zod_1.z.string().optional(),
    winnerMode: zod_1.z.enum(['SINGLE', 'ALL_CORRECT', 'RANKED_SLOTS']).default('SINGLE'),
    prizeSlots: zod_1.z.array(prizeSlotSchema).optional().nullable(),
    prizeMode: zod_1.z.enum(['FIXED', 'POT', 'POT_PERCENT']).default('FIXED'),
    potPercent: zod_1.z.number().min(1).max(100).default(100),
    streamUrl: zod_1.z.string().url().optional().nullable(),
});
const updateGameSchema = zod_1.z.object({
    title: zod_1.z.string().min(3).max(200).optional(),
    type: zod_1.z.nativeEnum(client_1.GameType).optional(),
    scheduledAt: zod_1.z.coerce.date().optional(),
    recurringTime: zod_1.z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
    prize: zod_1.z.number().min(0).optional(),
    entryFee: zod_1.z.number().min(0).optional(),
    maxQuestions: zod_1.z.number().int().min(1).max(50).optional(),
    timePerQuestion: zod_1.z.number().int().min(5).max(60).optional(),
    host: zod_1.z.string().optional(),
    category: zod_1.z.string().optional(),
    status: zod_1.z.nativeEnum(client_1.GameStatus).optional(),
    winnerMode: zod_1.z.enum(['SINGLE', 'ALL_CORRECT', 'RANKED_SLOTS']).optional(),
    prizeSlots: zod_1.z.array(prizeSlotSchema).optional().nullable(),
    prizeMode: zod_1.z.enum(['FIXED', 'POT', 'POT_PERCENT']).optional(),
    potPercent: zod_1.z.number().min(1).max(100).optional(),
    streamUrl: zod_1.z.string().url().optional().nullable(),
});
const listGamesSchema = zod_1.z.object({
    status: zod_1.z.nativeEnum(client_1.GameStatus).optional(),
    date: zod_1.z.string().optional(),
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().positive().max(100).default(20),
});
// ─── Controllers ──────────────────────────────────────────────────────────────
async function listGames(req, res, next) {
    try {
        const query = listGamesSchema.parse(req.query);
        const { page, limit, status, date } = query;
        const skip = (page - 1) * limit;
        const where = {};
        if (status)
            where.status = status;
        if (date) {
            const dayStart = new Date(date);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(date);
            dayEnd.setHours(23, 59, 59, 999);
            where.scheduledAt = { gte: dayStart, lte: dayEnd };
        }
        // Recurring games are always included regardless of date filter
        const recurringWhere = status
            ? { isRecurring: true, status }
            : { isRecurring: true };
        const [allGames, total] = await prisma.$transaction([
            prisma.game.findMany({
                where: date
                    ? { OR: [where, recurringWhere] }
                    : where,
                skip,
                take: limit,
                orderBy: { scheduledAt: 'asc' },
                include: { _count: { select: { entries: true, questions: true } } },
            }),
            prisma.game.count({ where }),
        ]);
        const games = allGames.map(withNextOccurrence);
        res.json({ data: games, total, page, limit });
    }
    catch (err) {
        next(err);
    }
}
async function getGame(req, res, next) {
    try {
        const game = await prisma.game.findUnique({
            where: { id: param(req, 'id') },
            include: {
                _count: { select: { entries: true, questions: true } },
                questions: {
                    include: { question: true },
                    orderBy: { order: 'asc' },
                },
            },
        });
        if (!game) {
            res.status(404).json({ error: 'Game not found', code: 'NOT_FOUND' });
            return;
        }
        res.json({ data: withNextOccurrence(game) });
    }
    catch (err) {
        next(err);
    }
}
async function createGame(req, res, next) {
    try {
        const body = createGameSchema.parse(req.body);
        const { prizeSlots, ...rest } = body;
        const scheduledAt = rest.scheduledAt ?? new Date();
        const game = await prisma.game.create({
            data: {
                ...rest,
                scheduledAt,
                type: rest.type,
                prizeSlots: prizeSlots !== undefined ? (prizeSlots ?? client_1.Prisma.JsonNull) : undefined,
            },
        });
        res.status(201).json({ data: game });
    }
    catch (err) {
        next(err);
    }
}
async function updateGame(req, res, next) {
    try {
        const body = updateGameSchema.parse(req.body);
        const { prizeSlots, ...rest } = body;
        const data = {
            ...rest,
            ...(prizeSlots !== undefined ? { prizeSlots: prizeSlots ?? client_1.Prisma.JsonNull } : {}),
        };
        // For recurring games updating time: recompute scheduledAt from new recurringTime
        if (body.recurringTime) {
            data.isRecurring = true;
            data.scheduledAt = getNextOccurrenceUTC(body.recurringTime);
        }
        const game = await prisma.game.update({
            where: { id: param(req, 'id') },
            data,
        });
        res.json({ data: withNextOccurrence(game) });
    }
    catch (err) {
        next(err);
    }
}
async function deleteGame(req, res, next) {
    try {
        const game = await prisma.game.findUnique({ where: { id: param(req, 'id') } });
        if (!game)
            throw new errorHandler_1.AppError('Game not found', 404, 'NOT_FOUND');
        if (game.isRecurring)
            throw new errorHandler_1.AppError('No se puede eliminar un juego recurrente (Gratis/VIP)', 400, 'CANNOT_DELETE_RECURRING');
        await prisma.game.delete({ where: { id: param(req, 'id') } });
        res.json({ data: { message: 'Game deleted successfully' } });
    }
    catch (err) {
        next(err);
    }
}
// ─── Questions for a game ─────────────────────────────────────────────────────
async function setGameQuestions(req, res, next) {
    try {
        const gameId = param(req, 'id');
        const { questionIds } = zod_1.z.object({
            questionIds: zod_1.z.array(zod_1.z.string()).min(1),
        }).parse(req.body);
        const game = await prisma.game.findUnique({ where: { id: gameId } });
        if (!game)
            throw new errorHandler_1.AppError('Game not found', 404, 'NOT_FOUND');
        // Replace all questions atomically
        await prisma.$transaction([
            prisma.gameQuestion.deleteMany({ where: { gameId } }),
            prisma.gameQuestion.createMany({
                data: questionIds.map((questionId, idx) => ({ gameId, questionId, order: idx + 1 })),
            }),
        ]);
        const updated = await prisma.game.findUnique({
            where: { id: gameId },
            include: {
                questions: { include: { question: true }, orderBy: { order: 'asc' } },
                _count: { select: { entries: true, questions: true } },
            },
        });
        res.json({ data: updated });
    }
    catch (err) {
        next(err);
    }
}
// ─── Player actions ───────────────────────────────────────────────────────────
async function getMyEntry(req, res, next) {
    try {
        const gameId = param(req, 'id');
        const userId = req.user.id;
        const entry = await prisma.gameEntry.findUnique({
            where: { userId_gameId: { userId, gameId } },
        });
        res.json({ data: { joined: !!entry } });
    }
    catch (err) {
        next(err);
    }
}
async function joinGame(req, res, next) {
    try {
        await gameService.joinGame(req.user.id, param(req, 'id'));
        res.json({ data: { message: 'Successfully joined the game' } });
    }
    catch (err) {
        next(err);
    }
}
async function startGame(req, res, next) {
    try {
        const gameId = param(req, 'id');
        await gameService.startGame(gameId);
        // Fire question loop without blocking the HTTP response
        (0, gameSocket_1.broadcastGameStart)(index_1.io, gameId, false).catch((err) => console.error('[startGame] broadcastGameStart error', err));
        res.json({ data: { message: 'Game started successfully' } });
    }
    catch (err) {
        next(err);
    }
}
async function getGameEntries(req, res, next) {
    try {
        const gameId = param(req, 'id');
        const search = String(req.query.search ?? '').trim().toLowerCase();
        const game = await prisma.game.findUnique({ where: { id: gameId }, select: { winnerMode: true } });
        const orderBy = game?.winnerMode === 'RANKED_SLOTS'
            ? [{ score: 'desc' }, { finishedAt: 'asc' }]
            : [{ score: 'desc' }, { joinedAt: 'asc' }];
        const entries = await prisma.gameEntry.findMany({
            where: { gameId },
            orderBy,
            include: { user: { select: { id: true, username: true, name: true, email: true, isVip: true } } },
        });
        const result = entries
            .filter((e) => {
            if (!search)
                return true;
            return (e.user.username.toLowerCase().includes(search) ||
                e.user.name.toLowerCase().includes(search) ||
                e.user.email.toLowerCase().includes(search));
        })
            .map((e, idx) => ({
            rank: idx + 1,
            userId: e.userId,
            username: e.user.username,
            name: e.user.name,
            email: e.user.email,
            isVip: e.user.isVip,
            score: e.score,
            isAlive: e.isAlive,
            prize: e.prize,
            joinedAt: e.joinedAt,
            finishedAt: e.finishedAt,
        }));
        res.json({ data: result, total: result.length });
    }
    catch (err) {
        next(err);
    }
}
async function getGameLog(req, res, next) {
    try {
        const gameId = param(req, 'id');
        const [game, events, rawEntries] = await Promise.all([
            prisma.game.findUnique({ where: { id: gameId }, select: { id: true, title: true, status: true, scheduledAt: true, prize: true, entryFee: true, currentPot: true, winnerMode: true } }),
            prisma.gameEvent.findMany({ where: { gameId }, orderBy: { createdAt: 'asc' } }),
            prisma.gameEntry.findMany({
                where: { gameId },
                orderBy: [{ score: 'desc' }, { finishedAt: 'asc' }, { joinedAt: 'asc' }],
                include: { user: { select: { id: true, username: true, name: true, email: true } } },
            }),
        ]);
        if (!game)
            throw new errorHandler_1.AppError('Game not found', 404, 'NOT_FOUND');
        const entries = rawEntries.map((e) => ({
            id: e.id,
            userId: e.userId,
            username: e.user.username,
            name: e.user.name,
            email: e.user.email,
            score: e.score,
            isAlive: e.isAlive,
            eliminatedAtQ: e.eliminatedAtQ,
            prize: e.prize,
            joinedAt: e.joinedAt,
            finishedAt: e.finishedAt,
            answerLog: e.answerLog,
        }));
        res.json({ data: { game, events, entries } });
    }
    catch (err) {
        next(err);
    }
}
async function getGameLeaderboard(req, res, next) {
    try {
        const gameId = param(req, 'id');
        const game = await prisma.game.findUnique({ where: { id: gameId } });
        if (!game)
            throw new errorHandler_1.AppError('Game not found', 404, 'NOT_FOUND');
        const entries = await prisma.gameEntry.findMany({
            where: { gameId },
            orderBy: [{ score: 'desc' }, { joinedAt: 'asc' }],
            include: { user: { select: { id: true, username: true, name: true } } },
        });
        const leaderboard = entries.map((entry, idx) => ({
            rank: idx + 1,
            userId: entry.userId,
            username: entry.user.username,
            name: entry.user.name,
            score: entry.score,
            isAlive: entry.isAlive,
            prize: entry.prize,
        }));
        res.json({ data: leaderboard });
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=games.controller.js.map