import { Router, RequestHandler } from 'express';
import { authenticate, requirePermission } from '../middleware/auth';
import { PERMISSIONS } from '../config/permissions';
import * as activityController from '../controllers/activity.controller';

const router = Router();

// Mobile → log events (any authenticated user)
router.post('/batch', authenticate, activityController.logBatch as RequestHandler);

// Admin → read activity log (requires activity:read or users:read)
router.get('/', authenticate, requirePermission(PERMISSIONS.USERS_READ), activityController.listActivity as RequestHandler);

export default router;
