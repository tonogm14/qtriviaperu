import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth';
import { PERMISSIONS } from '../config/permissions';
import * as fraudController from '../controllers/fraud.controller';

const router = Router();

router.use(authenticate, requirePermission(PERMISSIONS.USERS_READ));

router.get('/flagged', fraudController.getFlaggedUsers as any);
router.get('/shared-devices', fraudController.getSharedDevicesHandler as any);
router.get('/users/:id/devices', fraudController.getUserDevices as any);
router.put('/users/:id/unflag', fraudController.unflagUser as any);
router.put('/users/:id/ban', fraudController.banUser as any);

export default router;
