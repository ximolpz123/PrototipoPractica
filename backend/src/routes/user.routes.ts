import { Router } from 'express';
import { getUsers, createUser, updateUser, deleteUser, updatePerfil, updateLicencia, getUserFlags, assignFlag, updatePushToken } from '../controllers/user.controller.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';
import { upload } from '../config/cloudinary.js';

const router = Router();

// Todas las rutas de usuarios requieren autenticación
router.use(authMiddleware);

// Rutas accesibles por el propio usuario (o admin)
router.get('/:id/flags', getUserFlags);
router.patch('/:id/perfil', upload.single('avatar'), updatePerfil);
router.patch('/:id/licencia', upload.single('imagen'), updateLicencia);
router.patch('/:id/push-token', updatePushToken);

// Rutas administrativas
router.use(adminMiddleware);

router.get('/', getUsers);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

router.post('/:id/flags', assignFlag);

export default router;
