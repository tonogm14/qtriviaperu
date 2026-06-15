import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { PrismaClient, WithdrawalStatus, Prisma } from '@prisma/client';

function param(req: Request, key: string): string {
  const val = req.params[key];
  return Array.isArray(val) ? val[0] : (val ?? '');
}
import * as withdrawalService from '../services/withdrawal.service';
import { AuthRequest } from '../types';

const prisma = new PrismaClient();

const requestWithdrawalSchema = z.object({
  amount: z.number().positive(),
  method: z.enum(['yape', 'plin', 'bcp', 'interbank', 'bbva', 'scotiabank', 'banbif', 'pichincha', 'mibanco', 'gnb', 'falabella', 'ripley']),
  accountRef: z.string().min(4).max(100),
});

const updateStatusSchema = z.object({
  status: z.nativeEnum(WithdrawalStatus),
});

const listWithdrawalsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.nativeEnum(WithdrawalStatus).optional(),
});

export async function listWithdrawals(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = listWithdrawalsSchema.parse(req.query);
    const { page, limit, status } = query;
    const skip = (page - 1) * limit;

    const isAdmin = req.user?.role === 'ADMIN';

    const where: Prisma.WithdrawalWhereInput = {};
    if (!isAdmin) {
      where.userId = req.user!.id;
    }
    if (status) where.status = status;

    const [withdrawals, total] = await prisma.$transaction([
      prisma.withdrawal.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, username: true, name: true, email: true },
          },
        },
      }),
      prisma.withdrawal.count({ where }),
    ]);

    res.json({ data: withdrawals, total, page, limit });
  } catch (err) {
    next(err);
  }
}

export async function requestWithdrawal(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = requestWithdrawalSchema.parse(req.body);
    const withdrawal = await withdrawalService.requestWithdrawal(req.user!.id, body);
    res.status(201).json({ data: withdrawal });
  } catch (err) {
    next(err);
  }
}

export async function updateWithdrawalStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status } = updateStatusSchema.parse(req.body);
    const withdrawal = await withdrawalService.updateWithdrawalStatus(param(req, 'id'), status);
    res.json({ data: withdrawal });
  } catch (err) {
    next(err);
  }
}
