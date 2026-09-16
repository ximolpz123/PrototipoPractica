import { Router } from 'express';
import { updateLocation, getActiveLocations, getTrackingHistory, getTodayRoutes } from '../controllers/tracking.controller.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';

const router = Router();

// Endpoint para que el Dashboard Web consulte la ubicación en tiempo real
// GET /api/tracking/active
router.get('/active', authMiddleware, adminMiddleware, getActiveLocations);

// Endpoint para obtener todas las rutas del día actual
// GET /api/tracking/routes/today
router.get('/routes/today', authMiddleware, adminMiddleware, getTodayRoutes);

// Endpoint para obtener el historial completo del trazado GPS de una reserva
// GET /api/tracking/:reservaId/history
router.get('/:reservaId/history', authMiddleware, adminMiddleware, getTrackingHistory);

// Endpoint para que la App Móvil envíe su ubicación en un viaje
// POST /api/tracking/:reservaId
router.post('/:reservaId', authMiddleware, updateLocation);

export default router;
