import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../constants';
import { authService } from './auth.service';

const LOCATION_TASK_NAME = 'background-location-task';
export const ACTIVE_RESERVA_KEY = 'active_reserva_id';

// Define el task en segundo plano
// IMPORTANTE: Esto debe definirse en el módulo raíz, fuera de cualquier componente
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: any) => {
  if (error) {
    console.error('Error en location task', error);
    return;
  }
  if (data) {
    const { locations } = data;
    const location = locations[0];
    if (location) {
      try {
        const token = await authService.getToken();

        if (!token) {
          console.warn('📍 GPS activo pero sin token (sesión cerrada). Deteniendo rastreo.');
          await AsyncStorage.removeItem(ACTIVE_RESERVA_KEY);
          const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
          if (isRegistered) {
            await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
          }
          return;
        }

        // Leer el ID de la reserva activa desde AsyncStorage (no hardcodeado)
        const reservaId = await AsyncStorage.getItem(ACTIVE_RESERVA_KEY);

        if (!reservaId) {
          console.warn('📍 GPS activo pero sin reserva activa registrada, saltando envío.');
          return;
        }

        await axios.post(
          `${API_URL}/tracking/${reservaId}`,
          {
            latitud: location.coords.latitude,
            longitud: location.coords.longitude,
            velocidad: location.coords.speed ?? 0,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log(`📍 Ubicación enviada [${location.coords.latitude.toFixed(5)}, ${location.coords.longitude.toFixed(5)}]`);
      } catch (err: any) {
        if (err?.response?.status === 401) {
          // Token inválido → auto-limpiar GPS para no quedar pegado
          console.warn('📍 Error 401: token inválido. Deteniendo GPS automáticamente.');
          await AsyncStorage.removeItem(ACTIVE_RESERVA_KEY);
          const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
          if (isRegistered) {
            await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
          }
        } else {
          console.error('Error enviando ubicación:', err);
        }
      }
    }
  }
});

export const locationService = {
  /**
   * Inicia el rastreo GPS en segundo plano.
   * @param reservaId ID de la reserva activa para asociar el tracking
   */
  startTracking: async (reservaId: string): Promise<boolean> => {
    // Guardar el ID de reserva para que el task de segundo plano lo pueda leer
    await AsyncStorage.setItem(ACTIVE_RESERVA_KEY, reservaId);

    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) {
      console.log('Servicios de ubicación (GPS) apagados en el dispositivo');
      await AsyncStorage.removeItem(ACTIVE_RESERVA_KEY);
      return false; // Debe indicar a la UI que falló
    }

    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
      console.log('Permiso de ubicación en primer plano denegado');
      await AsyncStorage.removeItem(ACTIVE_RESERVA_KEY);
      return false;
    }

    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== 'granted') {
      console.log('Permiso de ubicación en segundo plano denegado');
      await AsyncStorage.removeItem(ACTIVE_RESERVA_KEY);
      return false;
    }

    // Detener cualquier rastreo previo antes de iniciar uno nuevo
    const alreadyRunning = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
    if (alreadyRunning) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    }

    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.Balanced, // Balanceado: buen equilibrio entre precisión y batería
      timeInterval: 1 * 60 * 1000,          // Cada 1 minuto (60,000 ms)
      distanceInterval: 150,                 // O cada 150 metros (lo que ocurra primero)
      showsBackgroundLocationIndicator: true, // Ícono en iOS para avisar al usuario
      foregroundService: {
        // Notificación persistente en Android (obligatoria para background)
        notificationTitle: '📍 Rastreo Activo — Bitnets Flota',
        notificationBody: 'Tu posición se actualiza cada 1 minuto.',
        notificationColor: '#3D9FD3',
      },
      pausesUpdatesAutomatically: false,     // No pausar automáticamente
    });

    console.log('▶️ Rastreo GPS iniciado (intervalo: 1 minuto)');
    return true;
  },

  /**
   * Detiene el rastreo GPS y limpia la reserva activa.
   */
  stopTracking: async (): Promise<void> => {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
    if (isRegistered) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      console.log('⏹️ Rastreo GPS detenido');
    }
    await AsyncStorage.removeItem(ACTIVE_RESERVA_KEY);
  },

  /**
   * Verifica si el rastreo GPS está activo actualmente.
   */
  isTracking: async (): Promise<boolean> => {
    return await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
  },

  /**
   * Obtiene la reserva ID activa (la que está siendo rastreada).
   */
  getActiveReservaId: async (): Promise<string | null> => {
    return await AsyncStorage.getItem(ACTIVE_RESERVA_KEY);
  },
};
