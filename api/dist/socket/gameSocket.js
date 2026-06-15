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
exports.initGameSocket = initGameSocket;
exports.broadcastGameStart = broadcastGameStart;
const client_1 = require("@prisma/client");
const gameService = __importStar(require("../services/game.service"));
const prisma = new client_1.PrismaClient();
// ─── Bad-word cache (refreshed every 5 min) ──────────────────────────────────
let badWordCache = new Set();
let moderationEnabled = true;
async function refreshModerationCache() {
    try {
        const [words, config] = await Promise.all([
            prisma.badWord.findMany({ select: { word: true } }),
            prisma.appConfig.findUnique({ where: { id: 'main' }, select: { chatModeration: true } }),
        ]);
        badWordCache = new Set(words.map((w) => w.word));
        moderationEnabled = config?.chatModeration ?? true;
    }
    catch { /* keep previous cache on error */ }
}
refreshModerationCache();
setInterval(refreshModerationCache, 5 * 60 * 1000);
function containsBadWord(text) {
    if (!moderationEnabled || badWordCache.size === 0)
        return false;
    const lower = text.toLowerCase();
    for (const word of badWordCache) {
        if (lower.includes(word))
            return true;
    }
    return false;
}
const activeGames = new Map();
const nextQuestionResolvers = new Map();
function getOrCreateGameState(gameId) {
    if (!activeGames.has(gameId)) {
        activeGames.set(gameId, {
            players: new Set(),
            answers: new Map(),
            chatMessages: [],
            currentQuestion: 0,
            revealedQuestions: new Set(),
        });
    }
    return activeGames.get(gameId);
}
function initGameSocket(io) {
    io.on('connection', (socket) => {
        console.log(`[Socket] Client connected: ${socket.id}`);
        // ─── JOIN LOBBY ───────────────────────────────────────────────────────────
        socket.on('join:lobby', async ({ gameId, userId }) => {
            try {
                const game = await prisma.game.findUnique({
                    where: { id: gameId },
                    include: {
                        entries: {
                            include: { user: { select: { username: true } } },
                        },
                    },
                });
                if (!game) {
                    socket.emit('error', { message: 'Game not found', code: 'NOT_FOUND' });
                    return;
                }
                // Join the socket room for this game
                await socket.join(`game:${gameId}`);
                const state = getOrCreateGameState(gameId);
                state.players.add(userId);
                const pot = game.currentPot;
                const connectedCount = state.players.size;
                const entry = game.entries.find((e) => e.userId === userId);
                const isRegistered = !!entry;
                const isAlive = entry?.isAlive ?? false;
                // Emit lobby state to the joining player
                socket.emit('game:lobby', {
                    gameId,
                    playerCount: connectedCount,
                    pot,
                    chatMessages: state.chatMessages.slice(-50),
                    isRegistered,
                    isAlive,
                });
                // Send current player roster snapshot + life event history (so admin/late-joiners see live state)
                if (game.status === 'LIVE') {
                    const lifeEventsHistory = await prisma.gameEvent.findMany({
                        where: { gameId, type: 'LIFE_USED' },
                        orderBy: { createdAt: 'asc' },
                    });
                    socket.emit('game:roster', {
                        gameId,
                        aliveDetails: game.entries
                            .filter((e) => e.isAlive)
                            .map((e) => ({ userId: e.userId, username: e.user.username })),
                        eliminatedDetails: game.entries
                            .filter((e) => !e.isAlive)
                            .map((e) => ({ userId: e.userId, username: e.user.username, eliminatedAtQ: e.eliminatedAtQ })),
                        lifeEvents: lifeEventsHistory.map((ev) => ({
                            userId: ev.userId,
                            username: ev.data?.username ?? '',
                            qIdx: ev.data?.qIdx ?? null,
                            livesLeft: ev.data?.livesLeft ?? null,
                            createdAt: ev.createdAt,
                        })),
                    });
                }
                // If a question is currently active, resend it so reconnecting clients catch up
                if (state.activeQuestionPayload) {
                    socket.emit('game:question', state.activeQuestionPayload);
                }
                // Broadcast updated connected count to the whole room
                io.to(`game:${gameId}`).emit('lobby:update', {
                    gameId,
                    playerCount: connectedCount,
                    pot,
                });
                console.log(`[Socket] User ${userId} joined lobby for game ${gameId}`);
            }
            catch (err) {
                console.error('[Socket] join:lobby error', err);
                socket.emit('error', { message: 'Failed to join lobby' });
            }
        });
        // ─── SUBMIT ANSWER ────────────────────────────────────────────────────────
        socket.on('submit:answer', async ({ gameId, userId, qIdx, answerIndex }) => {
            try {
                const state = activeGames.get(gameId);
                if (!state) {
                    socket.emit('error', { message: 'Game not active', code: 'GAME_NOT_ACTIVE' });
                    return;
                }
                const answerKey = `${userId}:${qIdx}`;
                // Allow answer changes: if already answered this question, just update in-memory and re-confirm
                if (state.answers.has(answerKey)) {
                    const gq = await prisma.gameQuestion.findFirst({
                        where: { gameId, order: qIdx + 1 },
                        include: { question: true },
                    });
                    if (!gq)
                        return;
                    const correct = answerIndex === gq.question.correctIndex;
                    state.answers.set(answerKey, { answerIndex, correct });
                    socket.emit('answer:result', { gameId, qIdx, correct, correctIndex: gq.question.correctIndex });
                    return;
                }
                // First submission for this question — reject if player is not alive
                const entry = await prisma.gameEntry.findFirst({
                    where: { userId, gameId, isAlive: true },
                    select: { id: true },
                });
                if (!entry)
                    return; // silently ignore eliminated / unregistered players
                const { correct, correctIndex } = await gameService.recordAnswer(gameId, userId, qIdx, answerIndex);
                state.answers.set(answerKey, { answerIndex, correct });
                socket.emit('answer:result', { gameId, qIdx, correct, correctIndex });
                // Check if all alive players have answered
                const aliveEntries = await prisma.gameEntry.findMany({
                    where: { gameId, isAlive: true },
                });
                const answeredCount = aliveEntries.filter((e) => state.answers.has(`${e.userId}:${qIdx}`)).length;
                if (answeredCount >= aliveEntries.length) {
                    await revealQuestion(io, gameId, qIdx);
                }
            }
            catch (err) {
                console.error('[Socket] submit:answer error', err);
                socket.emit('error', { message: 'Failed to submit answer' });
            }
        });
        // ─── SEND CHAT ────────────────────────────────────────────────────────────
        socket.on('send:chat', ({ gameId, userId, username, message }) => {
            try {
                console.log(`[Socket] send:chat from ${userId} in game ${gameId}: "${message?.slice(0, 40)}"`);
                // Basic content validation
                if (!message || message.trim().length === 0 || message.length > 200) {
                    socket.emit('error', { message: 'Invalid message', code: 'INVALID_MESSAGE' });
                    return;
                }
                // Bad-word filter
                if (containsBadWord(message)) {
                    socket.emit('error', { message: 'Mensaje no permitido', code: 'MODERATED' });
                    return;
                }
                // Rate limit: 1 message per second (tracked by socket)
                const lastMsgKey = `lastMsg:${socket.id}`;
                const lastMsg = socket[lastMsgKey];
                const now = Date.now();
                if (lastMsg && now - lastMsg < 1000) {
                    socket.emit('error', { message: 'Too many messages', code: 'RATE_LIMITED' });
                    return;
                }
                socket[lastMsgKey] = now;
                const state = getOrCreateGameState(gameId);
                const chatMsg = {
                    user: username || userId,
                    message: message.trim(),
                    timestamp: new Date().toISOString(),
                };
                state.chatMessages.push(chatMsg);
                // Keep only last 200 messages
                if (state.chatMessages.length > 200) {
                    state.chatMessages = state.chatMessages.slice(-200);
                }
                io.to(`game:${gameId}`).emit('lobby:chat', { ...chatMsg, senderId: userId });
            }
            catch (err) {
                console.error('[Socket] send:chat error', err);
                socket.emit('error', { message: 'Failed to send message' });
            }
        });
        // ─── USE LIFE ─────────────────────────────────────────────────────────────
        socket.on('use:life', async ({ gameId, userId }) => {
            try {
                const user = await prisma.user.findUnique({ where: { id: userId }, select: { lives: true, username: true } });
                if (!user || user.lives <= 0) {
                    socket.emit('life:result', { success: false, message: 'No tienes vidas disponibles' });
                    return;
                }
                const currentQ = activeGames.get(gameId)?.currentQuestion ?? null;
                const [updatedUser] = await prisma.$transaction([
                    prisma.user.update({ where: { id: userId }, data: { lives: { decrement: 1 } } }),
                    prisma.gameEntry.update({ where: { userId_gameId: { userId, gameId } }, data: { isAlive: true } }),
                ]);
                // Permanent DB record of life usage
                prisma.gameEvent.create({
                    data: { gameId, type: 'LIFE_USED', userId, data: { qIdx: currentQ, livesLeft: updatedUser.lives, username: user.username } },
                }).catch(() => { });
                // Broadcast to the room so admin sees it in real-time
                io.to(`game:${gameId}`).emit('game:life_used', {
                    gameId, userId, username: user.username, livesLeft: updatedUser.lives, qIdx: currentQ,
                });
                socket.emit('life:result', { success: true, livesLeft: updatedUser.lives });
            }
            catch (err) {
                console.error('[Socket] use:life error', err);
                socket.emit('life:result', { success: false, message: 'Error al usar vida' });
            }
        });
        // ─── HOST: NEXT QUESTION (advances waiting game loop) ───────────────────
        socket.on('host:next', ({ gameId }) => {
            const resolve = nextQuestionResolvers.get(gameId);
            if (resolve) {
                nextQuestionResolvers.delete(gameId);
                resolve();
            }
        });
        // ─── HOST: SEND SPECIFIC QUESTION (manual control, bypasses loop) ────────
        socket.on('host:send_question', async ({ gameId, qIdx }) => {
            try {
                console.log(`[Socket] host:send_question game=${gameId} qIdx=${qIdx}`);
                const gameQuestion = await prisma.gameQuestion.findFirst({
                    where: { gameId, order: qIdx + 1 },
                    include: { question: true },
                });
                if (!gameQuestion)
                    return;
                const game = await prisma.game.findUnique({ where: { id: gameId }, select: { timePerQuestion: true, maxQuestions: true } });
                const timeLimit = game?.timePerQuestion ?? 10;
                const totalQuestions = game?.maxQuestions ?? 12;
                const state = getOrCreateGameState(gameId);
                state.currentQuestion = qIdx;
                const questionPayload = {
                    gameId,
                    qIdx,
                    questionIndex: qIdx,
                    questionNumber: qIdx + 1,
                    totalQuestions,
                    question: gameQuestion.question.text,
                    options: gameQuestion.question.options,
                    timeLimit,
                };
                state.activeQuestionPayload = questionPayload;
                io.to(`game:${gameId}`).emit('game:question', questionPayload);
                // Auto-reveal after timeLimit seconds
                setTimeout(async () => {
                    try {
                        await revealQuestion(io, gameId, qIdx);
                        io.to(`game:${gameId}`).emit('game:waiting_next', { gameId });
                        nextQuestionResolvers.set(gameId, () => { });
                    }
                    catch (err) {
                        console.error('[Socket] auto-reveal error', err);
                    }
                }, timeLimit * 1000);
            }
            catch (err) {
                console.error('[Socket] host:send_question error', err);
            }
        });
        // ─── DISCONNECT ───────────────────────────────────────────────────────────
        socket.on('disconnect', () => {
            console.log(`[Socket] Client disconnected: ${socket.id}`);
            // Update connected count for any game room this socket was in
            for (const [gameId, state] of activeGames.entries()) {
                // Find and remove disconnected user (match by socket rooms)
                const rooms = socket.rooms;
                if (rooms.has(`game:${gameId}`)) {
                    // We don't know userId here, but we can broadcast the new room size
                    const roomSize = io.sockets.adapter.rooms.get(`game:${gameId}`)?.size ?? 0;
                    io.to(`game:${gameId}`).emit('lobby:update', { gameId, playerCount: roomSize });
                }
            }
        });
    });
}
// ─── GAME FLOW HELPERS ──────────────────────────────────────────────────────
/**
 * Start a game: emit lobby countdown then begin questions.
 */
async function broadcastGameStart(io, gameId, autoPlay = false) {
    const game = await prisma.game.findUnique({
        where: { id: gameId },
        include: {
            questions: {
                include: { question: true },
                orderBy: { order: 'asc' },
            },
        },
    });
    if (!game)
        return;
    const state = getOrCreateGameState(gameId);
    state.currentQuestion = 0;
    // Countdown: 5 seconds
    for (let s = 5; s >= 1; s--) {
        io.to(`game:${gameId}`).emit('game:countdown', { gameId, seconds: s });
        await sleep(1000);
    }
    // Send questions sequentially
    await runGameQuestions(io, game, state, autoPlay);
}
async function runGameQuestions(io, game, state, autoPlay = false) {
    const { id: gameId, questions, timePerQuestion } = game;
    for (let i = 0; i < questions.length; i++) {
        const gq = questions[i];
        state.currentQuestion = i;
        // Emit question (hide correctIndex)
        const qPayload = {
            gameId,
            qIdx: i,
            question: gq.question.text,
            options: gq.question.options,
        };
        state.activeQuestionPayload = qPayload;
        io.to(`game:${gameId}`).emit('game:question', qPayload);
        // Wait for answers or timeout
        await sleep(timePerQuestion * 1000);
        // Reveal answer
        await revealQuestion(io, gameId, i);
        // Check if anyone is still alive
        const aliveCount = await prisma.gameEntry.count({
            where: { gameId, isAlive: true },
        });
        if (aliveCount === 0)
            break;
        if (autoPlay) {
            // Auto mode: pause 4s so players can see the reveal, then advance automatically
            await sleep(4000);
        }
        else {
            // Manual mode: wait for host to press "next question"
            await waitForHost(io, gameId);
        }
    }
    // Finish the game
    await endGame(io, gameId);
}
async function revealQuestion(io, gameId, qIdx) {
    const state = activeGames.get(gameId);
    if (!state) {
        console.warn(`[revealQuestion] No active state for game ${gameId} qIdx=${qIdx}`);
        return;
    }
    // Prevent double-reveal (e.g. early-trigger + auto-timer both firing)
    if (state.revealedQuestions.has(qIdx))
        return;
    state.revealedQuestions.add(qIdx);
    try {
        const gameQuestion = await prisma.gameQuestion.findFirst({
            where: { gameId, order: qIdx + 1 },
            include: { question: true },
        });
        if (!gameQuestion) {
            throw new Error(`No question found for game ${gameId} order=${qIdx + 1}`);
        }
        const correctIndex = gameQuestion.question.correctIndex;
        // Count answers per option and collect wrong-answer eliminations
        const counts = [0, 0, 0, 0];
        const eliminated = [];
        for (const [key, val] of state.answers.entries()) {
            if (!key.endsWith(`:${qIdx}`))
                continue;
            counts[val.answerIndex] = (counts[val.answerIndex] ?? 0) + 1;
            if (!val.correct) {
                const userId = key.split(':')[0];
                eliminated.push(userId);
            }
        }
        // Eliminate alive players who didn't answer this question at all
        const aliveEntries = await prisma.gameEntry.findMany({
            where: { gameId, isAlive: true },
            select: { id: true, userId: true, eliminatedAtQ: true },
        });
        const noAnswerEntries = aliveEntries.filter((e) => !state.answers.has(`${e.userId}:${qIdx}`));
        if (noAnswerEntries.length > 0) {
            // For no-answer players, set eliminatedAtQ only if not already set (first elimination)
            for (const e of noAnswerEntries) {
                await prisma.gameEntry.update({
                    where: { id: e.id },
                    data: { isAlive: false, ...(e.eliminatedAtQ == null ? { eliminatedAtQ: qIdx } : {}) },
                });
                eliminated.push(e.userId);
            }
        }
        // Restore alive status for players whose FINAL answer is correct
        // (covers changed wrong→correct before the 2-second lock)
        const correctFinalUserIds = [];
        for (const [key, val] of state.answers.entries()) {
            if (!key.endsWith(`:${qIdx}`))
                continue;
            if (val.correct)
                correctFinalUserIds.push(key.split(':')[0]);
        }
        if (correctFinalUserIds.length > 0) {
            await prisma.gameEntry.updateMany({
                where: { gameId, userId: { in: correctFinalUserIds } },
                data: { isAlive: true },
            });
        }
        // Query usernames + eliminatedAtQ for eliminated players and current alive roster
        const uniqueEliminated = [...new Set(eliminated)];
        const [eliminatedEntries, finalAliveEntries] = await Promise.all([
            uniqueEliminated.length > 0
                ? prisma.gameEntry.findMany({
                    where: { gameId, userId: { in: uniqueEliminated } },
                    select: { userId: true, eliminatedAtQ: true, user: { select: { username: true } } },
                })
                : Promise.resolve([]),
            prisma.gameEntry.findMany({
                where: { gameId, isAlive: true },
                select: { userId: true, user: { select: { username: true } } },
            }),
        ]);
        const eliminatedDetails = eliminatedEntries.map((e) => ({ userId: e.userId, username: e.user.username, eliminatedAtQ: e.eliminatedAtQ }));
        const aliveDetails = finalAliveEntries.map((e) => ({ userId: e.userId, username: e.user.username }));
        state.activeQuestionPayload = undefined;
        io.to(`game:${gameId}`).emit('game:reveal', {
            gameId,
            correctIndex,
            counts,
            eliminated,
            eliminatedDetails,
            aliveDetails,
        });
    }
    catch (err) {
        console.error(`[revealQuestion] Error for game ${gameId} qIdx=${qIdx}:`, err);
        // Still emit a fallback reveal so clients don't freeze
        io.to(`game:${gameId}`).emit('game:reveal', { gameId, correctIndex: 0, counts: [0, 0, 0, 0], eliminated: [] });
    }
}
function waitForHost(io, gameId) {
    return new Promise((resolve) => {
        nextQuestionResolvers.set(gameId, resolve);
        io.to(`game:${gameId}`).emit('game:waiting_next', { gameId });
    });
}
async function endGame(io, gameId) {
    try {
        // Resolve any pending host:next wait so the loop can exit
        const pending = nextQuestionResolvers.get(gameId);
        if (pending) {
            nextQuestionResolvers.delete(gameId);
            pending();
        }
        const { winner, winners, prize } = await gameService.finishGame(gameId);
        io.to(`game:${gameId}`).emit('game:finish', {
            gameId,
            winner,
            winners,
            prize,
        });
        // Clean up game state
        activeGames.delete(gameId);
    }
    catch (err) {
        console.error('[Socket] endGame error', err);
    }
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
//# sourceMappingURL=gameSocket.js.map