import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const YOUTUBE_RTMP_SERVER = 'rtmp://a.rtmp.youtube.com/live2';

export async function saveStream(gameId: string, streamUrl: string, streamKey: string) {
  return prisma.game.update({
    where: { id: gameId },
    data: { streamUrl, muxStreamKey: streamKey, muxStreamId: 'youtube' },
  });
}

export async function clearStream(gameId: string) {
  return prisma.game.update({
    where: { id: gameId },
    data: { streamUrl: null, muxStreamKey: null, muxStreamId: null },
  });
}
