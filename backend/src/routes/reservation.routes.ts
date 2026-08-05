import { Router } from 'express';
import {
  getReservations,
  createReservation,
  startReservation,
  updateReservationStatus,
  cancelReservation,
  completeReservation,
  uploadPhotos,
  uploadFotoTablero,
  notifyDelayToNextReservation,
  handleDelayResponse,
  cambioConductorTramo,
  requestCambioConductorTramo,
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

// POST /api/reservations/:id/notify-delay (solo admin)
router.post('/:id/notify-delay', authMiddleware, adminMiddleware, notifyDelayToNextReservation);

// POST /api/reservations/:id/handle-delay-response
router.post('/:id/handle-delay-response', authMiddleware, handleDelayResponse);

// POST /api/reservations/:id/tramos/cambio/request (Solicitar cambio de conductor)
router.post('/:id/tramos/cambio/request', authMiddleware, requestCambioConductorTramo);

// POST /api/reservations/:id/tramos/cambio (Registra cambio de conductor en ruta)
router.post('/:id/tramos/cambio', authMiddleware, cambioConductorTramo);

// POST /api/reservations/:id/upload
// Sube hasta 4 fotos y las asocia a la reserva (tipo: 'salida' o 'retorno')
router.post(
  '/:id/upload',
  authMiddleware,
  upload.array('fotos', 6),
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
