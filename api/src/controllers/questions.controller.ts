import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { PrismaClient, Difficulty, Prisma } from '@prisma/client';

function param(req: Request, key: string): string {
  const val = req.params[key];
  return Array.isArray(val) ? val[0] : (val ?? '');
}

const prisma = new PrismaClient();

const questionSchema = z.object({
  text: z.string().min(5),
  options: z.array(z.string().min(1)).length(3),
  correctIndex: z.number().int().min(0).max(2),
  category: z.string().default('General'),
  difficulty: z.nativeEnum(Difficulty).default(Difficulty.MEDIUM),
});

const listQuestionsSchema = z.object({
  category: z.string().optional(),
  difficulty: z.nativeEnum(Difficulty).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(500).default(20),
});

export async function listQuestions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = listQuestionsSchema.parse(req.query);
    const { page, limit, category, difficulty, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.QuestionWhereInput = {};
    if (category) where.category = category;
    if (difficulty) where.difficulty = difficulty;
    if (search) where.text = { contains: search, mode: 'insensitive' };

    const [questions, total] = await prisma.$transaction([
      prisma.question.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.question.count({ where }),
    ]);

    res.json({ data: questions, total, page, limit });
  } catch (err) {
    next(err);
  }
}

export async function getQuestion(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const question = await prisma.question.findUnique({ where: { id: param(req, 'id') } });
    if (!question) {
      res.status(404).json({ error: 'Question not found', code: 'NOT_FOUND' });
      return;
    }
    res.json({ data: question });
  } catch (err) {
    next(err);
  }
}

export async function createQuestion(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = questionSchema.parse(req.body);
    const question = await prisma.question.create({ data: body });
    res.status(201).json({ data: question });
  } catch (err) {
    next(err);
  }
}

export async function updateQuestion(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = questionSchema.partial().parse(req.body);
    const question = await prisma.question.update({
      where: { id: param(req, 'id') },
      data: body,
    });
    res.json({ data: question });
  } catch (err) {
    next(err);
  }
}

export async function deleteQuestion(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await prisma.question.delete({ where: { id: param(req, 'id') } });
    res.json({ data: { message: 'Question deleted successfully' } });
  } catch (err) {
    next(err);
  }
}

export async function bulkImportQuestions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const bodySchema = z.object({
      questions: z.array(questionSchema),
    });
    const { questions } = bodySchema.parse(req.body);

    const created = await prisma.question.createMany({ data: questions });
    res.status(201).json({ data: { created: created.count } });
  } catch (err) {
    next(err);
  }
}
