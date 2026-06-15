import { Router, RequestHandler } from 'express';
import * as usersController from '../controllers/users.controller';
import { authenticate, requirePermission, requireOwnerOrAdmin } from '../middleware/auth';
import { PERMISSIONS } from '../config/permissions';

const router = Router();

// Push token (authenticated user saves their own token)
router.post('/push-token', authenticate, usersController.savePushToken as RequestHandler);

// Admin routes
router.get('/stats', authenticate, requirePermission(PERMISSIONS.USERS_READ), usersController.getUsersStats);
router.get('/', authenticate, requirePermission(PERMISSIONS.USERS_READ), usersController.listUsers);
router.post('/', authenticate, requirePermission(PERMISSIONS.USERS_WRITE), usersController.createUser);
router.put('/:id', authenticate, requirePermission(PERMISSIONS.USERS_WRITE), usersController.updateUser);
router.put('/:id/permissions', authenticate, requirePermission(PERMISSIONS.USERS_WRITE), usersController.updatePermissions as RequestHandler);

// Admin — balance ledger
router.get('/:id/ledger', authenticate, requirePermission(PERMISSIONS.USERS_READ), usersController.getUserLedger as RequestHandler);

// Owner or admin only
router.get('/:id', authenticate, requireOwnerOrAdmin, usersController.getUser);
router.get('/:id/stats', authenticate, requireOwnerOrAdmin, usersController.getUserStats);

export default router;
