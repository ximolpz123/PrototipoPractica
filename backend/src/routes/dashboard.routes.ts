import { Router } from 'express';
import { getDashboardStats, getDepartmentCosts } from '../controllers/dashboard.controller.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// GET /api/dashboard/stats (protegido — cualquier usuario autenticado puede ver el dashboard)
router.get('/stats', authMiddleware, getDashboardStats);
// GET /api/dashboard/department-costs
router.get('/department-costs', authMiddleware, getDepartmentCosts);

export default router;
