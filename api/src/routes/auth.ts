import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { loginLimiter, registerLimiter } from '../middleware/rateLimiter';

const router = Router();

// Public routes
router.get('/check', authController.checkAvailability);
router.post('/register', registerLimiter, authController.register);
router.post('/login', loginLimiter, authController.login);
router.post('/admin-login', loginLimiter, authController.adminLogin);
router.post('/recover', authController.recover);

// Protected routes
router.get('/me', authenticate, authController.getMe as unknown as import('express').RequestHandler);
router.put('/me', authenticate, authController.updateMe as unknown as import('express').RequestHandler);

export default router;
