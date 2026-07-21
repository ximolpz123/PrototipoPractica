import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export interface AuthRequest extends Request {
  userId?: string;
  userRol?: string;
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({ message: 'Acceso denegado. No se proporcionó token.' });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret') as {
      id: string;
      rol: string;
    };

    req.userId = decoded.id;
    req.userRol = decoded.rol;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token inválido o expirado.' });
  }
};

export const adminMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.userRol !== 'admin') {
    res.status(403).json({ message: 'Acceso denegado. Se requiere rol de administrador.' });
    return;
  }
  next();
};

// Middleware RN-01: bloquea si la licencia está vencida o no está al día
export const licenciaMiddleware = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await User.findById(req.userId).select('licenciaAlDia fechaVencimientoLicencia activo');

    if (!user) {
      res.status(404).json({ message: 'Usuario no encontrado.' });
      return;
    }

    if (!user.activo) {
      res.status(403).json({ message: 'Tu cuenta está desactivada. Contacta a RRHH.' });
      return;
    }

    // Verificar bandera manual de RRHH
    if (!user.licenciaAlDia) {
      res.status(403).json({
        message: 'No puedes realizar reservas. Tu licencia de conducir no está al día. Contacta a RRHH.',
        codigo: 'LICENCIA_NO_VIGENTE',
      });
      return;
    }

    // Verificar vencimiento automático por fecha
    if (user.fechaVencimientoLicencia) {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const vencimiento = new Date(user.fechaVencimientoLicencia);
      vencimiento.setHours(0, 0, 0, 0);

      if (vencimiento < hoy) {
        // Actualizar automáticamente la bandera si ya venció
        await User.findByIdAndUpdate(req.userId, { licenciaAlDia: false });
        res.status(403).json({
          message: `Tu licencia de conducir venció el ${user.fechaVencimientoLicencia.toLocaleDateString('es-CL')}. No puedes realizar reservas.`,
          codigo: 'LICENCIA_VENCIDA',
        });
        return;
      }
    }

    next();
  } catch (error) {
    res.status(500).json({ message: 'Error al verificar licencia.' });
  }
};
