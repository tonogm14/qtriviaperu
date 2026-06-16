import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { PrismaClient, GameStatus, GameType, Prisma } from '@prisma/client';
import * as gameService from '../services/game.service';
import { broadcastGameStart, closeRegistrationOnly, isRegistrationClosed } from '../socket/gameSocket';
import { io } from '../index';
import { AuthRequest } from '../types';
import { AppError } from '../middleware/errorHandler';

const UPLOADS_DIR = path.join(__dirname, '../../uploads/prizes');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

export const prizeImageUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, _file, cb) => cb(null, `${req.params.id}${path.extname(_file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Solo imágenes JPEG, PNG, WebP o GIF'));
  },
}).single('image');

function param(req: Request, key: string): string {
  const val = req.params[key];
  return Array.isArray(val) ? val[0] : (val ?? '');
}

const prisma = new PrismaClient();

// ─── Recurring game helpers ───────────────────────────────────────────────────

// Lima is UTC-5 with no DST. Compute the next UTC datetime for a Lima HH:MM.
export function getNextOccurrenceUTC(recurringTime: string): Date {
  const [hh, mm] = recurringTime.split(':').map(Number);
  const now = new Date();

  // Get today's date in Lima (UTC-5)
  const limaToday = new Date(now.getTime() - 5 * 60 * 60 * 1000);

  // Build today's occurrence in UTC (Lima HH:MM → UTC HH+5:MM)
  const occurrence = new Date(Date.UTC(
    limaToday.getUTCFullYear(),
    limaToday.getUTCMonth(),
    limaToday.getUTCDate(),
    hh + 5,  // JS Date handles overflow (26 = next day 02:00 UTC)
    mm,
    0, 0
  ));

  // If the occurrence has already passed, roll to tomorrow
  if (now.getTime() >= occurrence.getTime()) {
    occurrence.setUTCDate(occurrence.getUTCDate() + 1);
  }

  return occurrence;
}

// Inject computed scheduledAt for recurring games
function withNextOccurrence<T extends { isRecurring: boolean; recurringTime: string | null; scheduledAt: Date }>(game: T): T {
  if (game.isRecurring && game.recurringTime && game.scheduledAt <= new Date()) {
    return { ...game, scheduledAt: getNextOccurrenceUTC(game.recurringTime) };
  }
  return game;
}

// ─── Validation schemas ───────────────────────────────────────────────────────

const prizeSlotSchema = z.object({
  place: z.number().int().min(1),
  percent: z.number().min(0).max(100),
});

const createGameSchema = z.object({
  title: z.string().min(3).max(200),
  type: z.nativeEnum(GameType).default(GameType.SPECIAL),
  scheduledAt: z.coerce.date().optional(),
  prize: z.number().positive(),
  entryFee: z.number().min(0).default(0),
  maxQuestions: z.number().int().min(1).max(50).default(12),
  timePerQuestion: z.number().int().min(5).max(60).default(10),
  host: z.string().optional(),
  category: z.string().optional(),
  winnerMode: z.enum(['SINGLE', 'ALL_CORRECT', 'RANKED_SLOTS']).default('SINGLE'),
  prizeSlots: z.array(prizeSlotSchema).optional().nullable(),
  prizeMode: z.enum(['FIXED', 'POT', 'POT_PERCENT']).default('FIXED'),
  potPercent: z.number().min(1).max(100).default(100),
  streamUrl: z.string().url().optional().nullable(),
  warmUpQuestionId: z.string().optional().nullable(),
  prizeType: z.enum(['MONETARY', 'PHYSICAL']).default('MONETARY'),
  prizeTitle: z.string().max(200).optional().nullable(),
  prizeDescription: z.string().max(1000).optional().nullable(),
});

const updateGameSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  type: z.nativeEnum(GameType).optional(),
  scheduledAt: z.coerce.date().optional(),
  recurringTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  prize: z.number().min(0).optional(),
  entryFee: z.number().min(0).optional(),
  maxQuestions: z.number().int().min(1).max(50).optional(),
  timePerQuestion: z.number().int().min(5).max(60).optional(),
  host: z.string().optional(),
  category: z.string().optional(),
  status: z.nativeEnum(GameStatus).optional(),
  winnerMode: z.enum(['SINGLE', 'ALL_CORRECT', 'RANKED_SLOTS']).optional(),
  prizeSlots: z.array(prizeSlotSchema).optional().nullable(),
  prizeMode: z.enum(['FIXED', 'POT', 'POT_PERCENT']).optional(),
  potPercent: z.number().min(1).max(100).optional(),
  streamUrl: z.string().url().optional().nullable(),
  warmUpQuestionId: z.string().optional().nullable(),
  prizeType: z.enum(['MONETARY', 'PHYSICAL']).optional(),
  prizeTitle: z.string().max(200).optional().nullable(),
  prizeDescription: z.string().max(1000).optional().nullable(),
});

const listGamesSchema = z.object({
  status: z.nativeEnum(GameStatus).optional(),
  date: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// ─── Controllers ──────────────────────────────────────────────────────────────

export async function listGames(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = listGamesSchema.parse(req.query);
    const { page, limit, status, date } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.GameWhereInput = {};
    if (status) where.status = status;
    if (date) {
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      where.scheduledAt = { gte: dayStart, lte: dayEnd };
    }

    // Recurring games are always included regardless of date filter
    const recurringWhere: Prisma.GameWhereInput = status
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
  } catch (err) {
    next(err);
  }
}

export async function getGame(req: Request, res: Response, next: NextFunction): Promise<void> {
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
      res.status(404).json({ error: 'Juego no encontrado', code: 'NOT_FOUND' });
      return;
    }

    res.json({ data: withNextOccurrence(game) });
  } catch (err) {
    next(err);
  }
}

export async function createGame(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = createGameSchema.parse(req.body);
    const { prizeSlots, ...rest } = body;
    const scheduledAt = rest.scheduledAt ?? new Date();
    const game = await prisma.game.create({
      data: {
        ...rest,
        scheduledAt,
        type: rest.type,
        prizeSlots: prizeSlots !== undefined ? (prizeSlots ?? Prisma.JsonNull) : undefined,
      },
    });
    res.status(201).json({ data: game });
  } catch (err) {
    next(err);
  }
}

export async function updateGame(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = updateGameSchema.parse(req.body);
    const { prizeSlots, ...rest } = body;
    const data: Prisma.GameUpdateInput = {
      ...rest,
      ...(prizeSlots !== undefined ? { prizeSlots: prizeSlots ?? Prisma.JsonNull } : {}),
    };

    // For recurring games updating time: recompute scheduledAt only if not explicitly provided
    if (body.recurringTime) {
      data.isRecurring = true;
      if (!body.scheduledAt) {
        data.scheduledAt = getNextOccurrenceUTC(body.recurringTime);
      }
    }

    const game = await prisma.game.update({
      where: { id: param(req, 'id') },
      data,
    });
    res.json({ data: withNextOccurrence(game) });
  } catch (err) {
    next(err);
  }
}

export async function deleteGame(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const game = await prisma.game.findUnique({ where: { id: param(req, 'id') } });
    if (!game) throw new AppError('Juego no encontrado', 404, 'NOT_FOUND');
    if (game.isRecurring) throw new AppError('No se puede eliminar un juego recurrente (Gratis/VIP)', 400, 'CANNOT_DELETE_RECURRING');

    await prisma.game.delete({ where: { id: param(req, 'id') } });
    res.json({ data: { message: 'Juego eliminado correctamente' } });
  } catch (err) {
    next(err);
  }
}

// ─── Questions for a game ─────────────────────────────────────────────────────

export async function setGameQuestions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const gameId = param(req, 'id');
    const { questionIds } = z.object({
      questionIds: z.array(z.string()).min(1),
    }).parse(req.body);

    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game) throw new AppError('Juego no encontrado', 404, 'NOT_FOUND');

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
  } catch (err) {
    next(err);
  }
}

// ─── Player actions ───────────────────────────────────────────────────────────

export async function getMyEntry(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const gameId = param(req as Request, 'id');
    const userId = req.user!.id;
    const entry = await prisma.gameEntry.findUnique({
      where: { userId_gameId: { userId, gameId } },
    });
    res.json({ data: { joined: !!entry } });
  } catch (err) {
    next(err);
  }
}

export async function joinGame(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const gameId = param(req as Request, 'id');
    if (isRegistrationClosed(gameId)) {
      res.status(400).json({ error: 'El registro para este juego ya cerró', code: 'GAME_NOT_JOINABLE' });
      return;
    }
    await gameService.joinGame(req.user!.id, gameId);
    res.json({ data: { message: 'Te uniste al juego correctamente' } });
  } catch (err) {
    next(err);
  }
}

export async function startGame(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const gameId = param(req as Request, 'id');
    await gameService.startGame(gameId);
    // Registration stays open — admin closes manually via closeRegistration
    res.json({ data: { message: 'Juego iniciado correctamente' } });
  } catch (err) {
    next(err);
  }
}

// Close registration and fire the question loop
export async function closeRegistration(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const gameId = param(req as Request, 'id');
    const game = await prisma.game.findUnique({ where: { id: gameId }, select: { status: true } });
    if (!game) { res.status(404).json({ error: 'Juego no encontrado' }); return; }
    if (game.status !== 'LIVE') {
      res.status(400).json({ error: 'El juego debe estar EN VIVO para cerrar el registro', code: 'INVALID_STATUS' });
      return;
    }
    closeRegistrationOnly(io, gameId).catch((err) =>
      console.error('[closeRegistration] closeRegistrationOnly error', err)
    );
    res.json({ data: { message: 'Registro cerrado' } });
  } catch (err) {
    next(err);
  }
}

export async function getGameEntries(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const gameId = param(req, 'id');
    const search = String(req.query.search ?? '').trim().toLowerCase();

    const game = await prisma.game.findUnique({ where: { id: gameId }, select: { winnerMode: true } });
    const orderBy: any[] = game?.winnerMode === 'RANKED_SLOTS'
      ? [{ score: 'desc' }, { finishedAt: 'asc' }]
      : [{ score: 'desc' }, { joinedAt: 'asc' }];

    const entries = await prisma.gameEntry.findMany({
      where: { gameId },
      orderBy,
      include: { user: { select: { id: true, username: true, name: true, email: true, isVip: true } } },
    });

    const result = entries
      .filter((e) => {
        if (!search) return true;
        return (
          e.user.username.toLowerCase().includes(search) ||
          e.user.name.toLowerCase().includes(search) ||
          e.user.email.toLowerCase().includes(search)
        );
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
  } catch (err) {
    next(err);
  }
}

export async function getGameLog(req: Request, res: Response, next: NextFunction): Promise<void> {
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
    if (!game) throw new AppError('Juego no encontrado', 404, 'NOT_FOUND');
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
  } catch (err) { next(err) }
}

export async function getGameLeaderboard(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const gameId = param(req, 'id');
    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game) throw new AppError('Juego no encontrado', 404, 'NOT_FOUND');

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
  } catch (err) {
    next(err);
  }
}

export async function uploadPrizeImage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const gameId = param(req, 'id');
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) { res.status(400).json({ error: 'No se recibió imagen' }); return; }

    // Delete previous prize image for this game (any extension)
    const existing = await prisma.game.findUnique({ where: { id: gameId }, select: { prizeImage: true } });
    if (existing?.prizeImage) {
      const oldPath = path.join(UPLOADS_DIR, path.basename(existing.prizeImage));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const imageUrl = `/uploads/prizes/${file.filename}`;
    await prisma.game.update({ where: { id: gameId }, data: { prizeImage: imageUrl } });
    res.json({ data: { prizeImage: imageUrl } });
  } catch (err) {
    next(err);
  }
}
