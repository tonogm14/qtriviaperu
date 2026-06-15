import { PrismaClient, WithdrawalStatus, Prisma } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { config } from '../config';
import { ledgerEntry } from './ledger.service';
import { logActivity } from './activity.service';

const prisma = new PrismaClient();

/**
 * Generate a unique withdrawal code in format QT-XXXX-X
 */
function generateWithdrawalCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const suffix = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `QT${suffix}`;
}

async function generateUniqueCode(): Promise<string> {
  let code: string;
  let exists: boolean;

  do {
    code = generateWithdrawalCode();
    const existing = await prisma.withdrawal.findUnique({ where: { code } });
    exists = !!existing;
  } while (exists);

  return code;
}

/**
 * Request a withdrawal.
 */
export async function requestWithdrawal(
  userId: string,
  data: {
    amount: number;
    method: string;
    accountRef: string;
  }
): Promise<object> {
  const { amount, method, accountRef } = data;

  const validMethods = ['yape', 'plin', 'bcp', 'interbank', 'bbva', 'scotiabank', 'banbif', 'pichincha', 'mibanco', 'gnb', 'falabella', 'ripley'];
  if (!validMethods.includes(method)) {
    throw new AppError('Método de retiro inválido', 400, 'INVALID_METHOD');
  }

  // Minimum amount
  if (amount < config.withdrawal.minAmount) {
    throw new AppError(
      `Minimum withdrawal amount is S/${config.withdrawal.minAmount}`,
      400,
      'BELOW_MINIMUM'
    );
  }

  // Get user balance
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');

  const walletMethods = ['yape', 'plin'];
  const fee = walletMethods.includes(method) ? 0 : config.withdrawal.bankFee;
  const netAmount = amount - fee;

  if (user.balance < amount) {
    throw new AppError('Insufficient balance', 400, 'INSUFFICIENT_BALANCE');
  }

  const code = await generateUniqueCode();

  const balanceAfterWithdrawal = user.balance - amount;
  const withdrawal = await prisma.$transaction(async (tx) => {
    const w = await tx.withdrawal.create({
      data: {
        userId,
        amount,
        method,
        accountRef,
        fee,
        netAmount,
        status: WithdrawalStatus.PENDING,
        code,
      },
    });
    await tx.user.update({
      where: { id: userId },
      data: { balance: { decrement: amount } },
    });
    await tx.notification.create({
      data: {
        userId,
        type: 'bonus',
        title: 'Retiro solicitado',
        body: `Tu retiro de S/${netAmount.toFixed(2)} fue solicitado. Código: ${code}`,
      },
    });
    await ledgerEntry(tx, userId, {
      type: 'WITHDRAWAL_REQUEST',
      amount: -amount,
      balanceAfter: balanceAfterWithdrawal,
      description: `Retiro solicitado por S/${amount.toFixed(2)} vía ${method} (${code})`,
      referenceId: w.id,
      referenceType: 'WITHDRAWAL',
    });
    return w;
  });

  logActivity({ userId, type: 'withdrawal_request', action: `Retiro solicitado S/${amount.toFixed(2)} vía ${method}`, meta: { code, amount, method } });

  return withdrawal;
}

/**
 * Update withdrawal status (admin).
 */
export async function updateWithdrawalStatus(
  withdrawalId: string,
  status: WithdrawalStatus
): Promise<object> {
  const withdrawal = await prisma.withdrawal.findUnique({
    where: { id: withdrawalId },
    include: { user: true },
  });

  if (!withdrawal) throw new AppError('Withdrawal not found', 404, 'NOT_FOUND');

  await prisma.$transaction(async (tx) => {
    await tx.withdrawal.update({ where: { id: withdrawalId }, data: { status } });

    if (status === WithdrawalStatus.FAILED && withdrawal.status !== WithdrawalStatus.FAILED) {
      const balanceAfterRefund = withdrawal.user.balance + withdrawal.amount;
      await tx.user.update({
        where: { id: withdrawal.userId },
        data: { balance: { increment: withdrawal.amount } },
      });
      await tx.notification.create({
        data: {
          userId: withdrawal.userId,
          type: 'bonus',
          title: 'Retiro fallido',
          body: `Tu retiro de S/${withdrawal.amount.toFixed(2)} (${withdrawal.code}) fue rechazado. El monto fue reintegrado a tu saldo.`,
        },
      });
      await ledgerEntry(tx, withdrawal.userId, {
        type: 'WITHDRAWAL_REFUND',
        amount: withdrawal.amount,
        balanceAfter: balanceAfterRefund,
        description: `Reembolso de retiro fallido S/${withdrawal.amount.toFixed(2)} (${withdrawal.code})`,
        referenceId: withdrawalId,
        referenceType: 'WITHDRAWAL',
      });
    }

    if (status === WithdrawalStatus.DONE) {
      await tx.notification.create({
        data: {
          userId: withdrawal.userId,
          type: 'bonus',
          title: '¡Retiro completado!',
          body: `Tu retiro de S/${withdrawal.netAmount.toFixed(2)} fue procesado exitosamente. Código: ${withdrawal.code}`,
        },
      });
    }
  });

  return prisma.withdrawal.findUnique({ where: { id: withdrawalId } }) as Promise<object>;
}
