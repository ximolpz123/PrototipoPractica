import { Router } from 'express';
import {
  getVehicles,
  getVehicleById,
  getAvailableVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  setVehicleMaintenance,
  uploadVehicleImage,
} from '../controllers/vehicle.controller.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';
import { upload } from '../config/cloudinary.js';

const router = Router();

// GET /api/vehicles (protegido)
router.get('/', authMiddleware, getVehicles);

// GET /api/vehicles/available (protegido)
router.get('/available', authMiddleware, getAvailableVehicles);

// GET /api/vehicles/:id (protegido)
router.get('/:id', authMiddleware, getVehicleById);

// POST /api/vehicles (solo admin)
router.post('/', authMiddleware, adminMiddleware, createVehicle);

// PUT /api/vehicles/:id (solo admin)
router.put('/:id', authMiddleware, adminMiddleware, updateVehicle);

// DELETE /api/vehicles/:id (solo admin)
router.delete('/:id', authMiddleware, adminMiddleware, deleteVehicle);
// PATCH /api/vehicles/:id/mantenimiento (solo admin)
router.patch('/:id/mantenimiento', authMiddleware, adminMiddleware, setVehicleMaintenance);

// POST /api/vehicles/upload-image (solo admin)
router.post('/upload-image', authMiddleware, adminMiddleware, upload.single('imagen'), uploadVehicleImage);

export default router;
