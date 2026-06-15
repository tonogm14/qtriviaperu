import { Router } from 'express';
import * as leaderboardController from '../controllers/leaderboard.controller';

const router = Router();

// Public leaderboard
router.get('/', leaderboardController.getLeaderboard);

export default router;
