import { Router } from 'express';
import * as withdrawalsController from '../controllers/withdrawals.controller';
import { authenticate, requirePermission } from '../middleware/auth';
import { PERMISSIONS } from '../config/permissions';
import { RequestHandler } from 'express';

const router = Router();

// Auth required
router.get('/', authenticate, withdrawalsController.listWithdrawals as RequestHandler);
router.post('/', authenticate, withdrawalsController.requestWithdrawal as RequestHandler);

// Admin only
router.put('/:id/status', authenticate, requirePermission(PERMISSIONS.WITHDRAWALS_APPROVE), withdrawalsController.updateWithdrawalStatus);

export default router;
