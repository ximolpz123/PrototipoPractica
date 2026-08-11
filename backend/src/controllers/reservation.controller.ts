import { Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Reservation from '../models/Reservation.js';
import Vehicle from '../models/Vehicle.js';
import Audit from '../models/Audit.js';
import { AuthRequest } from '../middleware/auth.js';
import Flag from '../models/Flag.js';
import User from '../models/User.js';
import { timeService } from '../services/time.service.js';
import { sendPushNotification, notifyAdmins } from '../services/notification.service.js';

// Obtener todas las reservas (admin ve todas, usuario solo las suyas)
export const getReservations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const filter = req.userRol === 'admin' ? {} : { 
      $or: [
        { usuario: req.userId },
        { 'tramos.conductor': req.userId },
        { 'solicitudTraspaso.conductorDestino': req.userId, 'solicitudTraspaso.estado': 'pendiente' }
      ]
    };
    const reservations = await Reservation.find(filter)
      .populate('usuario', 'nombre apellido email departamento')
      .populate('vehiculo', 'placa marca modelo color tipo tipoIndicador kilometraje')
      .sort({ fechaInicio: -1 });
    res.json(reservations);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener reservas', error });
  }
};

// Crear una reserva
export const createReservation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { vehiculo, fechaInicio, fechaFin, destino, motivo, usuarioId } = req.body;
    
    const isAdmin = req.userRol === 'admin';
    const targetUserId = (isAdmin && usuarioId) ? usuarioId : req.userId;
    const initialState = (isAdmin && usuarioId) ? 'aprobada' : 'pendiente';

    // ── Validación 1: Campos obligatorios ──────────────────────────────────
    if (!vehiculo || !fechaInicio || !fechaFin || !destino || !motivo) {
      res.status(400).json({ message: 'Todos los campos son obligatorios' });
      return;
    }

    // ── Validación 1.5: Validar Licencia del Usuario ──────────────────────
    const userToCheck = await User.findById(targetUserId);
    if (!userToCheck) {
      res.status(404).json({ message: 'Usuario no encontrado' });
      return;
    }
    const isLicenciaValida = userToCheck.licenciaEstado === 'vigente' && 
                             userToCheck.licenciaVencimiento && 
                             new Date(userToCheck.licenciaVencimiento) > new Date();
                             
    if (!isLicenciaValida && !isAdmin) { // Admin can override maybe, but let's block driver
      res.status(403).json({ message: 'No puedes solicitar reservas. Tu licencia está vencida o no es válida.' });
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
    // Aplicamos un margen de 30 minutos a la reserva solicitada
    const BUFFER_MS = 30 * 60000; // 30 minutos en ms
    const inicioBuffer = new Date(inicio.getTime() - BUFFER_MS);
    const finBuffer = new Date(fin.getTime() + BUFFER_MS);

    const vehiculoSolapado = await Reservation.findOne({
      vehiculo,
      estado: { $in: ['pendiente', 'aprobada', 'en_curso'] },
      fechaInicio: { $lt: finBuffer },
      fechaFin: { $gt: inicioBuffer },
    });

    if (vehiculoSolapado) {
      // Calcular cuándo queda libre el vehículo (fin de reserva solapada + 30 min buffer)
      const fechaLibre = new Date(new Date(vehiculoSolapado.fechaFin).getTime() + BUFFER_MS);
      const horaLibre = fechaLibre.toLocaleString('es-CL', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });

      const estaEnCurso = vehiculoSolapado.estado === 'en_curso';
      const msg = estaEnCurso
        ? `Este vehículo está actualmente en uso. Podrás reservarlo a partir del ${horaLibre} (incluye margen de 30 minutos).`
        : `Este vehículo ya tiene una reserva en ese horario. Estará disponible a partir del ${horaLibre} (incluye margen de 30 minutos).`;

      res.status(409).json({ message: msg, fechaDisponibleDesde: fechaLibre });
      return;
    }

    // ── Validación 5: El usuario no tiene otro vehículo reservado en esas fechas ──
    const usuarioSolapado = await Reservation.findOne({
      usuario: targetUserId,
      estado: { $in: ['pendiente', 'aprobada', 'en_curso'] },
      fechaInicio: { $lt: fin },
      fechaFin: { $gt: inicio },
    });

    if (usuarioSolapado) {
      // Calcular desde cuándo el usuario queda libre
      const fechaLibreUsuario = new Date(usuarioSolapado.fechaFin);
      const horaLibreUsuario = fechaLibreUsuario.toLocaleString('es-CL', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });

      res.status(409).json({
        message: `El usuario ya tiene una reserva activa hasta el ${horaLibreUsuario}. No puede tener dos reservas al mismo tiempo.`,
        fechaDisponibleDesde: fechaLibreUsuario,
      });
      return;
    }

    // ── Crear la reserva ──────────────────────────────
    const reservation = await Reservation.create({
      usuario: targetUserId,
      vehiculo,
      fechaInicio: inicio,
      fechaFin: fin,
      destino,
      motivo,
      estado: initialState
    });

    if (isAdmin && usuarioId) {
      await sendPushNotification(
        targetUserId,
        'Nueva Reserva Asignada',
        'Un administrador te ha asignado un vehículo de forma automática.',
        { reservaId: reservation._id }
      );
    }

    // ── Registro de Auditoría (Trazabilidad Completa) ────────────────────────
    await Audit.create({
      usuario: req.userId,
      accion: 'NUEVA_RESERVA',
      entidad: 'Reservation',
      entidadId: reservation._id,
      detalles: `Reserva ${initialState} desde ${inicio.toISOString()} hasta ${fin.toISOString()}`
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



// Iniciar un viaje: cambia estado de 'aprobada' a 'en_curso' (el conductor lo hace al salir)
export const startReservation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const reservation = await Reservation.findById(req.params.id);

    if (!reservation) {
      res.status(404).json({ message: 'Reserva no encontrada' });
      return;
    }

    // Solo el dueño o un admin puede iniciar
    const isInTramos = reservation.tramos?.some((t: any) => t.conductor.toString() === req.userId);
    if (reservation.usuario.toString() !== req.userId && req.userRol !== 'admin' && !isInTramos) {
      res.status(403).json({ message: 'No tienes permiso para iniciar esta reserva' });
      return;
    }

    if (reservation.estado !== 'aprobada') {
      res.status(400).json({ message: `No se puede iniciar: la reserva está en estado '${reservation.estado}'` });
      return;
    }

    // Validar que no falten más de 10 minutos para iniciar
    const currentTime = timeService.getCurrentTime();
    const fechaInicioReserva = new Date(reservation.fechaInicio);
    const maxTiempoAntes = new Date(fechaInicioReserva.getTime() - 10 * 60000); // 10 mins antes

    if (currentTime < maxTiempoAntes) {
      res.status(400).json({
        message: `Aún es muy pronto para iniciar. Puedes iniciar el viaje a partir de las ${maxTiempoAntes.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`
      });
      return;
    }

    // Obtener el kilometraje actual del vehículo para registrarlo como kmSalida
    const vehicle = await Vehicle.findById(reservation.vehiculo);
    let kmFinalSalida = vehicle?.kilometraje ?? 0;
    
    const { kmSalida, observacionKmSalida, isTramo } = req.body;
    
    if (isTramo) {
      if (reservation.tramos && reservation.tramos.length > 0) {
        const lastTramo = reservation.tramos[reservation.tramos.length - 1];
        lastTramo.requiereFotosInicio = false;
        if (kmSalida !== undefined && typeof kmSalida === 'number') {
          lastTramo.kmInicio = kmSalida;
          if (kmSalida > (vehicle?.kilometraje ?? 0)) {
            await Vehicle.findByIdAndUpdate(reservation.vehiculo, { kilometraje: kmSalida });
          }
        }
      }
      await reservation.save();
      res.json({ message: 'Tramo iniciado exitosamente', reservation });
      return;
    }

    if (kmSalida !== undefined && typeof kmSalida === 'number') {
      kmFinalSalida = kmSalida;
      if (kmSalida > (vehicle?.kilometraje ?? 0)) {
        await Vehicle.findByIdAndUpdate(reservation.vehiculo, { kilometraje: kmSalida });
      }
    }

    reservation.estado = 'en_curso';
    reservation.kmSalida = kmFinalSalida;
    if (observacionKmSalida) {
      reservation.observacionKmSalida = observacionKmSalida;
    }
    await reservation.save();

    // Marcar el vehículo como reservado
    await Vehicle.findByIdAndUpdate(reservation.vehiculo, { estado: 'reservado' });

    res.json({ message: 'Viaje iniciado exitosamente', reservation, kmSalida });
  } catch (error) {
    res.status(500).json({ message: 'Error al iniciar el viaje', error });
  }
};

// Actualizar estado de una reserva (admin)
export const updateReservationStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { estado, motivoRechazo } = req.body;
    
    const updateData: any = { estado };
    if (motivoRechazo) updateData.motivoRechazo = motivoRechazo;

    const reservation = await Reservation.findByIdAndUpdate(
      req.params.id,
      updateData,
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
    const isInTramos = reservation.tramos?.some((t: any) => t.conductor.toString() === req.userId);
    if (reservation.usuario.toString() !== req.userId && req.userRol !== 'admin' && !isInTramos) {
      res.status(403).json({ message: 'No tienes permiso para cancelar esta reserva' });
      return;
    }

    const { motivoCancelacion } = req.body;

    if (!motivoCancelacion || motivoCancelacion.trim() === '') {
      res.status(400).json({ message: 'El motivo de la cancelación es obligatorio' });
      return;
    }

    reservation.estado = 'cancelada';
    reservation.motivoCancelacion = motivoCancelacion.trim();
    
    await reservation.save();

    // Actualizar el estado del vehículo a 'disponible'
    await Vehicle.findByIdAndUpdate(reservation.vehiculo, { estado: 'disponible' });

    res.json({ message: 'Reserva cancelada exitosamente', reservation });
  } catch (error) {
    res.status(500).json({ message: 'Error al cancelar reserva', error });
  }
};

// Solicitar cambio de conductor (guarda estado y envía notificación)
export const requestCambioConductorTramo = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
      res.status(404).json({ message: 'Reserva no encontrada' });
      return;
    }
    if (reservation.estado !== 'en_curso') {
      res.status(400).json({ message: 'La reserva no está en curso' });
      return;
    }

    const { nuevoConductorId, kmActual } = req.body;
    const vehiculo = await Vehicle.findById(reservation.vehiculo);
    
    // Obtener datos del conductor origen para la notificación
    const conductorOrigen = await User.findById(req.userId);
    const nombreOrigen = conductorOrigen ? `${conductorOrigen.nombre} ${conductorOrigen.apellido}` : 'Un conductor';

    // Guardar solicitud en BD
    reservation.solicitudTraspaso = {
      conductorDestino: nuevoConductorId,
      conductorOrigen: req.userId as any,
      estado: 'pendiente'
    };
    await reservation.save();

    await sendPushNotification(
      nuevoConductorId,
      'Transferencia de Vehículo',
      `${nombreOrigen} quiere pasarte el mando del vehículo ${vehiculo?.placa}. ¿Aceptas?`,
      { 
        type: 'HANDOVER_REQUEST', 
        reservaId: reservation._id,
        kmActual: kmActual || vehiculo?.kilometraje
      }
    );

    res.json({ message: 'Solicitud enviada al conductor' });
  } catch (error) {
    res.status(500).json({ message: 'Error al solicitar cambio', error });
  }
};

// Responder a solicitud de traspaso
export const responderTraspaso = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation || !reservation.solicitudTraspaso || reservation.solicitudTraspaso.estado !== 'pendiente') {
      res.status(400).json({ message: 'No hay solicitud pendiente para esta reserva' });
      return;
    }
    
    // Verificamos que el que responde es el destino
    if (reservation.solicitudTraspaso.conductorDestino.toString() !== req.userId) {
      res.status(403).json({ message: 'No tienes permiso para responder a esta solicitud' });
      return;
    }

    const { respuesta, tipo, motivo, kmActual } = req.body; 
    const vehiculo = await Vehicle.findById(reservation.vehiculo);
    const currentKm = kmActual ?? vehiculo?.kilometraje ?? 0;
    const now = new Date();

    if (respuesta === 'rechazar') {
      reservation.solicitudTraspaso.estado = 'rechazada';
      reservation.solicitudTraspaso.motivoRechazo = motivo;
      await reservation.save();

      // Notificar al conductor de origen
      await sendPushNotification(
        reservation.solicitudTraspaso.conductorOrigen.toString(),
        'Traspaso Rechazado',
        `El traspaso del vehículo ${vehiculo?.placa} fue rechazado. Motivo: ${motivo}`,
        { type: 'HANDOVER_REJECTED', reservaId: reservation._id }
      );

      res.json({ message: 'Traspaso rechazado. El viaje original continúa.' });
      return;
    }

    if (respuesta === 'aceptar') {
      reservation.solicitudTraspaso.estado = 'aceptada';
      
      if (!reservation.tramos) {
        reservation.tramos = [];
      }
      
      if (reservation.tramos.length === 0) {
        reservation.tramos.push({
          conductor: reservation.usuario,
          fechaInicio: reservation.fechaInicio,
          fechaFin: now,
          gpsActivo: true,
          kmInicio: reservation.kmSalida,
          kmFin: currentKm
        });
      } else {
        const lastTramo = reservation.tramos[reservation.tramos.length - 1];
        lastTramo.fechaFin = now;
        lastTramo.kmFin = currentKm;
      }

      // Nuevo tramo
      reservation.tramos.push({
        conductor: reservation.solicitudTraspaso.conductorDestino,
        fechaInicio: now,
        gpsActivo: true,
        kmInicio: currentKm,
        requiereFotosInicio: tipo === 'regreso'
      });

      await reservation.save();

      if (vehiculo && currentKm > vehiculo.kilometraje) {
        vehiculo.kilometraje = currentKm;
        await vehiculo.save();
      }

      // Notificar al origen que se aceptó
      await sendPushNotification(
        reservation.solicitudTraspaso.conductorOrigen.toString(),
        'Traspaso Aceptado',
        `El conductor ha aceptado el vehículo ${vehiculo?.placa}. Tu tramo ha finalizado.`,
        { type: 'HANDOVER_ACCEPTED', reservaId: reservation._id }
      );

      // Desactivamos el gps del conductor origen mandando push para que la app sepa (opcional, la app de origen puede hacer polling o manejar la push)
      
      res.json({ message: 'Traspaso aceptado exitosamente', requiereFotos: tipo === 'regreso' });
      return;
    }

    res.status(400).json({ message: 'Respuesta inválida' });
  } catch (error) {
    res.status(500).json({ message: 'Error al responder traspaso', error });
  }
};

// Cambio de conductor en tramo (aceptar)
export const cambioConductorTramo = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
      res.status(404).json({ message: 'Reserva no encontrada' });
      return;
    }

    if (reservation.estado !== 'en_curso') {
      res.status(400).json({ message: 'Solo se puede cambiar conductor si la reserva está en curso' });
      return;
    }

    const { nuevoConductorId, kmActual } = req.body;
    if (!nuevoConductorId) {
      res.status(400).json({ message: 'Se requiere el ID del nuevo conductor' });
      return;
    }

    const nuevoConductor = await User.findById(nuevoConductorId);
    if (!nuevoConductor) {
      res.status(404).json({ message: 'Nuevo conductor no encontrado' });
      return;
    }

    if (!reservation.tramos) {
      reservation.tramos = [];
    }

    const now = new Date();
    const vehiculo = await Vehicle.findById(reservation.vehiculo);
    const currentKm = kmActual ?? vehiculo?.kilometraje ?? 0;

    if (reservation.tramos.length === 0) {
      // Create the first tramo retroactively for the original driver
      reservation.tramos.push({
        conductor: reservation.usuario,
        fechaInicio: reservation.fechaInicio,
        fechaFin: now,
        gpsActivo: true,
        kmInicio: reservation.kmSalida,
        kmFin: currentKm
      });
    } else {
      // Close the last tramo
      const lastTramo = reservation.tramos[reservation.tramos.length - 1];
      lastTramo.fechaFin = now;
      lastTramo.kmFin = currentKm;
    }

    // Create the new tramo for the new driver
    reservation.tramos.push({
      conductor: nuevoConductor._id,
      fechaInicio: now,
      gpsActivo: true,
      kmInicio: currentKm
    });

    await reservation.save();

    if (vehiculo && currentKm > vehiculo.kilometraje) {
      vehiculo.kilometraje = currentKm;
      await vehiculo.save();
    }

    // Notify Admins
    const admins = await User.find({ rol: 'admin' });
    for (const admin of admins) {
      await sendPushNotification(
        admin._id.toString(),
        'Cambio de conductor',
        `El vehículo ${vehiculo?.placa} ahora es conducido por ${nuevoConductor.nombre} ${nuevoConductor.apellido}.`,
        { reservaId: reservation._id }
      );
    }

    // Notify New Driver
    await sendPushNotification(
      nuevoConductor._id.toString(),
      'Vehículo entregado',
      `Se te ha asignado el vehículo ${vehiculo?.placa} en la ruta actual.`,
      { reservaId: reservation._id }
    );

    res.json({ message: 'Cambio de conductor registrado exitosamente', tramos: reservation.tramos });
  } catch (error) {
    res.status(500).json({ message: 'Error al cambiar conductor', error });
  }
};

// Completar una reserva y registrar kilometraje de retorno
export const completeReservation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { kmRetorno, observaciones, nivelBencinaRetorno } = req.body;

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
    const isInTramos = reservation.tramos?.some((t: any) => t.conductor.toString() === req.userId);
    if (reservation.usuario.toString() !== req.userId && req.userRol !== 'admin' && !isInTramos) {
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

    // Validar fotos faltantes (pero NO bloquear, se evaluará para banderas)
    const requiredFotos = ['frontal', 'lateralDer', 'lateralIzq', 'trasero', 'tablero', 'interior'];
    const faltanSalidaCount = requiredFotos.filter(pos => !(reservation.fotosSalida as any)?.[pos]).length;
    const faltanRetornoCount = requiredFotos.filter(pos => !(reservation.fotosRetorno as any)?.[pos]).length;
    const missingPhotosCount = faltanSalidaCount + faltanRetornoCount;

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
    if (nivelBencinaRetorno !== undefined) {
      reservation.nivelBencinaRetorno = nivelBencinaRetorno;
    }
    reservation.estado = 'completada';
    if (observaciones) reservation.observaciones = observaciones;
    await reservation.save();

    const vehiculoActualizado = await Vehicle.findByIdAndUpdate(
      reservation.vehiculo,
      {
        $inc: { kilometraje: kmRecorridos }, // Suma los km recorridos al total
        estado: 'disponible',
      },
      { new: true }
    );

    // ── Lógica de Asignación Automática de Banderas ──
    let assignedColor: 'verde' | 'amarilla' | 'naranja' | 'roja' | null = null;
    let assignedMotivo = '';
    
    let isLate = false;
    let isVeryLate = false;
    if (reservation.fechaFin) {
      const diffMs = new Date().getTime() - new Date(reservation.fechaFin).getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      if (diffHours > 0.25) isLate = true; // +15 min
      if (diffHours > 2) isVeryLate = true; // +2 horas
    }

    const lowGas = nivelBencinaRetorno !== undefined && nivelBencinaRetorno < 25;
    const noGas = nivelBencinaRetorno !== undefined && nivelBencinaRetorno <= 5;
    const obsLower = (observaciones || '').toLowerCase();
    const hasDamage = obsLower.includes('chocad') || obsLower.includes('pinchad') || obsLower.includes('accidente');

    if (isVeryLate || noGas || hasDamage) {
      assignedColor = 'roja';
      assignedMotivo = 'Llegó muy tarde, vehículo chocado, sin gasolina, o rueda pinchada.';
    } else if (faltanRetornoCount >= 5 || (isLate && missingPhotosCount > 0)) {
      // faltanRetornoCount >= 5 significa "Solo 1 foto tomada" (de las 6 del retorno)
      assignedColor = 'naranja';
      assignedMotivo = 'Solo 1 foto tomada o vehículo entregado tarde sin avisar.';
    } else if ((missingPhotosCount >= 1 && missingPhotosCount <= 4) || lowGas) {
      assignedColor = 'amarilla';
      assignedMotivo = 'Faltó 1–2 fotos, o nivel de bencina bajo al devolver.';
    } else {
      // Revisar si califica para Verde (2 entregas perfectas seguidas)
      const last2 = await Reservation.find({ usuario: reservation.usuario, estado: 'completada' }).sort({ updatedAt: -1 }).limit(2);
      if (last2.length === 2) {
        let perfect = true;
        for (const r of last2) {
          const mCount = requiredFotos.filter(pos => !(r.fotosSalida as any)?.[pos]).length + 
                         requiredFotos.filter(pos => !(r.fotosRetorno as any)?.[pos]).length;
          const lGas = (r.nivelBencinaRetorno !== undefined && r.nivelBencinaRetorno < 100);
          const rLate = r.fechaFin && (new Date(r.updatedAt).getTime() - new Date(r.fechaFin).getTime() > 0);
          if (mCount > 0 || lGas || rLate) perfect = false;
        }
        if (perfect && missingPhotosCount === 0 && nivelBencinaRetorno === 100 && !isLate) {
          assignedColor = 'verde';
          assignedMotivo = '2 entregas puntuales seguidas, 2 llenados completos seguidos, 6 fotos en 2 reservas seguidas.';
        }
      }
    }

    if (assignedColor) {
      await Flag.create({
        usuario: reservation.usuario,
        reserva: reservation._id,
        tipo: assignedColor,
        motivo: assignedMotivo,
        asignadoPor: 'sistema'
      });

      // Si es naranja, validar regla: 3 naranjas = 1 roja
      let finalColorToAssign = assignedColor;
      if (assignedColor === 'naranja') {
        const naranjasCount = await Flag.countDocuments({ usuario: reservation.usuario, tipo: 'naranja' });
        if (naranjasCount >= 3) {
          finalColorToAssign = 'roja';
          await Flag.create({
            usuario: reservation.usuario,
            tipo: 'roja',
            motivo: 'Acumulación de 3 banderas naranjas.',
            asignadoPor: 'sistema'
          });
        }
      }

      await User.findByIdAndUpdate(reservation.usuario, { banderaActual: finalColorToAssign });
    }
    // ──────────────────────────────────────────────────

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

// Subir fotos de evidencia para una reserva
export const uploadPhotos = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { tipo, posiciones } = req.body; // 'salida' o 'retorno', y un array JSON de posiciones
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      res.status(400).json({ message: 'No se encontraron imágenes' });
      return;
    }

    if (!['salida', 'retorno', 'tramo'].includes(tipo)) {
      res.status(400).json({ message: 'El tipo debe ser "salida", "retorno" o "tramo"' });
      return;
    }

    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
      res.status(404).json({ message: 'Reserva no encontrada' });
      return;
    }

    const isInTramos = reservation.tramos?.some((t: any) => t.conductor.toString() === req.userId);
    if (reservation.usuario.toString() !== req.userId && req.userRol !== 'admin' && !isInTramos) {
      res.status(403).json({ message: 'No tienes permiso para modificar esta reserva' });
      return;
    }

    let parsedPosiciones: string[] = [];
    try {
      parsedPosiciones = JSON.parse(posiciones || '[]');
    } catch (e) {
      console.warn("No se pudieron parsear las posiciones", posiciones);
    }

    const photoUrls = files.map((file) => file.path); // Cloudinary devuelve la URL en path

    // Initialize if undefined
    if (tipo === 'salida') {
      if (!reservation.fotosSalida) reservation.fotosSalida = {};
    } else if (tipo === 'retorno') {
      if (!reservation.fotosRetorno) reservation.fotosRetorno = {};
    } else if (tipo === 'tramo') {
      if (reservation.tramos && reservation.tramos.length > 0) {
        const lastTramo = reservation.tramos[reservation.tramos.length - 1];
        if (!lastTramo.fotosInicio) lastTramo.fotosInicio = {};
      }
    }

    // Map files to positions
    files.forEach((file, index) => {
      const pos = parsedPosiciones[index];
      if (pos) {
        if (tipo === 'salida') {
          (reservation.fotosSalida as any)[pos] = file.path;
        } else if (tipo === 'retorno') {
          (reservation.fotosRetorno as any)[pos] = file.path;
        } else if (tipo === 'tramo') {
          const lastTramo = reservation.tramos?.[reservation.tramos.length - 1];
          if (lastTramo && lastTramo.fotosInicio) {
            (lastTramo.fotosInicio as any)[pos] = file.path;
          }
        }
      } else {
        // Fallback for legacy app versions
        if (tipo === 'salida') {
          reservation.fotosSalidaLegacy = [...(reservation.fotosSalidaLegacy || []), file.path];
        } else if (tipo === 'retorno') {
          reservation.fotosRetornoLegacy = [...(reservation.fotosRetornoLegacy || []), file.path];
        }
      }
    });

    await reservation.save();

    res.json({
      message: `Fotos de ${tipo} subidas exitosamente`,
      reservation,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al subir fotos', error });
  }
};

// Subir foto del tablero y extraer kilometraje usando IA OCR (Simulado)
export const uploadFotoTablero = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ message: 'Debe proporcionar una imagen del tablero' });
      return;
    }

    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
      res.status(404).json({ message: 'Reserva no encontrada' });
      return;
    }

    const isInTramos = reservation.tramos?.some((t: any) => t.conductor.toString() === req.userId);
    if (reservation.usuario.toString() !== req.userId && req.userRol !== 'admin' && !isInTramos) {
      res.status(403).json({ message: 'No tienes permiso para modificar esta reserva' });
      return;
    }

    const fotoUrl = file.path;

    let kmDetectado = reservation.kmSalida || 0;
    
    // Si tenemos API Key, usamos IA Real. Si no, fallback a simulador.
    if (process.env.GEMINI_API_KEY) {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
        
        // Fetch image to pass as base64 to Gemini
        const imgResponse = await fetch(fotoUrl);
        const arrayBuffer = await imgResponse.arrayBuffer();
        const base64Img = Buffer.from(arrayBuffer).toString("base64");
        
        const prompt = "Extrae SOLO el número de kilometraje (odómetro) del tablero en esta foto. Devuelve EXCLUSIVAMENTE los dígitos sin texto, sin puntos ni comas (ej. si es 12.345 km, devuelve 12345). Si no logras verlo con claridad, devuelve -1.";
        const image = {
          inlineData: {
            data: base64Img,
            mimeType: "image/jpeg"
          },
        };
        
        const aiResponse = await model.generateContent([prompt, image]);
        const kmText = aiResponse.response.text().trim() || "-1";
        
        const parsedKm = parseInt(kmText, 10);
        
        if (!isNaN(parsedKm) && parsedKm > 0) {
          kmDetectado = parsedKm;
        } else {
          console.warn("IA no pudo leer el odómetro. Devolvió:", kmText);
          kmDetectado = -1; // Bandera de fallo
        }
      } catch (aiError) {
        console.error("Error en Gemini:", aiError);
        kmDetectado = -1;
      }
    } else {
      // Fallback si no hay API Key configurada
      kmDetectado = kmDetectado + Math.floor(Math.random() * 90) + 10;
    }

    reservation.kmTableroUrl = fotoUrl;
    // Solo actualizamos el kmRetorno si la lectura fue válida (> 0)
    if (kmDetectado > 0) {
      reservation.kmRetorno = kmDetectado;
    }

    await reservation.save();

    res.json({
      message: 'Foto de tablero procesada con IA exitosamente',
      kmDetectado,
      reservation
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al procesar la foto del tablero', error });
  }
};

// Notificar retraso a la siguiente reserva
export const notifyDelayToNextReservation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const currentRes = await Reservation.findById(id);
    if (!currentRes) {
      res.status(404).json({ message: 'Reserva actual no encontrada' });
      return;
    }

    // Buscar la siguiente reserva del MISMO vehículo, que esté "aprobada", y cuya fecha de inicio sea en el futuro cercano
    const nextRes = await Reservation.findOne({
      vehiculo: currentRes.vehiculo,
      estado: 'aprobada',
      fechaInicio: { $gt: currentRes.fechaFin }
    }).sort({ fechaInicio: 1 }).populate('usuario');

    if (!nextRes) {
      res.json({ message: 'No hay reservas próximas para este vehículo.' });
      return;
    }

    const nextUser = nextRes.usuario as any;

    // Enviar Push con ACTION / DATA
    await sendPushNotification(
      nextUser._id.toString(),
      'Retraso en tu próximo vehículo',
      'El vehículo que reservaste viene con 15 mins de retraso. ¿Deseas mantener tu viaje (se atrasará 15 mins) o cancelar?',
      { type: 'DELAY_CONFIRMATION', reservaId: nextRes._id }
    );

    res.json({ message: `Notificación enviada a ${nextUser.nombre} ${nextUser.apellido}`, nextReservation: nextRes._id });
  } catch (error) {
    res.status(500).json({ message: 'Error al notificar siguiente reserva', error });
  }
};

// Conductor responde a la demora
export const handleDelayResponse = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { acepta, motivoCancelacion } = req.body;

    const reservation = await Reservation.findById(id);
    if (!reservation) {
      res.status(404).json({ message: 'Reserva no encontrada' });
      return;
    }

    if (reservation.usuario.toString() !== req.userId) {
      res.status(403).json({ message: 'No tienes permiso para responder por esta reserva' });
      return;
    }

    if (acepta) {
      // Atrasar 15 minutos (900000 ms)
      reservation.fechaInicio = new Date(reservation.fechaInicio.getTime() + 15 * 60000);
      reservation.fechaFin = new Date(reservation.fechaFin.getTime() + 15 * 60000);
      reservation.demoraAceptadaSiguiente = true;
      await reservation.save();
      res.json({ message: 'Reserva atrasada 15 minutos exitosamente.', reservation });
    } else {
      reservation.estado = 'cancelada';
      reservation.motivo = motivoCancelacion || 'Cancelada por retraso del conductor anterior.';
      await reservation.save();
      
      await notifyAdmins('Reserva Cancelada', `El usuario ha cancelado su reserva porque no podía esperar el retraso de 15 mins.`);
      
      res.json({ message: 'Reserva cancelada exitosamente.', reservation });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error al manejar la respuesta de retraso', error });
  }
};

// ── PATCH /api/reservations/:id/firma ────────────────────────────────────────
// Guarda la firma digital (base64) de inicio o fin de viaje
export const saveFirma = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { tipo, firma } = req.body; // tipo: 'inicio' | 'fin', firma: base64 string

    if (!tipo || !firma) {
      res.status(400).json({ message: 'Debes proporcionar tipo ("inicio" o "fin") y la firma en base64.' });
      return;
    }

    if (!['inicio', 'fin'].includes(tipo)) {
      res.status(400).json({ message: 'El tipo debe ser "inicio" o "fin".' });
      return;
    }

    const reservation = await Reservation.findById(id);
    if (!reservation) {
      res.status(404).json({ message: 'Reserva no encontrada.' });
      return;
    }

    if (reservation.usuario.toString() !== req.userId && req.userRol !== 'admin') {
      res.status(403).json({ message: 'Sin permiso para modificar esta reserva.' });
      return;
    }

    if (tipo === 'inicio') {
      reservation.firmaInicio = firma;
    } else {
      reservation.firmaFin = firma;
    }

    await reservation.save();
    res.json({ message: `Firma de ${tipo} guardada correctamente.` });
  } catch (error) {
    res.status(500).json({ message: 'Error al guardar la firma', error });
  }
};

