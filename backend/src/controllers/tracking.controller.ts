import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import Tracking from '../models/Tracking.js';
import Reservation from '../models/Reservation.js';
import Vehicle from '../models/Vehicle.js';

// Registrar ubicación actual del vehículo en una reserva activa
export const updateLocation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { reservaId } = req.params;
    const { latitud, longitud, velocidad } = req.body;

    if (!latitud || !longitud) {
      res.status(400).json({ message: 'Latitud y longitud son requeridas' });
      return;
    }

    const reservation = await Reservation.findById(reservaId);
    if (!reservation) {
      res.status(404).json({ message: 'Reserva no encontrada' });
      return;
    }

    // Solo el usuario de la reserva o los conductores de tramos pueden reportar la ubicación
    const isInTramos = reservation.tramos?.some((t: any) => t.conductor.toString() === req.userId);
    if (reservation.usuario.toString() !== req.userId && req.userRol !== 'admin' && !isInTramos) {
      res.status(403).json({ message: 'No tienes permiso para actualizar esta ubicación' });
      return;
    }

    if (reservation.estado !== 'en_curso') {
      res.status(400).json({ message: 'La reserva no está en curso' });
      return;
    }

    const timestamp = new Date();

    // 1. Guardar historial
    await Tracking.create({
      reserva: reservaId,
      vehiculo: reservation.vehiculo,
      latitud,
      longitud,
      velocidad,
      timestamp,
    });

    // 2. Actualizar vehículo con la última posición conocida
    await Vehicle.findByIdAndUpdate(reservation.vehiculo, {
      ubicacionActual: { latitud, longitud, timestamp },
    });

    res.status(200).json({ message: 'Ubicación actualizada' });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar ubicación', error });
  }
};

// Obtener la ubicación en tiempo real de todos los vehículos en reservas activas (Para el dashboard web)
export const getActiveLocations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Buscamos todas las reservas en curso y populamos vehiculo y usuario
    const activeReservations = await Reservation.find({ estado: 'en_curso' })
      .populate('vehiculo', 'placa marca modelo ubicacionActual')
      .populate('usuario', 'nombre apellido email');

    // Mapeamos para devolver un formato amigable para el mapa
    const locations = activeReservations
      .filter((res) => res.vehiculo && (res.vehiculo as any).ubicacionActual)
      .map((res) => {
        const v = res.vehiculo as any;
        const u = res.usuario as any;
        return {
          _id: v._id,
          placa: v.placa,
          marca: v.marca,
          modelo: v.modelo,
          ubicacionActual: v.ubicacionActual,
          conductor: {
            nombre: u.nombre,
            apellido: u.apellido,
            email: u.email
          }
        };
      });

    res.json(locations);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener ubicaciones', error });
  }
};

// Obtener el historial completo del trazado GPS de una reserva
export const getTrackingHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { reservaId } = req.params;

    // Solo admin puede ver el historial, o el usuario creador (se valida en la ruta si es necesario, 
    // pero idealmente para el admin panel el authMiddleware + adminMiddleware ya lo protegerán)
    
    // Obtenemos los puntos
    const history = await Tracking.find({ reserva: reservaId })
      .sort({ timestamp: 1 }) // Orden cronológico (del más antiguo al más nuevo)
      .select('latitud longitud velocidad timestamp -_id');

    res.json(history);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener el historial de rastreo', error });
  }
};
