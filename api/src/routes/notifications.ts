import { Router } from 'express';
import * as notificationsController from '../controllers/notifications.controller';
import { authenticate, requirePermission } from '../middleware/auth';
import { PERMISSIONS } from '../config/permissions';
import { RequestHandler } from 'express';

const router = Router();

router.get('/', authenticate, notificationsController.listNotifications as RequestHandler);
router.put('/read-all', authenticate, notificationsController.markAllAsRead as RequestHandler);
router.put('/:id/read', authenticate, notificationsController.markAsRead as RequestHandler);
router.post('/broadcast', authenticate, requirePermission(PERMISSIONS.NOTIFICATIONS_BROADCAST), notificationsController.broadcastNotification as RequestHandler);
router.get('/scheduled', authenticate, requirePermission(PERMISSIONS.NOTIFICATIONS_BROADCAST), notificationsController.listScheduled as RequestHandler);
router.delete('/scheduled/:id', authenticate, requirePermission(PERMISSIONS.NOTIFICATIONS_BROADCAST), notificationsController.deleteScheduled as RequestHandler);

export default router;
