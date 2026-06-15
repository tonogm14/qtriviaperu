import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export type LedgerType =
  | 'PRIZE_WIN'
  | 'ENTRY_FEE'
  | 'WITHDRAWAL_REQUEST'
  | 'WITHDRAWAL_REFUND'
  | 'BONUS'
  | 'ADJUSTMENT';

export type LedgerRefType = 'GAME' | 'WITHDRAWAL' | 'ADMIN';

/**
 * Record a ledger entry within an existing transaction client.
 * Caller must supply the balanceAfter value (computed from the balance update).
 */
export function ledgerEntry(
  tx: Prisma.TransactionClient,
  userId: string,
  opts: {
    type: LedgerType;
    amount: number;
    balanceAfter: number;
    description: string;
    referenceId?: string;
    referenceType?: LedgerRefType;
  }
) {
  return tx.balanceLedger.create({
    data: {
      userId,
      type: opts.type,
      amount: opts.amount,
      balanceAfter: opts.balanceAfter,
      description: opts.description,
      referenceId: opts.referenceId,
      referenceType: opts.referenceType,
    },
  });
}

export async function getUserLedger(
  userId: string,
  page: number,
  limit: number
) {
  const skip = (page - 1) * limit;
  const [entries, total] = await Promise.all([
    prisma.balanceLedger.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.balanceLedger.count({ where: { userId } }),
  ]);
  return { entries, total, page, limit };
}
