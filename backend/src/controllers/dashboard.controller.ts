import { Response } from 'express';
import Reservation from '../models/Reservation.js';
import Vehicle from '../models/Vehicle.js';
import User from '../models/User.js';
import { AuthRequest } from '../middleware/auth.js';

export const getDashboardStats = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const now = new Date();

    // ── 1. Conteo de reservas por estado ─────────────────────────────────
    const reservasPorEstado = await Reservation.aggregate([
      {
        $group: {
          _id: '$estado',
          total: { $sum: 1 },
        },
      },
    ]);

    // Convertir el array en un objeto plano { pendiente: 3, aprobada: 2, ... }
    const estadosReservas: Record<string, number> = {};
    for (const item of reservasPorEstado) {
      estadosReservas[item._id] = item.total;
    }

    // ── 2. Conteo de vehículos por estado ─────────────────────────────────
    const vehiculosPorEstado = await Vehicle.aggregate([
      {
        $group: {
          _id: '$estado',
          total: { $sum: 1 },
        },
      },
    ]);

    const estadosVehiculos: Record<string, number> = {};
    for (const item of vehiculosPorEstado) {
      estadosVehiculos[item._id] = item.total;
    }

    // ── 3. Vehículo más reservado ──────────────────────────────────────────
    const vehiculoMasUsado = await Reservation.aggregate([
      {
        $group: {
          _id: '$vehiculo',
          totalReservas: { $sum: 1 },
        },
      },
      { $sort: { totalReservas: -1 } },
      { $limit: 1 },
      {
        $lookup: {
          from: 'vehicles',
          localField: '_id',
          foreignField: '_id',
          as: 'vehiculo',
        },
      },
      { $unwind: '$vehiculo' },
      {
        $project: {
          totalReservas: 1,
          placa: '$vehiculo.placa',
          marca: '$vehiculo.marca',
          modelo: '$vehiculo.modelo',
          tipo: '$vehiculo.tipo',
        },
      },
    ]);

    // ── 4. Reservas activas en este momento ────────────────────────────────
    const reservasActivasAhora = await Reservation.countDocuments({
      estado: { $in: ['aprobada', 'en_curso'] },
      fechaInicio: { $lte: now },
      fechaFin: { $gte: now },
    });

    // ── 5. Próximas reservas (en los siguientes 7 días) ────────────────────
    const en7dias = new Date();
    en7dias.setDate(en7dias.getDate() + 7);

    const proximasReservas = await Reservation.find({
      estado: { $in: ['pendiente', 'aprobada'] },
      fechaInicio: { $gte: now, $lte: en7dias },
    })
      .populate('usuario', 'nombre apellido')
      .populate('vehiculo', 'placa marca modelo')
      .sort({ fechaInicio: 1 })
      .limit(5);

    // ── 6. Vehículos próximos a mantenimiento (> 40,000 km) ───────────────
    const vehiculosProximoMantenimiento = await Vehicle.find({
      kilometraje: { $gte: 40000 },
      estado: { $ne: 'mantenimiento' },
    }).select('placa marca modelo kilometraje ultimoMantenimiento');

    // ── 7. Total de usuarios registrados ──────────────────────────────────
    const totalUsuarios = await User.countDocuments({ activo: true });

    // ── 8. Reservas creadas en los últimos 30 días ─────────────────────────
    const hace30dias = new Date();
    hace30dias.setDate(hace30dias.getDate() - 30);
    const reservasUltimos30dias = await Reservation.countDocuments({
      createdAt: { $gte: hace30dias },
    });

    // ── Respuesta final ────────────────────────────────────────────────────
    res.json({
      resumen: {
        totalVehiculos: Object.values(estadosVehiculos).reduce((a, b) => a + b, 0),
        vehiculosDisponibles: estadosVehiculos['disponible'] ?? 0,
        vehiculosReservados: estadosVehiculos['reservado'] ?? 0,
        vehiculosMantenimiento: estadosVehiculos['mantenimiento'] ?? 0,
        totalReservas: Object.values(estadosReservas).reduce((a, b) => a + b, 0),
        reservasPendientes: estadosReservas['pendiente'] ?? 0,
        reservasAprobadas: estadosReservas['aprobada'] ?? 0,
        reservasEnCurso: estadosReservas['en_curso'] ?? 0,
        reservasCompletadas: estadosReservas['completada'] ?? 0,
        reservasActivasAhora,
        reservasUltimos30dias,
        totalUsuariosActivos: totalUsuarios,
      },
      vehiculoMasUsado: vehiculoMasUsado[0] ?? null,
      proximasReservas,
      vehiculosProximoMantenimiento,
      generadoEn: now.toISOString(),
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener estadísticas del dashboard', error });
  }
};
