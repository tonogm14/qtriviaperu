import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const CF_RTMP_SERVER = 'rtmps://live.cloudflare.com:443/live/';

export async function clearStream(gameId: string) {
  return prisma.game.update({
    where: { id: gameId },
    data: { streamUrl: null, muxStreamId: null, muxStreamKey: null },
  });
}
