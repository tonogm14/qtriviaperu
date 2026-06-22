import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const pid = (req: Request) => Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

const RTMP_HOST     = process.env.RTMP_HOST ?? 'localhost';
const MEDIAMTX_RTMP = `rtmp://${RTMP_HOST}:1935/live`;
const WHEP_BASE     = process.env.WEBRTC_WHEP_BASE ?? '';

function buildResponse(game: { streamUrl: string | null; muxStreamKey: string | null }) {
  const webrtcUrl = WHEP_BASE && game.muxStreamKey
    ? `${WHEP_BASE}/live/${game.muxStreamKey}/whep`
    : null;
  return {
    streamUrl:  game.streamUrl,
    webrtcUrl,
    streamKey:  game.muxStreamKey,
    rtmpServer: MEDIAMTX_RTMP,
    rtmpUrl:    `${MEDIAMTX_RTMP}/${game.muxStreamKey}`,
  };
}

export async function createStream(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = pid(req);
    const game = await prisma.game.findUnique({ where: { id } });
    if (!game) { res.status(404).json({ error: 'Juego no encontrado' }); return; }

    // Stream key = game ID (short, deterministic)
    const streamKey = id.slice(-8);
    // HLS served via API proxy: /api/games/stream/hls/{key}/index.m3u8
    const streamUrl = `/api/games/stream/hls/${streamKey}/index.m3u8`;

    await prisma.game.update({
      where: { id },
      data: { streamUrl, muxStreamId: 'mediamtx', muxStreamKey: streamKey },
    });

    const webrtcUrl = WHEP_BASE ? `${WHEP_BASE}/live/${streamKey}/whep` : null;
    res.json({
      data: {
        streamUrl,
        webrtcUrl,
        streamKey,
        rtmpServer: MEDIAMTX_RTMP,
        rtmpUrl:    `${MEDIAMTX_RTMP}/${streamKey}`,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteStream(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = pid(req);
    await prisma.game.update({
      where: { id },
      data: { streamUrl: null, muxStreamId: null, muxStreamKey: null },
    });
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

    if (!game.streamUrl) { res.json({ data: null }); return; }

    res.json({ data: buildResponse(game) });
  } catch (err) {
    next(err);
  }
}
