import { Router } from 'express';
import Flag from '../models/Flag.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);
router.use(adminMiddleware);

// GET /api/flags — Todas las banderas con datos del usuario (solo admin)
router.get('/', async (_req, res) => {
  try {
    const flags = await Flag.find()
      .populate('usuario', 'nombre apellido departamento')
      .populate('adminId', 'nombre apellido')
      .populate('reserva', 'fechaInicio fechaFin vehiculo')
      .sort({ createdAt: -1 });
    res.json(flags);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener banderas', error });
  }
});

export default router;
