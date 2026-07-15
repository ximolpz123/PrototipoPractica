import { Router } from 'express';
import {
  getReservations,
  createReservation,
  updateReservationStatus,
  cancelReservation,
} from '../controllers/reservation.controller.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';

const router = Router();

// GET /api/reservations (protegido - admin ve todas, usuario las suyas)
router.get('/', authMiddleware, getReservations);

// POST /api/reservations (protegido)
router.post('/', authMiddleware, createReservation);

// PATCH /api/reservations/:id/status (solo admin)
router.patch('/:id/status', authMiddleware, adminMiddleware, updateReservationStatus);

// PATCH /api/reservations/:id/cancel (protegido - dueño o admin)
router.patch('/:id/cancel', authMiddleware, cancelReservation);

export default router;
