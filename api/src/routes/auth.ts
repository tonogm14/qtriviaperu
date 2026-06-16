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
router.post('/google', loginLimiter, authController.googleLogin);

// Protected routes
router.get('/me', authenticate, authController.getMe as unknown as import('express').RequestHandler);
router.put('/me', authenticate, authController.updateMe as unknown as import('express').RequestHandler);
router.post('/me/avatar', authenticate, (req, res, next) => {
  authController.avatarUpload(req, res, (err) => {
    if (err) return next(err);
    authController.uploadAvatar(req as any, res, next);
  });
});

export default router;
