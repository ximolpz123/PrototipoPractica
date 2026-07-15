import { Router } from 'express';
import { register, login, getProfile } from '../controllers/auth.controller.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/register
router.post('/register', register);

// POST /api/auth/login
router.post('/login', login);

// GET /api/auth/profile (protegido)
router.get('/profile', authMiddleware, getProfile);

export default router;
