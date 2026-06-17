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
  recurringTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  recurringMode: z.enum(['DAILY', 'CONTINUOUS']).default('DAILY'),
  requiresCode: z.boolean().default(false),
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
  recurringMode: z.enum(['DAILY', 'CONTINUOUS']).optional(),
  requiresCode: z.boolean().optional(),
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
    // Only FREE games are recurring — all other types are one-off manual events
    const isRecurring = rest.type === GameType.FREE;
    // CONTINUOUS mode doesn't need a fixed time; use now if no scheduledAt provided
    const scheduledAt = rest.scheduledAt ?? new Date();
    // DAILY mode with recurringTime: compute next occurrence
    const computedScheduledAt =
      isRecurring && rest.recurringMode === 'DAILY' && rest.recurringTime && !rest.scheduledAt
        ? getNextOccurrenceUTC(rest.recurringTime)
        : scheduledAt;

    const game = await prisma.game.create({
      data: {
        ...rest,
        scheduledAt: computedScheduledAt,
        isRecurring,
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

    // Only FREE games are recurring — lock isRecurring to the type when type is being updated
    if (body.type !== undefined) {
      data.isRecurring = body.type === GameType.FREE;
    }
    // DAILY mode with recurringTime: recompute scheduledAt
    if (body.recurringTime && body.recurringMode !== 'CONTINUOUS') {
      if (!body.scheduledAt) {
        data.scheduledAt = getNextOccurrenceUTC(body.recurringTime);
      }
    }
    // CONTINUOUS mode: clear recurringTime (not needed)
    if (body.recurringMode === 'CONTINUOUS') {
      data.recurringTime = null;
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
    const [entry, inviteCode] = await Promise.all([
      prisma.gameEntry.findUnique({ where: { userId_gameId: { userId, gameId } } }),
      prisma.gameInviteCode.findFirst({ where: { gameId, usedById: userId } }),
    ]);
    res.json({ data: { joined: !!entry, hasInviteCode: !!inviteCode } });
  } catch (err) {
    next(err);
  }
}

export async function joinGame(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const gameId = param(req as Request, 'id');
    const userId = req.user!.id;

    if (isRegistrationClosed(gameId)) {
      res.status(400).json({ error: 'El registro para este juego ya cerró', code: 'GAME_NOT_JOINABLE' });
      return;
    }

    // If game requires an invite code, validate it
    const game = await prisma.game.findUnique({ where: { id: gameId }, select: { requiresCode: true } });
    if (game?.requiresCode) {
      const rawCode = (req.body?.code ?? '') as string;
      const code = rawCode.trim().toUpperCase();
      if (!code) {
        res.status(400).json({ error: 'Se requiere un código de acceso', code: 'CODE_REQUIRED' });
        return;
      }
      const inviteCode = await prisma.gameInviteCode.findUnique({ where: { code } });
      if (!inviteCode || inviteCode.gameId !== gameId) {
        res.status(400).json({ error: 'Código de acceso inválido', code: 'INVALID_CODE' });
        return;
      }
      if (inviteCode.usedById && inviteCode.usedById !== userId) {
        res.status(400).json({ error: 'Este código ya fue utilizado', code: 'CODE_ALREADY_USED' });
        return;
      }
      // Mark code as used (idempotent for the same user)
      if (!inviteCode.usedById) {
        await prisma.gameInviteCode.update({
          where: { id: inviteCode.id },
          data: { usedById: userId, usedAt: new Date() },
        });
      }
    }

    await gameService.joinGame(userId, gameId);
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

// ─── Invite codes ─────────────────────────────────────────────────────────────

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I, O, 1, 0
  let code = '';
  for (let i = 0; i < 8; i++) {
    if (i === 4) code += '-';
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function listInviteCodes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const gameId = param(req, 'id');
    const codes = await prisma.gameInviteCode.findMany({
      where: { gameId },
      orderBy: { createdAt: 'desc' },
      include: {
        game: { select: { id: true } },
      },
    });
    // Resolve usedBy usernames
    const userIds = codes.filter(c => c.usedById).map(c => c.usedById!);
    const users = userIds.length
      ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, username: true } })
      : [];
    const userMap = Object.fromEntries(users.map(u => [u.id, u.username]));
    res.json({ data: codes.map(c => ({ ...c, usedByUsername: c.usedById ? userMap[c.usedById] : null })) });
  } catch (err) {
    next(err);
  }
}

export async function generateInviteCodes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const gameId = param(req, 'id');
    const { count = 1, label, userEmail } = z.object({
      count: z.number().int().min(1).max(100).default(1),
      label: z.string().max(100).optional(),
      userEmail: z.string().email().optional(), // pre-assign to a specific user + auto-join
    }).parse(req.body);

    // Resolve user for pre-assignment
    let preAssignedUserId: string | null = null;
    if (userEmail) {
      const user = await prisma.user.findUnique({ where: { email: userEmail.toLowerCase() } });
      if (!user) {
        res.status(404).json({ error: `No existe ningún usuario con el correo ${userEmail}`, code: 'USER_NOT_FOUND' });
        return;
      }
      preAssignedUserId = user.id;
    }

    const created = [];
    for (let i = 0; i < count; i++) {
      let code = generateInviteCode();
      while (await prisma.gameInviteCode.findUnique({ where: { code } })) {
        code = generateInviteCode();
      }
      const record = await prisma.gameInviteCode.create({
        data: {
          gameId,
          code,
          label: label ?? null,
          usedById: preAssignedUserId,
          usedAt: preAssignedUserId ? new Date() : null,
        },
      });
      created.push(record);
    }

    // Auto-join the user to the game if pre-assigned
    if (preAssignedUserId) {
      try {
        await gameService.joinGame(preAssignedUserId, gameId);
      } catch (e: any) {
        // "already joined" is fine — just ignore
        if (e?.code !== 'ALREADY_JOINED' && e?.message !== 'Ya te uniste a este juego') {
          console.warn('[generateInviteCodes] auto-join failed:', e?.message);
        }
      }
    }

    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
}

export async function deleteInviteCode(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const codeId = param(req, 'codeId');
    const code = await prisma.gameInviteCode.findUnique({ where: { id: codeId } });
    if (!code) { res.status(404).json({ error: 'Código no encontrado' }); return; }
    if (code.usedById) { res.status(400).json({ error: 'No se puede eliminar un código ya utilizado' }); return; }
    await prisma.gameInviteCode.delete({ where: { id: codeId } });
    res.json({ data: { message: 'Código eliminado' } });
  } catch (err) {
    next(err);
  }
}
