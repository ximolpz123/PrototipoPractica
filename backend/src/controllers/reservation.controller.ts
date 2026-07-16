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

    // ── Validación 1: Campos obligatorios ──────────────────────────────────
    if (!vehiculo || !fechaInicio || !fechaFin || !destino || !motivo) {
      res.status(400).json({ message: 'Todos los campos son obligatorios' });
      return;
    }

    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);

    if (fin <= inicio) {
      res.status(400).json({ message: 'La fecha de fin debe ser posterior a la de inicio' });
      return;
    }

    // ── Validación 2: El vehículo existe ───────────────────────────────────
    const vehicle = await Vehicle.findById(vehiculo);
    if (!vehicle) {
      res.status(404).json({ message: 'Vehículo no encontrado' });
      return;
    }

    // ── Validación 3: El vehículo está operativo ───────────────────────────
    if (vehicle.estado === 'mantenimiento' || vehicle.estado === 'fuera_de_servicio') {
      res.status(409).json({
        message: `El vehículo no está disponible para reservas (estado actual: ${vehicle.estado})`,
      });
      return;
    }

    // ── Validación 4: El vehículo no tiene reservas solapadas ──────────────
    const vehiculoSolapado = await Reservation.findOne({
      vehiculo,
      estado: { $in: ['pendiente', 'aprobada', 'en_curso'] },
      fechaInicio: { $lt: fin },
      fechaFin: { $gt: inicio },
    });

    if (vehiculoSolapado) {
      res.status(409).json({
        message: 'El vehículo ya tiene una reserva en ese rango de fechas',
      });
      return;
    }

    // ── Validación 5: El usuario no tiene otro vehículo reservado en esas fechas ──
    const usuarioSolapado = await Reservation.findOne({
      usuario: req.userId,
      estado: { $in: ['pendiente', 'aprobada', 'en_curso'] },
      fechaInicio: { $lt: fin },
      fechaFin: { $gt: inicio },
    });

    if (usuarioSolapado) {
      res.status(409).json({
        message: 'Ya tienes una reserva activa en ese rango de fechas. No puedes reservar más de un vehículo a la vez.',
      });
      return;
    }

    // ── Crear la reserva ───────────────────────────────────────────────────
    const reservation = await Reservation.create({
      usuario: req.userId,
      vehiculo,
      fechaInicio: inicio,
      fechaFin: fin,
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

    // Actualizar el estado del vehículo a 'disponible'
    await Vehicle.findByIdAndUpdate(reservation.vehiculo, { estado: 'disponible' });

    res.json({ message: 'Reserva cancelada exitosamente', reservation });
  } catch (error) {
    res.status(500).json({ message: 'Error al cancelar reserva', error });
  }
};

// Completar una reserva y registrar kilometraje de retorno
export const completeReservation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { kmRetorno, observaciones } = req.body;

    // Validar que kmRetorno es un número positivo
    if (typeof kmRetorno !== 'number' || kmRetorno < 0) {
      res.status(400).json({ message: 'El kmRetorno debe ser un número positivo' });
      return;
    }

    // Buscar la reserva
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
      res.status(404).json({ message: 'Reserva no encontrada' });
      return;
    }

    // Solo el admin o el dueño de la reserva pueden completarla
    if (reservation.usuario.toString() !== req.userId && req.userRol !== 'admin') {
      res.status(403).json({ message: 'No tienes permiso para completar esta reserva' });
      return;
    }

    // Solo se puede completar si está aprobada o en_curso
    if (!['aprobada', 'en_curso'].includes(reservation.estado)) {
      res.status(400).json({
        message: `No se puede completar una reserva en estado "${reservation.estado}"`,
      });
      return;
    }

    // Validar que kmRetorno > kmSalida (si se registró kmSalida)
    if (reservation.kmSalida && kmRetorno < reservation.kmSalida) {
      res.status(400).json({
        message: `El kmRetorno (${kmRetorno}) no puede ser menor al kmSalida (${reservation.kmSalida})`,
      });
      return;
    }

    // Calcular kilómetros recorridos en este viaje
    const kmRecorridos = reservation.kmSalida ? kmRetorno - reservation.kmSalida : 0;

    // Actualizar la reserva
    reservation.kmRetorno = kmRetorno;
    reservation.estado = 'completada';
    if (observaciones) reservation.observaciones = observaciones;
    await reservation.save();

    // Actualizar el kilometraje total del vehículo y ponerlo como disponible
    const vehiculoActualizado = await Vehicle.findByIdAndUpdate(
      reservation.vehiculo,
      {
        $inc: { kilometraje: kmRecorridos }, // Suma los km recorridos al total
        estado: 'disponible',
      },
      { new: true }
    );

    const populated = await reservation.populate([
      { path: 'usuario', select: 'nombre apellido email' },
      { path: 'vehiculo', select: 'placa marca modelo kilometraje' },
    ]);

    res.json({
      message: 'Reserva completada exitosamente',
      reservation: populated,
      kmRecorridos,
      vehiculo: {
        placa: vehiculoActualizado?.placa,
        nuevaLectura: vehiculoActualizado?.kilometraje,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al completar la reserva', error });
  }
};

