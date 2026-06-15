import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  console.error('[Error]', err);

  // Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Error de validación',
      code: 'VALIDATION_ERROR',
      details: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  // Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const fields = (err.meta?.target as string[]) ?? [];
      res.status(409).json({
        error: `Ya existe un registro con este ${fields.join(', ')}`,
        code: 'DUPLICATE_RECORD',
      });
      return;
    }

    if (err.code === 'P2025') {
      res.status(404).json({
        error: 'Registro no encontrado',
        code: 'NOT_FOUND',
      });
      return;
    }
  }

  // Custom app errors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
    });
    return;
  }

  // Generic error
  if (err instanceof Error) {
    res.status(500).json({
      error: process.env.NODE_ENV === 'production' ? 'Error interno del servidor' : err.message,
      code: 'INTERNAL_ERROR',
    });
    return;
  }

  res.status(500).json({
    error: 'Error interno del servidor',
    code: 'INTERNAL_ERROR',
  });
}

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'APP_ERROR'
  ) {
    super(message);
    this.name = 'AppError';
  }
}
