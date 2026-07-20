import { Router } from 'express';
import {
  getReservations,
  createReservation,
  updateReservationStatus,
  cancelReservation,
  completeReservation,
} from '../controllers/reservation.controller.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';
import { upload } from '../config/cloudinary.js';

const router = Router();

// GET /api/reservations (protegido - admin ve todas, usuario las suyas)
router.get('/', authMiddleware, getReservations);

// POST /api/reservations (protegido)
router.post('/', authMiddleware, createReservation);

// PATCH /api/reservations/:id/status (solo admin)
router.patch('/:id/status', authMiddleware, adminMiddleware, updateReservationStatus);

// PATCH /api/reservations/:id/cancel (protegido - dueño o admin)
router.patch('/:id/cancel', authMiddleware, cancelReservation);

// PATCH /api/reservations/:id/complete (protegido - dueño o admin)
// Body: { kmRetorno: number, observaciones?: string }
router.patch('/:id/complete', authMiddleware, completeReservation);

// POST /api/reservations/:id/upload
// Sube hasta 4 fotos y las asocia a la reserva (tipo: 'salida' o 'retorno')
import { uploadPhotos } from '../controllers/reservation.controller.js';
router.post(
  '/:id/upload',
  authMiddleware,
  upload.array('fotos', 4),
  uploadPhotos
);

export default router;
