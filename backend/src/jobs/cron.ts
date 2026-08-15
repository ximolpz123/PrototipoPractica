import cron from 'node-cron';
import Reservation from '../models/Reservation.js';
import InspeccionAleatoria, { TipoInspeccion } from '../models/InspeccionAleatoria.js';
import Flag from '../models/Flag.js';
import { sendPushNotification, notifyAdmins } from '../services/notification.service.js';

export const initCronJobs = () => {
  // Se ejecuta cada minuto
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      
      // Buscar reservas en curso cuya fechaFin ya pasó
      const reservasAtrasadas = await Reservation.find({
        estado: 'en_curso',
        fechaFin: { $lt: now }
      }).populate('usuario');

      for (const reserva of reservasAtrasadas) {
        const usuario = reserva.usuario as any;
        const diffMs = now.getTime() - new Date(reserva.fechaFin).getTime();
        const diffMinutes = Math.floor(diffMs / (1000 * 60));

        // Si ya pasó la hora y no se ha notificado al conductor
        if (diffMinutes > 0 && !reserva.notificadoRetraso) {
          await sendPushNotification(
            usuario._id.toString(),
            '¡Atención!',
            'Tu reserva ha finalizado. Recuerda tomar las fotos y devolver el vehículo.',
            { reservaId: reserva._id }
          );
          reserva.notificadoRetraso = true;
          await reserva.save();
        }

        // Si han pasado más de 15 minutos sin que cierre la reserva (y no se ha notificado al admin)
        if (diffMinutes >= 15 && !reserva.notificadoAdmin) {
          await notifyAdmins(
            'Retraso crítico de vehículo',
            `El conductor ${usuario.nombre} ${usuario.apellido} (Tel: ${usuario.telefono || 'No registrado'}) lleva más de 15 min de retraso.`,
            { reservaId: reserva._id }
          );
          reserva.notificadoAdmin = true;
          await reserva.save();
        }
      }
    } catch (error) {
      console.error('Error en el Cron Job de reservas atrasadas:', error);
    }
  });

  // Cron Job 2: Inspección Aleatoria (cada 1 minuto para pruebas)
  cron.schedule('* * * * *', async () => {
    try {
      const activas = await Reservation.find({ estado: 'en_curso' }).populate('usuario');
      
      // Filtrar reservas que ya tienen inspección para no molestar dos veces al mismo conductor
      const inspeccionesExistentes = await InspeccionAleatoria.find({ reserva: { $in: activas.map(r => r._id) } });
      const reservasSinInspeccion = activas.filter(r => !inspeccionesExistentes.some(i => i.reserva.toString() === r._id.toString()));

      if (reservasSinInspeccion.length > 0) {
          // Seleccionar un conductor al azar
          const seleccionada = reservasSinInspeccion[Math.floor(Math.random() * reservasSinInspeccion.length)];
          
          const pool: TipoInspeccion[] = ['revisarNeumaticos', 'tomarFotoInterior', 'verificarBencina', 'revisarCarroceria'];
          const tarea = pool[Math.floor(Math.random() * pool.length)];

          const descripciones: Record<string, string> = {
            'revisarNeumaticos': 'Por favor, revisa el estado de los neumáticos e infórmanos.',
            'tomarFotoInterior': 'Toma una foto del interior del vehículo.',
            'verificarBencina': 'Verifica el nivel de bencina.',
            'revisarCarroceria': 'Revisa la carrocería en busca de abolladuras o rayones.'
          };
          
          const now = new Date();
          const limite = new Date(now.getTime() + 20 * 60000); // +20 min

          const nuevaInspeccion = await InspeccionAleatoria.create({
            usuario: seleccionada.usuario,
            reserva: seleccionada._id,
            tipo: tarea,
            descripcion: descripciones[tarea],
            fechaActivacion: now,
            fechaLimite: limite
          });

          await sendPushNotification(
            (seleccionada.usuario as any)._id.toString(),
            '¡Inspección Aleatoria! 🚨',
            descripciones[tarea],
            { tipo: 'INSPECCION_ALEATORIA', inspeccionId: nuevaInspeccion._id }
          );
        }
    } catch(err) {
      console.error('Error en cron de creación de inspecciones:', err);
    }
  });

  // Cron Job 3: Seguimiento de inspecciones aleatorias (cada minuto)
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      const pendientes = await InspeccionAleatoria.find({ estado: 'pendiente' }).populate('usuario reserva');

      for (const insp of pendientes) {
        const diffMs = now.getTime() - insp.fechaActivacion.getTime();
        const diffMinutes = Math.floor(diffMs / 60000);
        const vencida = now > new Date(insp.fechaLimite);

        if (vencida) {
          insp.estado = 'vencida';
          
          const tipoFlag = (insp.tipo === 'verificarBencina' || insp.tipo === 'revisarNeumaticos') ? 'naranja' : 'amarilla';
          const flag = await Flag.create({
            usuario: insp.usuario,
            tipo: tipoFlag,
            motivo: `Inspección aleatoria vencida: ${insp.descripcion}`,
            reserva: insp.reserva,
            asignadoPor: 'sistema'
          });
          
          insp.flagAsignada = flag._id;
          await insp.save();

          await notifyAdmins(
            'Inspección Vencida', 
            `El conductor ${(insp.usuario as any).nombre} ignoró la inspección. Bandera ${tipoFlag} generada.`, 
            {}
          );
        } else if (diffMinutes > 0 && diffMinutes % 5 === 0) {
          // Spam cada 5 minutos
          await sendPushNotification(
            (insp.usuario as any)._id.toString(),
            'Recordatorio: Inspección Pendiente',
            `Te quedan ${20 - diffMinutes} minutos para completar la inspección: ${insp.descripcion}`,
            { tipo: 'INSPECCION_ALEATORIA', inspeccionId: insp._id }
          );
        }
      }
    } catch(err) {
      console.error('Error en cron de seguimiento de inspecciones:', err);
    }
  });

  console.log('Cron jobs inicializados.');
};
