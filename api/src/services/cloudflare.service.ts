import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CF_BASE = 'https://api.cloudflare.com/client/v4';

function getCredentials() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken  = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !apiToken) {
    throw new Error('CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN must be set in .env');
  }
  return { accountId, apiToken };
}

export async function createLiveInput(gameId: string, gameTitle: string): Promise<{
  streamUrl: string;
  streamKey: string;
  liveInputId: string;
  rtmpServer: string;
}> {
  const { accountId, apiToken } = getCredentials();

  const res = await fetch(`${CF_BASE}/accounts/${accountId}/stream/live_inputs`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      meta: { name: gameTitle },
      recording: { mode: 'automatic', timeoutSeconds: 0 },
    }),
  });

  const json: any = await res.json();
  if (!json.success) {
    throw new Error(JSON.stringify(json.errors));
  }

  const liveInput  = json.result;
  const liveInputId = liveInput.uid as string;
  const rtmpServer  = liveInput.rtmps.url as string;
  const streamKey   = liveInput.rtmps.streamKey as string;
  const hlsUrl      = liveInput.playback.hls as string;

  await prisma.game.update({
    where: { id: gameId },
    data: { streamUrl: hlsUrl, muxStreamId: liveInputId, muxStreamKey: streamKey },
  });

  return { streamUrl: hlsUrl, streamKey, liveInputId, rtmpServer };
}

export async function deleteLiveInput(gameId: string): Promise<void> {
  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game?.muxStreamId) return;

  try {
    const { accountId, apiToken } = getCredentials();
    await fetch(`${CF_BASE}/accounts/${accountId}/stream/live_inputs/${game.muxStreamId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${apiToken}` },
    });
  } catch {
    // Ignore if already deleted on Cloudflare side
  }

  await prisma.game.update({
    where: { id: gameId },
    data: { streamUrl: null, muxStreamId: null, muxStreamKey: null },
  });
}
