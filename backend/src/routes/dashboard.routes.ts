import { Router } from 'express';
import { getDashboardStats } from '../controllers/dashboard.controller.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// GET /api/dashboard/stats (protegido — cualquier usuario autenticado puede ver el dashboard)
router.get('/stats', authMiddleware, getDashboardStats);

export default router;
