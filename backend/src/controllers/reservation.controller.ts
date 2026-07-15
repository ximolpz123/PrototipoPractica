import { Response } from 'express';
import Reservation from '../models/Reservation.js';
import Vehicle from '../models/Vehicle.js';
import { AuthRequest } from '../middleware/auth.js';

// Obtener todas las reservas (admin ve todas, usuario solo las suyas)
export const getReservations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const filter = req.userRol === 'admin' ? {} : { usuario: req.userId };
    const reservations = await Reservation.find(filter)
      .populate('usuario', 'nombre apellido email departamento')
      .populate('vehiculo', 'placa marca modelo color tipo')
      .sort({ fechaInicio: -1 });
    res.json(reservations);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener reservas', error });
  }
};

// Crear una reserva
export const createReservation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { vehiculo, fechaInicio, fechaFin, destino, motivo } = req.body;

    // Verificar que el vehículo existe y está disponible
    const vehicle = await Vehicle.findById(vehiculo);
    if (!vehicle) {
      res.status(404).json({ message: 'Vehículo no encontrado' });
      return;
    }

    // Verificar que no hay reservas que se solapen
    const overlapping = await Reservation.findOne({
      vehiculo,
      estado: { $in: ['pendiente', 'aprobada', 'en_curso'] },
      $or: [
        { fechaInicio: { $lt: new Date(fechaFin) }, fechaFin: { $gt: new Date(fechaInicio) } },
      ],
    });

    if (overlapping) {
      res.status(409).json({
        message: 'El vehículo ya tiene una reserva en ese rango de fechas',
      });
      return;
    }

    const reservation = await Reservation.create({
      usuario: req.userId,
      vehiculo,
      fechaInicio,
      fechaFin,
      destino,
      motivo,
    });

    const populated = await reservation.populate([
      { path: 'usuario', select: 'nombre apellido email' },
      { path: 'vehiculo', select: 'placa marca modelo' },
    ]);

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear reserva', error });
  }
};

// Actualizar estado de una reserva (admin)
export const updateReservationStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { estado } = req.body;
    const reservation = await Reservation.findByIdAndUpdate(
      req.params.id,
      { estado },
      { new: true, runValidators: true }
    )
      .populate('usuario', 'nombre apellido email')
      .populate('vehiculo', 'placa marca modelo');

    if (!reservation) {
      res.status(404).json({ message: 'Reserva no encontrada' });
      return;
    }

    res.json(reservation);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar reserva', error });
  }
};

// Cancelar reserva (el usuario puede cancelar las suyas)
export const cancelReservation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const reservation = await Reservation.findById(req.params.id);

    if (!reservation) {
      res.status(404).json({ message: 'Reserva no encontrada' });
      return;
    }

    // Solo el dueño o un admin puede cancelar
    if (reservation.usuario.toString() !== req.userId && req.userRol !== 'admin') {
      res.status(403).json({ message: 'No tienes permiso para cancelar esta reserva' });
      return;
    }

    reservation.estado = 'cancelada';
    await reservation.save();

    res.json({ message: 'Reserva cancelada exitosamente', reservation });
  } catch (error) {
    res.status(500).json({ message: 'Error al cancelar reserva', error });
  }
};
