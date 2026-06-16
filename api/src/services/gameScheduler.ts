import { PrismaClient, Prisma } from '@prisma/client';
import { Server as SocketServer } from 'socket.io';
import { sendBroadcast } from './pushNotifications';
import { getNextOccurrenceUTC } from '../controllers/games.controller';
import { broadcastGameStart } from '../socket/gameSocket';
import * as gameService from './game.service';

const prisma = new PrismaClient();

const PRIZE_FMT = (n: number) =>
  `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 0 })}`;

async function notifyAllUsers(
  title: string,
  body: string,
  type: string,
  gameId: string
) {
  const users = await prisma.user.findMany({ select: { id: true } });
  if (users.length === 0) return 0;

  await prisma.notification.createMany({
    data: users.map((u) => ({ userId: u.id, type, title, body, isRead: false })),
    skipDuplicates: false,
  });

  return sendBroadcast(title, body, { data: { type, gameId } });
}

async function fireScheduledNotifications(now: Date) {
  const pending = await prisma.scheduledNotification.findMany({
    where: { scheduledFor: { lte: now }, sentAt: null },
  });

  for (const notif of pending) {
    let userIds: string[];
    if (notif.target === 'user' && notif.userEmail) {
      const user = await prisma.user.findUnique({ where: { email: notif.userEmail }, select: { id: true } });
      userIds = user ? [user.id] : [];
    } else if (notif.target === 'vip') {
      const users = await prisma.user.findMany({ where: { isVip: true }, select: { id: true } });
      userIds = users.map((u) => u.id);
    } else if (notif.target === 'game' && notif.gameId) {
      const entries = await prisma.gameEntry.findMany({
        where: { gameId: notif.gameId },
        select: { userId: true },
      });
      userIds = entries.map((e) => e.userId);
    } else {
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
      await sendBroadcast(notif.title, notif.body, {
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

async function tick(io: SocketServer) {
  const now = new Date();
  const in1h5m = new Date(now.getTime() + 65 * 60 * 1000);  // look-ahead window for 1h
  const in10m  = new Date(now.getTime() + 10 * 60 * 1000);  // look-ahead window for 5m

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
      await notifyAllUsers(
        `⏰ En 1 hora: ${game.title}`,
        `El gran juego comienza en 1 hora. Premio: ${prize}. ¡Prepárate!`,
        'reminder',
        game.id
      );
      await prisma.game.update({ where: { id: game.id }, data: { notified1h: true } });
      console.log(`[scheduler] 1h reminder sent → ${game.title}`);
    }

    // ── 5-minute reminder (fire between 3–7 min before) ──────────────────────
    if (!game.notified5m && msUntil >= 3 * 60 * 1000 && msUntil <= 7 * 60 * 1000) {
      await notifyAllUsers(
        `🔥 ¡Ya casi! ${game.title}`,
        `El juego inicia en 5 minutos. Premio: ${prize}. ¡No te lo pierdas!`,
        'reminder',
        game.id
      );
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
      broadcastGameStart(io, game.id, true).catch((err) =>
        console.error(`[scheduler] autoPlay error for ${game.id}:`, err)
      );
      console.log(`[scheduler] auto-started recurring game → ${game.title} (${game.id})`);
    } catch (err) {
      console.error(`[scheduler] failed to auto-start ${game.id}:`, err);
    }
  }

  // ── Auto-finish LIVE games stuck for more than 1 hour ────────────────────────
  // Uses updatedAt (last status change) so manually-run games aren't killed mid-game.
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const stuckLiveGames = await prisma.game.findMany({
    where: {
      status: 'LIVE',
      updatedAt: { lt: oneHourAgo },
    },
  });

  for (const game of stuckLiveGames) {
    try {
      await gameService.finishGame(game.id);
      console.log(`[scheduler] force-finished stuck LIVE game → ${game.title} (${game.id})`);
    } catch (err) {
      console.error(`[scheduler] failed to force-finish ${game.id}:`, err);
    }
  }

  // ── Auto-cancel LOBBY games stuck for more than 1 hour ────────────────────────
  // Games that opened registration but were never started get cancelled and, if
  // recurring, their next occurrence is scheduled automatically.
  const stuckLobbyGames = await prisma.game.findMany({
    where: {
      status: 'LOBBY',
      updatedAt: { lt: oneHourAgo },
    },
  });

  for (const game of stuckLobbyGames) {
    try {
      await gameService.cancelStuckLobby(game.id);
    } catch (err) {
      console.error(`[scheduler] failed to cancel stuck LOBBY game ${game.id}:`, err);
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
    await notifyAllUsers(
      `🎮 ¡Acaba de iniciar! ${game.title}`,
      `El juego ya comenzó. Premio: ${prize}. ¡Entra ahora y no te lo pierdas!`,
      'reminder',
      game.id
    );
    await prisma.game.update({ where: { id: game.id }, data: { notifiedStart: true } });
    console.log(`[scheduler] start notification sent → ${game.title}`);
  }
}

export function startGameScheduler(io: SocketServer) {
  console.log('[scheduler] Game notification scheduler started (interval: 60s)');
  tick(io).catch((err) => console.error('[scheduler] tick error:', err));
  setInterval(() => {
    tick(io).catch((err) => console.error('[scheduler] tick error:', err));
  }, 60 * 1000);
}
