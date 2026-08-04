import { Router } from 'express';
import { getConfig, updateConfig } from '../controllers/config.controller.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';

const router = Router();

// Endpoint para obtener configuración global (puede ser público para la app si es necesario, pero mejor protegido)
router.get('/', authMiddleware, getConfig);

// Solo admin puede editar configuración
router.put('/', authMiddleware, adminMiddleware, updateConfig);

export default router;
