import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth';
import { PERMISSIONS } from '../config/permissions';
import * as badwordsController from '../controllers/badwords.controller';

const router = Router();

router.get('/', authenticate, requirePermission(PERMISSIONS.DASHBOARD_READ), badwordsController.listBadWords);
router.post('/', authenticate, requirePermission(PERMISSIONS.DASHBOARD_READ), badwordsController.addBadWord);
router.delete('/:id', authenticate, requirePermission(PERMISSIONS.DASHBOARD_READ), badwordsController.deleteBadWord);

export default router;
