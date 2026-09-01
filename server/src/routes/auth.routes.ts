import { Router } from 'express';
import { currentUser, login, logout } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { asyncHandler } from '../utils/async-handler.js';
import { loginSchema } from '../validators/auth.validator.js';

export const authRouter = Router();
authRouter.post('/login', validate(loginSchema), asyncHandler(login));
authRouter.post('/logout', requireAuth, asyncHandler(logout));
authRouter.get('/me', requireAuth, currentUser);
