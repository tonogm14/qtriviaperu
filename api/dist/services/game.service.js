"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.joinGame = joinGame;
exports.startGame = startGame;
exports.recordAnswer = recordAnswer;
exports.finishGame = finishGame;
const client_1 = require("@prisma/client");
const games_controller_1 = require("../controllers/games.controller");
const errorHandler_1 = require("../middleware/errorHandler");
const pushNotifications_1 = require("./pushNotifications");
const ledger_service_1 = require("./ledger.service");
const activity_service_1 = require("./activity.service");
const prisma = new client_1.PrismaClient();
async function logEvent(gameId, type, userId, data) {
    await prisma.gameEvent.create({
        data: { gameId, type, userId: userId ?? null, data: data ? data : client_1.Prisma.JsonNull },
    });
}
/**
 * Join a game. Handles life deduction for free games and fee payment for VIP games.
 */
async function joinGame(userId, gameId) {
    const [user, game] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId } }),
        prisma.game.findUnique({ where: { id: gameId } }),
    ]);
    if (!user)
        throw new errorHandler_1.AppError('User not found', 404, 'NOT_FOUND');
    if (!game)
        throw new errorHandler_1.AppError('Game not found', 404, 'NOT_FOUND');
    if (game.status !== client_1.GameStatus.PENDING && game.status !== client_1.GameStatus.LOBBY) {
        throw new errorHandler_1.AppError('Game is not accepting new players', 400, 'GAME_NOT_JOINABLE');
    }
    const existingEntry = await prisma.gameEntry.findUnique({
        where: { userId_gameId: { userId, gameId } },
    });
    if (existingEntry) {
        throw new errorHandler_1.AppError('You have already joined this game', 400, 'ALREADY_JOINED');
    }
    if (game.entryFee > 0) {
        // Entry fee is collected externally (Yape/Plin/Card) — not deducted from in-app balance.
        const seq = await prisma.orderSeq.create({ data: {} });
        await prisma.$transaction([
            prisma.gameEntry.create({ data: { userId, gameId, orderNumber: seq.id } }),
            prisma.game.update({ where: { id: gameId }, data: { currentPot: { increment: game.entryFee } } }),
        ]);
        (0, activity_service_1.logActivity)({ userId, type: 'join_game', action: `Se unió al juego VIP "${game.title}"`, meta: { gameId, orderNumber: seq.id } });
    }
    else {
        await prisma.gameEntry.create({ data: { userId, gameId } });
        (0, activity_service_1.logActivity)({ userId, type: 'join_game', action: `Se unió al juego "${game.title}"`, meta: { gameId } });
    }
    await prisma.notification.create({
        data: {
            userId,
            type: 'reminder',
            title: `¡Te uniste a ${game.title}!`,
            body: `Prepárate. El juego comienza pronto. ¡Buena suerte!`,
        },
    });
    await (0, pushNotifications_1.sendPushToUser)(userId, `¡Te uniste a ${game.title}!`, `Prepárate. El juego comienza pronto. ¡Buena suerte!`, { type: 'game_reminder', gameId });
}
/**
 * Start a game — transition PENDING/LOBBY → LIVE.
 * For recurring games, automatically creates the next day's game on start.
 */
async function startGame(gameId) {
    const game = await prisma.game.findUnique({
        where: { id: gameId },
        include: { questions: { select: { questionId: true, order: true } } },
    });
    if (!game)
        throw new errorHandler_1.AppError('Game not found', 404, 'NOT_FOUND');
    if (game.status !== client_1.GameStatus.PENDING && game.status !== client_1.GameStatus.LOBBY) {
        throw new errorHandler_1.AppError('Game cannot be started in its current status', 400, 'INVALID_STATUS');
    }
    const entryCount = await prisma.gameEntry.count({ where: { gameId } });
    await prisma.game.update({ where: { id: gameId }, data: { status: client_1.GameStatus.LIVE } });
    await logEvent(gameId, 'GAME_STARTED', null, { totalPlayers: entryCount });
    // Auto-create next occurrence for recurring games
    if (game.isRecurring && game.recurringTime) {
        const nextScheduledAt = (0, games_controller_1.getNextOccurrenceUTC)(game.recurringTime);
        const nextGame = await prisma.game.create({
            data: {
                title: game.title,
                type: game.type,
                isRecurring: true,
                recurringTime: game.recurringTime,
                scheduledAt: nextScheduledAt,
                status: client_1.GameStatus.PENDING,
                prize: game.prize,
                entryFee: game.entryFee,
                maxQuestions: game.maxQuestions,
                timePerQuestion: game.timePerQuestion,
                host: game.host,
                category: game.category,
                winnerMode: game.winnerMode,
                prizeSlots: game.prizeSlots ?? client_1.Prisma.JsonNull,
                sourceGameId: gameId,
            },
        });
        // Copy questions from current game to next occurrence
        if (game.questions.length > 0) {
            await prisma.gameQuestion.createMany({
                data: game.questions.map(q => ({ gameId: nextGame.id, questionId: q.questionId, order: q.order })),
            });
        }
    }
}
/**
 * Record answer for a user in a game question round.
 */
async function recordAnswer(gameId, userId, qIdx, answerIndex) {
    const [gameQuestion, totalQuestions, currentEntry] = await Promise.all([
        prisma.gameQuestion.findFirst({
            where: { gameId, order: qIdx + 1 },
            include: { question: true },
        }),
        prisma.gameQuestion.count({ where: { gameId } }),
        prisma.gameEntry.findFirst({ where: { userId, gameId } }),
    ]);
    if (!gameQuestion)
        throw new errorHandler_1.AppError('Question not found', 404, 'NOT_FOUND');
    const existingLog = Array.isArray(currentEntry?.answerLog) ? currentEntry.answerLog : [];
    if (existingLog.some((e) => e.qIdx === qIdx)) {
        return { correct: false, correctIndex: gameQuestion.question.correctIndex };
    }
    const correct = gameQuestion.question.correctIndex === answerIndex;
    const newLog = [...existingLog, { qIdx, receivedAt: new Date().toISOString() }];
    if (correct) {
        const newScore = (currentEntry?.score ?? 0) + 1;
        const isComplete = newScore >= totalQuestions;
        await prisma.gameEntry.updateMany({
            where: { userId, gameId },
            data: { score: { increment: 1 }, answerLog: newLog, ...(isComplete ? { finishedAt: new Date() } : {}) },
        });
    }
    else {
        await prisma.gameEntry.updateMany({
            where: { userId, gameId },
            data: {
                isAlive: false,
                answerLog: newLog,
                // Only set eliminatedAtQ on first elimination (don't overwrite if they've been eliminated before)
                ...(currentEntry?.eliminatedAtQ == null ? { eliminatedAtQ: qIdx } : {}),
            },
        });
        // Log elimination event (fire-and-forget)
        logEvent(gameId, 'PLAYER_ELIMINATED', userId, { qIdx, score: currentEntry?.score ?? 0 }).catch(() => { });
    }
    return { correct, correctIndex: gameQuestion.question.correctIndex };
}
/**
 * Finish a game — distribute prizes, log events, archive the game.
 * Recurring games are NOT reset — the next occurrence was already created at startGame().
 */
async function finishGame(gameId) {
    const game = await prisma.game.findUnique({
        where: { id: gameId },
        include: { entries: { include: { user: true } } },
    });
    if (!game)
        throw new errorHandler_1.AppError('Game not found', 404, 'NOT_FOUND');
    let totalPrize;
    if (game.prizeMode === 'POT') {
        totalPrize = game.currentPot;
    }
    else if (game.prizeMode === 'POT_PERCENT') {
        totalPrize = Math.floor(game.currentPot * (game.potPercent ?? 100) / 100 * 100) / 100;
    }
    else {
        // FIXED — or legacy VIP games that still have entryFee>0 without explicit prizeMode
        totalPrize = game.entryFee > 0 && game.prize === 0 ? game.currentPot : game.prize;
    }
    const winnerMode = (game.winnerMode ?? 'SINGLE');
    const prizeSlots = Array.isArray(game.prizeSlots) ? game.prizeSlots : [];
    const totalQuestions = await prisma.gameQuestion.count({ where: { gameId } });
    let winners = [];
    if (winnerMode === 'ALL_CORRECT') {
        const correct = game.entries.filter(e => e.score >= totalQuestions);
        if (correct.length > 0) {
            const share = Math.floor((totalPrize / correct.length) * 100) / 100;
            winners = correct.map(e => ({ entry: e, prize: share }));
        }
    }
    else if (winnerMode === 'RANKED_SLOTS' && prizeSlots.length > 0) {
        const finished = game.entries
            .filter(e => e.score >= totalQuestions && e.finishedAt)
            .sort((a, b) => a.finishedAt.getTime() - b.finishedAt.getTime());
        for (let i = 0; i < Math.min(finished.length, prizeSlots.length); i++) {
            const pct = prizeSlots[i]?.percent ?? 0;
            winners.push({ entry: finished[i], prize: Math.floor((totalPrize * pct / 100) * 100) / 100 });
        }
    }
    else {
        const alive = game.entries
            .filter(e => e.isAlive)
            .sort((a, b) => b.score - a.score || a.joinedAt.getTime() - b.joinedAt.getTime());
        if (alive.length > 0)
            winners = [{ entry: alive[0], prize: totalPrize }];
    }
    const survivors = game.entries.filter(e => e.isAlive).length;
    // Distribute prizes + archive game in one transaction
    await prisma.$transaction(async (tx) => {
        await tx.game.update({
            where: { id: gameId },
            data: { status: client_1.GameStatus.ARCHIVED, winnerId: winners.length > 0 ? winners[0].entry.userId : null },
        });
        for (const { entry, prize } of winners) {
            const balanceAfterPrize = entry.user.balance + prize;
            await tx.user.update({ where: { id: entry.userId }, data: { balance: { increment: prize } } });
            await tx.gameEntry.update({ where: { id: entry.id }, data: { prize } });
            await tx.notification.create({
                data: { userId: entry.userId, type: 'win', title: '¡Ganaste! 🏆', body: `¡Felicitaciones! Ganaste S/${prize.toFixed(2)} en ${game.title}.` },
            });
            await (0, ledger_service_1.ledgerEntry)(tx, entry.userId, {
                type: 'PRIZE_WIN', amount: prize, balanceAfter: balanceAfterPrize,
                description: `Premio ganado en "${game.title}"`, referenceId: gameId, referenceType: 'GAME',
            });
        }
    });
    // Log game events (after transaction, non-blocking)
    const eventPromises = [
        logEvent(gameId, 'GAME_ENDED', null, {
            totalPlayers: game.entries.length,
            survivors,
            totalPrize,
            winnerMode,
        }),
    ];
    for (const { entry, prize } of winners) {
        eventPromises.push(logEvent(gameId, 'WINNER_DECLARED', entry.userId, {
            username: entry.user.username,
            prize,
            score: entry.score,
        }));
        // Push winner notification
        (0, pushNotifications_1.sendPushToUser)(entry.userId, '¡Ganaste! 🏆', `Ganaste S/${prize.toFixed(2)} en ${game.title}`, { type: 'win', gameId }).catch(() => { });
    }
    await Promise.all(eventPromises).catch(() => { });
    const winnerList = winners.map(w => ({ username: w.entry.user.username, prize: w.prize }));
    return { winner: winnerList[0]?.username ?? null, winners: winnerList, prize: totalPrize };
}
//# sourceMappingURL=game.service.js.map