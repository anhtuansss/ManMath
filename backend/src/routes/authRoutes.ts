import { Router } from 'express';
import {
  getCurrentUser,
  loginWithGoogle,
} from '../controllers/authController';
import { authMiddleware } from '../middleware/authMiddleware';

export const authRouter = Router();

authRouter.post('/google', loginWithGoogle);
authRouter.get('/me', authMiddleware, getCurrentUser);
