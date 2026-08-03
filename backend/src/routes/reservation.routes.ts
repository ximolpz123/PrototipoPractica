import { Router } from 'express';
import {
  getReservations,
  createReservation,
  startReservation,
  updateReservationStatus,
  cancelReservation,
  completeReservation,
} from '../controllers/reservation.controller.js';
import { authMiddleware, adminMiddleware, licenciaMiddleware } from '../middleware/auth.js';
import { upload } from '../config/cloudinary.js';

const router = Router();

// GET /api/reservations (protegido - admin ve todas, usuario las suyas)
router.get('/', authMiddleware, getReservations);

// POST /api/reservations (protegido, bloqueado si la licencia no está vigente)
router.post('/', authMiddleware, licenciaMiddleware, createReservation);

// PATCH /api/reservations/:id/start (el conductor inicia el viaje → cambia a 'en_curso')
router.patch('/:id/start', authMiddleware, startReservation);

// PATCH /api/reservations/:id/status (solo admin)
router.patch('/:id/status', authMiddleware, adminMiddleware, updateReservationStatus);

// PATCH /api/reservations/:id/cancel (protegido - dueño o admin)
router.patch('/:id/cancel', authMiddleware, cancelReservation);

// PATCH /api/reservations/:id/complete (protegido - dueño o admin)
// Body: { kmRetorno: number, observaciones?: string }
router.patch('/:id/complete', authMiddleware, completeReservation);

// POST /api/reservations/:id/upload
// Sube hasta 4 fotos y las asocia a la reserva (tipo: 'salida' o 'retorno')
import { uploadPhotos, uploadFotoTablero } from '../controllers/reservation.controller.js';
router.post(
  '/:id/upload',
  authMiddleware,
  upload.array('fotos', 4),
  uploadPhotos
);

// POST /api/reservations/:id/foto-tablero
// Recibe la imagen del tablero y usa IA (simulada) para extraer el KM de retorno
router.post(
  '/:id/foto-tablero',
  authMiddleware,
  upload.single('foto'),
  uploadFotoTablero
);

export default router;
