import cron from 'node-cron';
import Reservation from '../models/Reservation.js';
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

  console.log('Cron jobs inicializados.');
};
