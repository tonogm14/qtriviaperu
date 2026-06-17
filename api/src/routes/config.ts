import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth';
import { PERMISSIONS } from '../config/permissions';
import * as configController from '../controllers/config.controller';

const router = Router();

// Public — mobile app reads T&C, Privacy Policy, and payment config without auth
router.get('/terms', configController.getTerms);
router.get('/privacy', configController.getPrivacy);
router.get('/payment', configController.getPaymentConfig);

// Authenticated (regular users) — withdrawal settings
router.get('/withdraw-config', authenticate, configController.getWithdrawConfig);

router.get('/', authenticate, requirePermission(PERMISSIONS.DASHBOARD_READ), configController.getConfig);
router.put('/', authenticate, requirePermission(PERMISSIONS.DASHBOARD_READ), configController.updateConfig);

export default router;
