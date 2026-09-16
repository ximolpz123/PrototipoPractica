import cron from 'node-cron';
import Reservation from '../models/Reservation.js';
import InspeccionAleatoria, { TipoInspeccion } from '../models/InspeccionAleatoria.js';
import Flag from '../models/Flag.js';
import User from '../models/User.js';
import { sendPushNotification, notifyAdmins } from '../services/notification.service.js';
import { updateUserPoints } from '../services/points.service.js';

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

  // Cron Job 1.5: Alertar si no se ha iniciado el viaje o no se han subido fotos tras 30 mins
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      // Buscar reservas que deberían haber comenzado hace más de 30 minutos y no están completadas
      const reservasAtrasadasInicio = await Reservation.find({
        estado: { $in: ['aprobada', 'en_curso'] },
        notificadoRetrasoInicio: { $ne: true }
      }).populate('usuario');

      for (const reserva of reservasAtrasadasInicio) {
        const diffMs = now.getTime() - new Date(reserva.fechaInicio).getTime();
        const diffMinutes = Math.floor(diffMs / 60000);

        // Si ya pasaron 30 minutos
        if (diffMinutes >= 30) {
          let faltaIniciar = false;

          if (reserva.estado === 'aprobada') {
            // Aún no presiona "Iniciar Viaje"
            faltaIniciar = true;
          } else if (reserva.estado === 'en_curso') {
            // Ya presionó iniciar viaje, revisar fotos
            const reqFotos = ['frontal', 'lateralDer', 'lateralIzq', 'trasero', 'tablero', 'interior'];
            const fSalida = (reserva.fotosSalida as any) || {};
            const faltan = reqFotos.some(pos => !fSalida[pos]);
            if (faltan) {
              faltaIniciar = true;
            }
          }

          if (faltaIniciar) {
            const usuario = reserva.usuario as any;
            await sendPushNotification(
              usuario._id.toString(),
              '¡Retraso en el inicio!',
              'Han pasado más de 30 minutos desde la hora programada y aún no has completado el inicio de tu viaje ni subido las fotos requeridas.',
              { reservaId: reserva._id }
            );
            reserva.notificadoRetrasoInicio = true;
            await reserva.save();
          }
        }
      }
    } catch (err) {
      console.error('Error en cron de retraso de inicio:', err);
    }
  });

  // Cron Job 2: Inspección Aleatoria (cada 30 segundos para pruebas)
  cron.schedule('*/30 * * * * *', async () => {
    try {
      const now = new Date();
      // Filtrar reservas en curso que ya tienen fotos de salida registradas
      const activas = await Reservation.find({ 
        estado: 'en_curso',
        fotosSalidaAt: { $exists: true }
      }).populate('usuario');
      
      // Para PRUEBAS: Permitir hasta 2 inspecciones por conductor en lugar de solo 1
      const inspeccionesExistentes = await InspeccionAleatoria.find({ reserva: { $in: activas.map(r => r._id) } });
      let reservasSinInspeccion = activas.filter(r => {
        const count = inspeccionesExistentes.filter(i => i.reserva?.toString() === r._id.toString()).length;
        return count < 2; // Máximo 2 inspecciones para pruebas
      });

      // Para PRUEBAS: No esperar 10 minutos, generar inmediatamente
      reservasSinInspeccion = reservasSinInspeccion.filter(r => {
        return true; 
      });

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
          
          // Para PRUEBAS: Límite de 30 SEGUNDOS
          const limite = new Date(now.getTime() + 30 * 1000); 

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

  // Cron Job 3: Seguimiento de inspecciones aleatorias (cada 10 segundos para pruebas)
  cron.schedule('*/10 * * * * *', async () => {
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

          await updateUserPoints(insp.usuario.toString(), tipoFlag);

          await notifyAdmins(
            'Inspección Vencida', 
            `El conductor ${(insp.usuario as any).nombre} ignoró la inspección. Bandera ${tipoFlag} generada.`, 
            {}
          );
        } else if (diffMinutes > 0 && diffMinutes % 5 === 0) {
          // Desactivado temporalmente el spam por ser tiempo tan corto
        }
      }
    } catch(err) {
      console.error('Error en cron de seguimiento de inspecciones:', err);
    }
  });

  console.log('Cron jobs inicializados.');
};
