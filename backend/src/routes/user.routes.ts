import { Router } from 'express';
import { getUsers, createUser, updateUser, deleteUser, updatePerfil, updateLicencia, getUserFlags, assignFlag } from '../controllers/user.controller.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';
import { upload } from '../config/cloudinary.js';

const router = Router();

// Todas las rutas de usuarios requieren autenticación
router.use(authMiddleware);

// Rutas accesibles por el propio usuario (o admin)
router.patch('/:id/perfil', updatePerfil);
router.patch('/:id/licencia', upload.single('imagen'), updateLicencia);

// Rutas administrativas
router.use(adminMiddleware);

router.get('/', getUsers);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

router.get('/:id/flags', getUserFlags);
router.post('/:id/flags', assignFlag);

export default router;
