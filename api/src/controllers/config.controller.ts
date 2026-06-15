import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const configSchema = z.object({
  currency:         z.string().optional(),
  defaultPrize:     z.number().optional(),
  defaultQuestions: z.number().int().optional(),
  defaultTime:      z.number().int().optional(),
  pushBefore:       z.number().int().optional(),
  autoAdvance:      z.boolean().optional(),
  chatModeration:   z.boolean().optional(),
  minWithdraw:       z.number().optional(),
  feeYape:           z.number().optional(),
  feePlin:           z.number().optional(),
  feeBCP:            z.number().optional(),
  feeInterbank:      z.number().optional(),
  termsAndConditions: z.string().optional(),
  privacyPolicy: z.string().optional(),
  autoCloseRegistration: z.boolean().optional(),
});

export async function getConfig(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const config = await prisma.appConfig.upsert({
      where: { id: 'main' },
      update: {},
      create: { id: 'main' },
    });
    res.json({ data: config });
  } catch (err) {
    next(err);
  }
}

export async function getTerms(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const config = await prisma.appConfig.upsert({
      where: { id: 'main' },
      update: {},
      create: { id: 'main' },
    });
    res.json({ data: { termsAndConditions: config.termsAndConditions } });
  } catch (err) {
    next(err);
  }
}

export async function getPrivacy(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const config = await prisma.appConfig.upsert({
      where: { id: 'main' },
      update: {},
      create: { id: 'main' },
    });
    res.json({ data: { privacyPolicy: config.privacyPolicy } });
  } catch (err) {
    next(err);
  }
}

export async function getWithdrawConfig(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const config = await prisma.appConfig.upsert({
      where: { id: 'main' },
      update: {},
      create: { id: 'main' },
      select: { minWithdraw: true, feeYape: true, feePlin: true, feeBCP: true, feeInterbank: true },
    });
    res.json({ data: config });
  } catch (err) {
    next(err);
  }
}

export async function updateConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = configSchema.parse(req.body);
    const config = await prisma.appConfig.upsert({
      where: { id: 'main' },
      update: body,
      create: { id: 'main', ...body },
    });
    res.json({ data: config });
  } catch (err) {
    next(err);
  }
}
