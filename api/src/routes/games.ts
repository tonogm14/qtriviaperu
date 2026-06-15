import { Router } from 'express';
import * as gamesController from '../controllers/games.controller';
import * as streamController from '../controllers/stream.controller';
import { authenticate, requirePermission, requireUser } from '../middleware/auth';
import { PERMISSIONS } from '../config/permissions';
import { RequestHandler } from 'express';

const router = Router();

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
router.post('/:id/start',              authenticate, requirePermission(PERMISSIONS.GAMES_WRITE), gamesController.startGame as RequestHandler);
router.post('/:id/close-registration', authenticate, requirePermission(PERMISSIONS.GAMES_WRITE), gamesController.closeRegistration as RequestHandler);
router.get( '/:id/stream', authenticate, requirePermission(PERMISSIONS.GAMES_READ),  streamController.getStream);
router.post('/:id/stream', authenticate, requirePermission(PERMISSIONS.GAMES_WRITE), streamController.createStream);
router.delete('/:id/stream', authenticate, requirePermission(PERMISSIONS.GAMES_WRITE), streamController.deleteStream);

// Player-only routes (admins cannot join games as players)
router.get('/:id/my-entry', authenticate, gamesController.getMyEntry as RequestHandler);
router.post('/:id/join', authenticate, requireUser, gamesController.joinGame as RequestHandler);

export default router;
