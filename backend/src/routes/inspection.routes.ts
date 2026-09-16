import { Router } from 'express';
import { getInspections, getPendingInspections, respondToInspection, createManualInspection } from '../controllers/inspection.controller.js';
import { authMiddleware } from '../middleware/auth.js';
import { upload } from '../config/cloudinary.js';

const router = Router();

// GET /api/inspections (Todas del día para el dashboard)
router.get('/', authMiddleware, getInspections);

// POST /api/inspections (Crear manual)
router.post('/', authMiddleware, createManualInspection);

// GET /api/inspections/pending (Pendientes del usuario actual)
router.get('/pending', authMiddleware, getPendingInspections);

// POST /api/inspections/:id/respond (Responder a la inspección)
router.post('/:id/respond', authMiddleware, upload.array('fotos', 5), respondToInspection);

export default router;
