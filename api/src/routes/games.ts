import { Router } from 'express';
import { request as httpRequest } from 'http';
import * as gamesController from '../controllers/games.controller';
import * as streamController from '../controllers/stream.controller';
import { authenticate, requirePermission, requireUser } from '../middleware/auth';
import { PERMISSIONS } from '../config/permissions';
import { RequestHandler } from 'express';

const router = Router();

// Server-side HLS session cache: streamKey → hlsSession UUID from MediaMTX
const hlsSessionCache = new Map<string, string>();

// Strip LL-HLS extensions so standard players don't try blocking-reload requests
function stripLLHLS(m3u8: string): string {
  return m3u8
    .split('\n')
    .filter(line =>
      !line.startsWith('#EXT-X-PART-INF') &&
      !line.startsWith('#EXT-X-PART:') &&
      !line.startsWith('#EXT-X-PRELOAD-HINT') &&
      !line.startsWith('#EXT-X-RENDITION-REPORT'),
    )
    .map(line => {
      if (!line.startsWith('#EXT-X-SERVER-CONTROL:')) return line;
      const attrs = line.slice('#EXT-X-SERVER-CONTROL:'.length).split(',')
        .filter(a => !a.startsWith('CAN-BLOCK-RELOAD') && !a.startsWith('PART-HOLD-BACK'));
      return attrs.length ? `#EXT-X-SERVER-CONTROL:${attrs.join(',')}` : null;
    })
    .filter((l): l is string => l !== null)
    .join('\n');
}

function proxyHls(req: any, res: any, cookie: string) {
  const upstream = httpRequest(
    {
      hostname: 'localhost', port: 8888,
      path: `/live${req.url}${req.url.includes('?') ? '&' : '?'}cookieCheck=1`,
      method: 'GET',
      headers: { Cookie: cookie },
    },
    (proxyRes) => {
      const streamKey = (req.url as string).split('/').filter(Boolean)[0] ?? '';
      for (const c of proxyRes.headers['set-cookie'] ?? []) {
        const m = c.match(/hlsSession=([^;]+)/);
        if (m) hlsSessionCache.set(streamKey, m[1]);
      }
      const ct = proxyRes.headers['content-type'] ?? 'application/octet-stream';
      if (ct.includes('mpegurl')) {
        let body = '';
        proxyRes.setEncoding('utf8');
        proxyRes.on('data', (chunk: string) => { body += chunk; });
        proxyRes.on('end', () => {
          const stripped = stripLLHLS(body);
          res.writeHead(proxyRes.statusCode ?? 200, {
            'Content-Type': ct, 'Cache-Control': 'no-cache', 'Access-Control-Allow-Origin': '*',
          });
          res.end(stripped);
        });
      } else {
        res.writeHead(proxyRes.statusCode ?? 200, {
          'Content-Type': ct, 'Cache-Control': 'no-cache', 'Access-Control-Allow-Origin': '*',
        });
        proxyRes.pipe(res);
      }
    },
  );
  upstream.on('error', () => res.status(503).end());
  upstream.end();
}

// Proxy HLS from MediaMTX — manages hlsSession server-side so clients need no auth
router.use('/stream/hls', ((req, res) => {
  const streamKey = (req.url as string).split('/').filter(Boolean)[0] ?? '';
  const session = hlsSessionCache.get(streamKey);
  const cookie = session ? `cookieCheck=1; hlsSession=${session}` : 'cookieCheck=1';

  if (session) {
    proxyHls(req, res, cookie);
  } else {
    proxyHls(req, res, 'cookieCheck=1');
  }
}) as RequestHandler);

// Public routes
router.get('/', gamesController.listGames);
router.get('/:id', gamesController.getGame);
router.get('/:id/leaderboard', gamesController.getGameLeaderboard);

// Admin routes
router.get('/:id/entries', authenticate, requirePermission(PERMISSIONS.GAMES_READ), gamesController.getGameEntries as RequestHandler);
router.get('/:id/log',     authenticate, requirePermission(PERMISSIONS.GAMES_READ), gamesController.getGameLog as RequestHandler);
router.post('/', authenticate, requirePermission(PERMISSIONS.GAMES_WRITE), gamesController.createGame);
router.put('/:id', authenticate, requirePermission(PERMISSIONS.GAMES_WRITE), gamesController.updateGame);
router.put('/:id/questions', authenticate, requirePermission(PERMISSIONS.GAMES_WRITE), gamesController.setGameQuestions);
router.delete('/:id', authenticate, requirePermission(PERMISSIONS.GAMES_WRITE), gamesController.deleteGame);
router.post('/:id/notify',             authenticate, requirePermission(PERMISSIONS.GAMES_WRITE), gamesController.notifyGame as RequestHandler);
router.post('/:id/start',              authenticate, requirePermission(PERMISSIONS.GAMES_WRITE), gamesController.startGame as RequestHandler);
router.post('/:id/close-registration', authenticate, requirePermission(PERMISSIONS.GAMES_WRITE), gamesController.closeRegistration as RequestHandler);
router.get( '/:id/stream', authenticate, requirePermission(PERMISSIONS.GAMES_READ),  streamController.getStream);
router.post('/:id/stream', authenticate, requirePermission(PERMISSIONS.GAMES_WRITE), streamController.createStream);
router.delete('/:id/stream', authenticate, requirePermission(PERMISSIONS.GAMES_WRITE), streamController.deleteStream);

// Invite codes — admin only
router.get('/:id/invite-codes',             authenticate, requirePermission(PERMISSIONS.GAMES_WRITE), gamesController.listInviteCodes as RequestHandler);
router.post('/:id/invite-codes/generate',   authenticate, requirePermission(PERMISSIONS.GAMES_WRITE), gamesController.generateInviteCodes as RequestHandler);
router.delete('/:id/invite-codes/:codeId',  authenticate, requirePermission(PERMISSIONS.GAMES_WRITE), gamesController.deleteInviteCode as RequestHandler);

// Player-only routes (admins cannot join games as players)
router.get('/:id/my-entry', authenticate, gamesController.getMyEntry as RequestHandler);
router.post('/:id/join', authenticate, requireUser, gamesController.joinGame as RequestHandler);
router.post('/:id/prize-image', authenticate, requirePermission(PERMISSIONS.GAMES_WRITE), (req, res, next) => {
  gamesController.prizeImageUpload(req, res, (err) => {
    if (err) return next(err);
    gamesController.uploadPrizeImage(req, res, next);
  });
});

export default router;
