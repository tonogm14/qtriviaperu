import Mux from '@mux/mux-node';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function getMuxClient(): Mux {
  const tokenId     = process.env.MUX_TOKEN_ID;
  const tokenSecret = process.env.MUX_TOKEN_SECRET;
  if (!tokenId || !tokenSecret) {
    throw new Error('MUX_TOKEN_ID and MUX_TOKEN_SECRET must be set in .env');
  }
  return new Mux({ tokenId, tokenSecret });
}

export async function createLiveStream(gameId: string): Promise<{
  streamUrl: string;
  streamKey: string;
  muxStreamId: string;
}> {
  const mux = getMuxClient();

  const liveStream = await mux.video.liveStreams.create({
    playback_policy: ['public'],
    new_asset_settings: { playback_policy: ['public'] },
    reconnect_window: 60,
    latency_mode: 'low',
  });

  const playbackId = liveStream.playback_ids?.[0]?.id;
  if (!playbackId) throw new Error('Mux did not return a playback ID');

  const streamUrl  = `https://stream.mux.com/${playbackId}.m3u8`;
  const streamKey  = liveStream.stream_key!;
  const muxStreamId = liveStream.id;

  await prisma.game.update({
    where: { id: gameId },
    data: { streamUrl, muxStreamId, muxStreamKey: streamKey },
  });

  return { streamUrl, streamKey, muxStreamId };
}

export async function deleteLiveStream(gameId: string): Promise<void> {
  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game?.muxStreamId) return;

  try {
    const mux = getMuxClient();
    await mux.video.liveStreams.delete(game.muxStreamId);
  } catch {
    // Stream may already be deleted on Mux side — ignore
  }

  await prisma.game.update({
    where: { id: gameId },
    data: { streamUrl: null, muxStreamId: null, muxStreamKey: null },
  });
}
