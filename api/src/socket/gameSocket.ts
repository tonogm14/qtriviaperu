import { Server as SocketServer, Socket } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import * as gameService from '../services/game.service';
import {
  JoinLobbyPayload,
  SubmitAnswerPayload,
  SendChatPayload,
  ChatMessage,
} from '../types';

const prisma = new PrismaClient();

// ─── Bad-word cache (refreshed every 5 min) ──────────────────────────────────
let badWordCache: Set<string> = new Set();
let moderationEnabled = true;

async function refreshModerationCache() {
  try {
    const [words, config] = await Promise.all([
      prisma.badWord.findMany({ select: { word: true } }),
      prisma.appConfig.findUnique({ where: { id: 'main' }, select: { chatModeration: true } }),
    ]);
    badWordCache = new Set(words.map((w) => w.word));
    moderationEnabled = config?.chatModeration ?? true;
  } catch { /* keep previous cache on error */ }
}

refreshModerationCache();
setInterval(refreshModerationCache, 5 * 60 * 1000);

function containsBadWord(text: string): boolean {
  if (!moderationEnabled || badWordCache.size === 0) return false;
  const lower = text.toLowerCase();
  for (const word of badWordCache) {
    if (lower.includes(word)) return true;
  }
  return false;
}

// In-memory state for active games
interface GameState {
  players: Set<string>;
  answers: Map<string, { answerIndex: number; correct: boolean }>;
  chatMessages: ChatMessage[];
  currentQuestion: number;
  revealedQuestions: Set<number>; // prevents double-reveal per question
  questionTimer?: ReturnType<typeof setTimeout>;
}

const activeGames = new Map<string, GameState>();
const nextQuestionResolvers = new Map<string, () => void>();

// Tracks games whose registration has been explicitly closed
const closedRegistrations = new Set<string>();
export function isRegistrationClosed(gameId: string): boolean {
  return closedRegistrations.has(gameId);
}

// Tracks games where registration is closed but question loop hasn't started yet
const pendingGameStart = new Set<string>();

function getOrCreateGameState(gameId: string): GameState {
  if (!activeGames.has(gameId)) {
    activeGames.set(gameId, {
      players: new Set(),
      answers: new Map(),
      chatMessages: [],
      currentQuestion: 0,
      revealedQuestions: new Set(),
    });
  }
  return activeGames.get(gameId)!;
}

export function initGameSocket(io: SocketServer): void {
  io.on('connection', (socket: Socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // ─── JOIN LOBBY ───────────────────────────────────────────────────────────
    socket.on('join:lobby', async ({ gameId, userId }: JoinLobbyPayload) => {
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
          isRegistrationClosed: closedRegistrations.has(gameId),
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
              username: (ev.data as Record<string, unknown>)?.username ?? '',
              qIdx: (ev.data as Record<string, unknown>)?.qIdx ?? null,
              livesLeft: (ev.data as Record<string, unknown>)?.livesLeft ?? null,
              createdAt: ev.createdAt,
            })),
          });
        }


        // Broadcast updated connected count to the whole room
        io.to(`game:${gameId}`).emit('lobby:update', {
          gameId,
          playerCount: connectedCount,
          pot,
        });

        // Re-emit waiting state to admin so the "Siguiente pregunta" button reappears after reload
        if (userId === 'admin' && (nextQuestionResolvers.has(gameId) || pendingGameStart.has(gameId))) {
          socket.emit('game:waiting_next', { gameId });
        }

        console.log(`[Socket] User ${userId} joined lobby for game ${gameId}`);
      } catch (err) {
        console.error('[Socket] join:lobby error', err);
        socket.emit('error', { message: 'Failed to join lobby' });
      }
    });

    // ─── SUBMIT ANSWER ────────────────────────────────────────────────────────
    socket.on('submit:answer', async ({ gameId, userId, qIdx, answerIndex }: SubmitAnswerPayload) => {
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
          if (!gq) return;
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
        if (!entry) return; // silently ignore eliminated / unregistered players

        const { correct, correctIndex } = await gameService.recordAnswer(gameId, userId, qIdx, answerIndex);
        state.answers.set(answerKey, { answerIndex, correct });

        socket.emit('answer:result', { gameId, qIdx, correct, correctIndex });

        // Check if all alive players have answered
        const aliveEntries = await prisma.gameEntry.findMany({
          where: { gameId, isAlive: true },
        });

        const answeredCount = aliveEntries.filter((e) =>
          state.answers.has(`${e.userId}:${qIdx}`)
        ).length;

        if (answeredCount >= aliveEntries.length) {
          await revealQuestion(io, gameId, qIdx);
        }
      } catch (err) {
        console.error('[Socket] submit:answer error', err);
        socket.emit('error', { message: 'Failed to submit answer' });
      }
    });

    // ─── SEND CHAT ────────────────────────────────────────────────────────────
    socket.on('send:chat', ({ gameId, userId, username, message }: SendChatPayload) => {
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
        const lastMsg = (socket as unknown as Record<string, unknown>)[lastMsgKey] as number | undefined;
        const now = Date.now();
        if (lastMsg && now - lastMsg < 1000) {
          socket.emit('error', { message: 'Too many messages', code: 'RATE_LIMITED' });
          return;
        }
        (socket as unknown as Record<string, unknown>)[lastMsgKey] = now;

        const state = getOrCreateGameState(gameId);
        const chatMsg: ChatMessage = {
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
      } catch (err) {
        console.error('[Socket] send:chat error', err);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // ─── USE LIFE ─────────────────────────────────────────────────────────────
    socket.on('use:life', async ({ gameId, userId }: { gameId: string; userId: string }) => {
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
        }).catch(() => {});

        // Broadcast to the room so admin sees it in real-time
        io.to(`game:${gameId}`).emit('game:life_used', {
          gameId, userId, username: user.username, livesLeft: updatedUser.lives, qIdx: currentQ,
        });

        socket.emit('life:result', { success: true, livesLeft: updatedUser.lives });
      } catch (err) {
        console.error('[Socket] use:life error', err);
        socket.emit('life:result', { success: false, message: 'Error al usar vida' });
      }
    });

    // ─── HOST: NEXT QUESTION (advances waiting game loop) ───────────────────
    socket.on('host:next', async ({ gameId }: { gameId: string }) => {
      // First press after closeRegistration: start the question loop
      if (pendingGameStart.has(gameId)) {
        pendingGameStart.delete(gameId);
        startQuestionLoop(io, gameId).catch((err) =>
          console.error('[Socket] startQuestionLoop error', err)
        );
        return;
      }
      // Subsequent presses: advance the running loop
      const resolve = nextQuestionResolvers.get(gameId);
      if (resolve) {
        nextQuestionResolvers.delete(gameId);
        resolve();
      }
    });

    // ─── HOST: END GAME (admin manually closes the game) ────────────────────
    socket.on('host:end_game', async ({ gameId }: { gameId: string }) => {
      try {
        await endGame(io, gameId);
      } catch (err) {
        console.error('[Socket] host:end_game error', err);
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
/** Close registration only — does NOT start questions. Admin triggers first question manually. */
export async function closeRegistrationOnly(io: SocketServer, gameId: string): Promise<void> {
  closedRegistrations.add(gameId);
  pendingGameStart.add(gameId);
  io.to(`game:${gameId}`).emit('game:registration_closed', { gameId });
  // Signal admin that the "Siguiente Pregunta" button should appear
  io.to(`game:${gameId}`).emit('game:waiting_next', { gameId });
}

/** Start the question loop (countdown + questions). Registration must already be closed. */
async function startQuestionLoop(io: SocketServer, gameId: string, autoPlay = false): Promise<void> {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      questions: {
        include: { question: true },
        orderBy: { order: 'asc' },
      },
    },
  });

  if (!game) return;

  let warmUpQuestion: { text: string; options: string[]; correctIndex: number } | null = null;
  if (game.warmUpQuestionId) {
    const wq = await prisma.question.findUnique({ where: { id: game.warmUpQuestionId } });
    if (wq) warmUpQuestion = { text: wq.text, options: wq.options, correctIndex: wq.correctIndex };
  }

  const state = getOrCreateGameState(gameId);
  state.currentQuestion = 0;

  // Countdown: 5 seconds
  for (let s = 5; s >= 1; s--) {
    io.to(`game:${gameId}`).emit('game:countdown', { gameId, seconds: s });
    await sleep(1000);
  }

  await runGameQuestions(io, game, state, autoPlay, warmUpQuestion);
}

/** Legacy / autoPlay entry point: closes registration then immediately starts questions. */
export async function broadcastGameStart(io: SocketServer, gameId: string, autoPlay = false): Promise<void> {
  closedRegistrations.add(gameId);
  io.to(`game:${gameId}`).emit('game:registration_closed', { gameId });
  await startQuestionLoop(io, gameId, autoPlay);
}

async function runGameQuestions(
  io: SocketServer,
  game: {
    id: string;
    questions: Array<{
      order: number;
      question: { text: string; options: string[]; correctIndex: number };
    }>;
    timePerQuestion: number;
  },
  state: GameState,
  autoPlay = false,
  warmUpQuestion: { text: string; options: string[]; correctIndex: number } | null = null,
): Promise<void> {
  const { id: gameId, questions, timePerQuestion } = game;

  // ── Warmup phase ────────────────────────────────────────────────────────────
  if (warmUpQuestion) {
    if (!autoPlay) await waitForHost(io, gameId);
    state.currentQuestion = -1;

    io.to(`game:${gameId}`).emit('game:question', {
      gameId,
      qIdx: -1,
      question: warmUpQuestion.text,
      options: warmUpQuestion.options,
      isWarmup: true,
    });

    await sleep(timePerQuestion * 1000);

    // Build answer counts from in-memory state for warmup (qIdx = -1)
    const counts = [0, 0, 0, 0];
    for (const [key, val] of state.answers.entries()) {
      if (!key.endsWith(':-1')) continue;
      counts[val.answerIndex] = (counts[val.answerIndex] ?? 0) + 1;
    }

    io.to(`game:${gameId}`).emit('game:reveal', {
      gameId,
      correctIndex: warmUpQuestion.correctIndex,
      counts,
      eliminated: [],
      eliminatedDetails: [],
      aliveDetails: [],
      isWarmup: true,
    });

    // Brief pause before first real question
    await sleep(autoPlay ? 3000 : 0);
  }

  for (let i = 0; i < questions.length; i++) {
    // In manual mode wait for host before EVERY question (including the first)
    if (!autoPlay) {
      await waitForHost(io, gameId);
    } else if (i > 0) {
      // Auto mode: pause 4s after reveal before next question
      await sleep(4000);
    }

    const gq = questions[i];
    state.currentQuestion = i;

    // Emit question (hide correctIndex)
    const qPayload = {
      gameId,
      qIdx: i,
      question: gq.question.text,
      options: gq.question.options,
    };
    io.to(`game:${gameId}`).emit('game:question', qPayload);

    // Wait for answers or timeout
    await sleep(timePerQuestion * 1000);

    // Reveal answer
    await revealQuestion(io, gameId, i);

    // Check if anyone is still alive
    const aliveCount = await prisma.gameEntry.count({
      where: { gameId, isAlive: true },
    });

    if (aliveCount === 0) {
      io.to(`game:${gameId}`).emit('game:ready_to_finish', { gameId, reason: 'all_eliminated' });
      return; // Admin must manually close via host:end_game
    }
  }

  // All questions done — notify admin to close when ready
  io.to(`game:${gameId}`).emit('game:ready_to_finish', { gameId, reason: 'questions_done' });
}

async function revealQuestion(io: SocketServer, gameId: string, qIdx: number): Promise<void> {
  const state = activeGames.get(gameId);
  if (!state) {
    console.warn(`[revealQuestion] No active state for game ${gameId} qIdx=${qIdx}`);
    return;
  }

  // Prevent double-reveal (e.g. early-trigger + auto-timer both firing)
  if (state.revealedQuestions.has(qIdx)) return;
  state.revealedQuestions.add(qIdx);

  try {
    const gameQuestion = await prisma.gameQuestion.findFirst({
      where: { gameId, order: qIdx + 1 },
      include: { question: true },
    });
    if (!gameQuestion) throw new Error(`No question found for game ${gameId} order=${qIdx + 1}`);

    const correctIndex = gameQuestion.question.correctIndex;

    // Build answer counts from in-memory state
    const counts = [0, 0, 0, 0];
    for (const [key, val] of state.answers.entries()) {
      if (!key.endsWith(`:${qIdx}`)) continue;
      counts[val.answerIndex] = (counts[val.answerIndex] ?? 0) + 1;
    }

    // Snapshot who was alive BEFORE we make any DB changes
    const prevAliveEntries = await prisma.gameEntry.findMany({
      where: { gameId, isAlive: true },
      select: { id: true, userId: true, eliminatedAtQ: true },
    });
    const prevAliveIds = new Set(prevAliveEntries.map((e) => e.userId));

    // Eliminate alive players who didn't answer this question
    const noAnswerEntries = prevAliveEntries.filter((e) => !state.answers.has(`${e.userId}:${qIdx}`));
    for (const e of noAnswerEntries) {
      await prisma.gameEntry.update({
        where: { id: e.id },
        data: { isAlive: false, ...(e.eliminatedAtQ == null ? { eliminatedAtQ: qIdx } : {}) },
      });
    }

    // Restore alive for players whose FINAL in-memory answer is correct
    const correctFinalUserIds: string[] = [];
    for (const [key, val] of state.answers.entries()) {
      if (!key.endsWith(`:${qIdx}`)) continue;
      if (val.correct) correctFinalUserIds.push(key.split(':')[0]);
    }
    if (correctFinalUserIds.length > 0) {
      await prisma.gameEntry.updateMany({
        where: { gameId, userId: { in: correctFinalUserIds } },
        data: { isAlive: true },
      });
    }

    // Query final DB state — eliminated = was alive before, not alive after
    const [finalAliveEntries, prevAliveDetails] = await Promise.all([
      prisma.gameEntry.findMany({
        where: { gameId, isAlive: true },
        select: { userId: true, user: { select: { username: true } } },
      }),
      prevAliveIds.size > 0
        ? prisma.gameEntry.findMany({
            where: { gameId, userId: { in: [...prevAliveIds] } },
            select: { userId: true, isAlive: true, eliminatedAtQ: true, user: { select: { username: true } } },
          })
        : Promise.resolve([]),
    ]);

    const finalAliveIds = new Set(finalAliveEntries.map((e) => e.userId));

    // Players who answered wrong are already isAlive=false before we snapshot prevAlive,
    // so they don't appear in prevAliveIds → finalAliveIds diff. Include them explicitly.
    const wrongAnswerIds = new Set<string>();
    for (const [key, val] of state.answers.entries()) {
      if (!key.endsWith(`:${qIdx}`)) continue;
      if (!val.correct) wrongAnswerIds.add(key.split(':')[0]);
    }

    const eliminatedThisRound = [
      ...new Set([
        ...[...prevAliveIds].filter((id) => !finalAliveIds.has(id)), // no-answer eliminations
        ...wrongAnswerIds,                                             // wrong-answer eliminations
      ]),
    ];

    // Fetch details for eliminated players who aren't already in prevAliveDetails
    const missingIds = [...wrongAnswerIds].filter((id) => !prevAliveIds.has(id));
    const missingDetails = missingIds.length > 0
      ? await prisma.gameEntry.findMany({
          where: { gameId, userId: { in: missingIds } },
          select: { userId: true, isAlive: true, eliminatedAtQ: true, user: { select: { username: true } } },
        })
      : [];
    const allEliminatedDetails = [...prevAliveDetails, ...missingDetails];

    const eliminatedDetails = allEliminatedDetails
      .filter((e) => eliminatedThisRound.includes(e.userId))
      .map((e) => ({ userId: e.userId, username: e.user.username, eliminatedAtQ: e.eliminatedAtQ }));
    const aliveDetails = finalAliveEntries.map((e) => ({ userId: e.userId, username: e.user.username }));

    io.to(`game:${gameId}`).emit('game:reveal', {
      gameId,
      correctIndex,
      counts,
      eliminated: eliminatedThisRound,
      eliminatedDetails,
      aliveDetails,
    });
  } catch (err) {
    console.error(`[revealQuestion] Error for game ${gameId} qIdx=${qIdx}:`, err);
    // Still emit a fallback reveal so clients don't freeze
    io.to(`game:${gameId}`).emit('game:reveal', { gameId, correctIndex: 0, counts: [0, 0, 0, 0], eliminated: [] });
  }
}

function waitForHost(io: SocketServer, gameId: string): Promise<void> {
  return new Promise<void>((resolve) => {
    nextQuestionResolvers.set(gameId, resolve);
    io.to(`game:${gameId}`).emit('game:waiting_next', { gameId });
  });
}

async function endGame(io: SocketServer, gameId: string): Promise<void> {
  try {
    // Resolve any pending host:next wait so the loop can exit
    const pending = nextQuestionResolvers.get(gameId);
    if (pending) { nextQuestionResolvers.delete(gameId); pending(); }

    const { winner, winners, prize } = await gameService.finishGame(gameId);

    // Archive all questions used in this game
    const usedQuestions = await prisma.gameQuestion.findMany({
      where: { gameId },
      select: { questionId: true },
    });
    if (usedQuestions.length > 0) {
      await prisma.question.updateMany({
        where: { id: { in: usedQuestions.map((q) => q.questionId) } },
        data: { isArchived: true },
      });
    }

    io.to(`game:${gameId}`).emit('game:finish', {
      gameId,
      winner,
      winners,
      prize,
    });

    // Clean up game state
    activeGames.delete(gameId);
  } catch (err) {
    console.error('[Socket] endGame error', err);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
