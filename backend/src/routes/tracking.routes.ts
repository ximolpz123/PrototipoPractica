import { Router } from 'express';
import { updateLocation, getActiveLocations } from '../controllers/tracking.controller.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';

const router = Router();

// Endpoint para que la App Móvil envíe su ubicación en un viaje
// POST /api/tracking/:reservaId
router.post('/:reservaId', authMiddleware, updateLocation);

// Endpoint para que el Dashboard Web consulte la ubicación en tiempo real
// GET /api/tracking/active
router.get('/active', authMiddleware, adminMiddleware, getActiveLocations);

export default router;
