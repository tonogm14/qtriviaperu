import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth';
import { PERMISSIONS } from '../config/permissions';
import * as metricsController from '../controllers/metrics.controller';

const router = Router();

// Admin-only metrics summary
router.get('/', authenticate, requirePermission(PERMISSIONS.METRICS_READ), metricsController.getSummary);

export default router;
