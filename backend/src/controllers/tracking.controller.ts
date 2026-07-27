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

    // Solo el usuario de la reserva puede reportar la ubicación (o un admin)
    if (reservation.usuario.toString() !== req.userId && req.userRol !== 'admin') {
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
    // Buscamos todos los vehículos que tienen estado 'reservado' y sacamos su ubicación
    // (En nuestro modelo el auto en curso está como reservado o se puede filtrar por los que tienen ubicacionActual reciente)
    const vehicles = await Vehicle.find({
      'ubicacionActual': { $exists: true },
      estado: 'reservado'
    }).select('placa marca modelo ubicacionActual');

    res.json(vehicles);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener ubicaciones', error });
  }
};
