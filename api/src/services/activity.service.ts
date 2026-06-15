import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export type ActivityType =
  | 'login'
  | 'logout'
  | 'register'
  | 'profile_update'
  | 'password_change'
  | 'page_view'
  | 'tap'
  | 'join_game'
  | 'withdrawal_request'
  | 'buy_lives'
  | 'order_merch'
  | 'push_open'
  | 'notification_view'
  | 'admin_login'
  | 'admin_action'
  | 'unknown';

export async function logActivity(opts: {
  userId: string;
  type: ActivityType;
  screen?: string;
  action?: string;
  meta?: Record<string, unknown>;
  ip?: string;
}) {
  try {
    await prisma.activityLog.create({
      data: {
        userId: opts.userId,
        type:   opts.type,
        screen: opts.screen ?? null,
        action: opts.action?.slice(0, 120) ?? null,
        meta:   opts.meta ? JSON.stringify(opts.meta).slice(0, 500) : null,
        ip:     opts.ip ?? null,
      },
    });
  } catch {
    // Activity logging should never crash a request
  }
}
