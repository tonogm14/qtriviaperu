import { Router } from 'express';
import * as questionsController from '../controllers/questions.controller';
import { authenticate, requirePermission } from '../middleware/auth';
import { PERMISSIONS } from '../config/permissions';

const router = Router();

// Auth required — questions are only for logged-in players/admins
router.get('/', authenticate, questionsController.listQuestions);
router.get('/:id', authenticate, questionsController.getQuestion);

// Admin routes
router.post('/bulk', authenticate, requirePermission(PERMISSIONS.QUESTIONS_WRITE), questionsController.bulkImportQuestions);
router.post('/', authenticate, requirePermission(PERMISSIONS.QUESTIONS_WRITE), questionsController.createQuestion);
router.put('/:id', authenticate, requirePermission(PERMISSIONS.QUESTIONS_WRITE), questionsController.updateQuestion);
router.delete('/:id', authenticate, requirePermission(PERMISSIONS.QUESTIONS_WRITE), questionsController.deleteQuestion);

export default router;
