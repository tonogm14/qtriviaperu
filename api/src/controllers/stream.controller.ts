import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import * as streamService from '../services/stream.service';
import { z } from 'zod';

const prisma = new PrismaClient();
const pid = (req: Request) => Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

const createStreamSchema = z.object({
  streamUrl: z.string().url('URL de YouTube inválida'),
  streamKey: z.string().min(1, 'Stream Key requerida'),
});

function buildResponse(game: { streamUrl: string | null; muxStreamKey: string | null }) {
  return {
    streamUrl:  game.streamUrl,
    streamKey:  game.muxStreamKey,
    rtmpServer: streamService.YOUTUBE_RTMP_SERVER,
    rtmpUrl:    `${streamService.YOUTUBE_RTMP_SERVER}/${game.muxStreamKey}`,
  };
}

export async function createStream(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = pid(req);
    const game = await prisma.game.findUnique({ where: { id } });
    if (!game) { res.status(404).json({ error: 'Juego no encontrado' }); return; }

    const parsed = createStreamSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
    }

    const { streamUrl, streamKey } = parsed.data;
    const updated = await streamService.saveStream(id, streamUrl, streamKey);
    res.json({ data: buildResponse(updated) });
  } catch (err) {
    next(err);
  }
}

export async function deleteStream(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = pid(req);
    await streamService.clearStream(id);
    res.json({ data: { ok: true } });
  } catch (err) {
    next(err);
  }
}

export async function getStream(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = pid(req);
    const game = await prisma.game.findUnique({
      where: { id },
      select: { streamUrl: true, muxStreamId: true, muxStreamKey: true },
    });
    if (!game) { res.status(404).json({ error: 'Juego no encontrado' }); return; }

    if (!game.streamUrl) {
      res.json({ data: null });
      return;
    }

    res.json({ data: buildResponse(game) });
  } catch (err) {
    next(err);
  }
}
