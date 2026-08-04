import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import User from '../models/User.js';

const expo = new Expo();

export const sendPushNotification = async (userId: string, title: string, body: string, data: any = {}) => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.pushToken) {
      console.log(`Usuario ${userId} no tiene pushToken o no existe. No se puede enviar notificación.`);
      return;
    }

    if (!Expo.isExpoPushToken(user.pushToken)) {
      console.error(`Token Push inválido para el usuario ${userId}: ${user.pushToken}`);
      return;
    }

    const messages: ExpoPushMessage[] = [{
      to: user.pushToken,
      sound: 'default',
      title,
      body,
      data,
    }];

    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      try {
        await expo.sendPushNotificationsAsync(chunk);
      } catch (error) {
        console.error('Error al enviar chunk de notificaciones', error);
      }
    }
  } catch (error) {
    console.error(`Error enviando notificación al usuario ${userId}:`, error);
  }
};

export const notifyAdmins = async (title: string, body: string, data: any = {}) => {
  try {
    const admins = await User.find({ rol: 'admin', pushToken: { $exists: true, $ne: null } });
    if (admins.length === 0) return;

    const messages: ExpoPushMessage[] = admins
      .filter(admin => admin.pushToken && Expo.isExpoPushToken(admin.pushToken))
      .map(admin => ({
        to: admin.pushToken as string,
        sound: 'default',
        title,
        body,
        data,
      }));

    if (messages.length === 0) return;

    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      try {
        await expo.sendPushNotificationsAsync(chunk);
      } catch (error) {
        console.error('Error al enviar notificaciones a admins', error);
      }
    }
  } catch (error) {
    console.error('Error enviando notificación a admins:', error);
  }
};
