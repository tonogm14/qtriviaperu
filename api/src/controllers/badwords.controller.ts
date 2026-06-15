import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

export async function listBadWords(req: Request, res: Response, next: NextFunction) {
  try {
    const words = await prisma.badWord.findMany({ orderBy: { word: 'asc' } });
    res.json({ data: words });
  } catch (err) { next(err) }
}

export async function addBadWord(req: Request, res: Response, next: NextFunction) {
  try {
    const { word } = z.object({ word: z.string().min(1).max(100) }).parse(req.body);
    const normalized = word.trim().toLowerCase();
    const created = await prisma.badWord.upsert({
      where: { word: normalized },
      update: {},
      create: { word: normalized },
    });
    res.json({ data: created });
  } catch (err) { next(err) }
}

export async function deleteBadWord(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.badWord.delete({ where: { id: String(req.params['id']) } });
    res.json({ ok: true });
  } catch (err) { next(err) }
}
