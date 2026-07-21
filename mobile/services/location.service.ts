import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import axios from 'axios';
import { API_URL } from '../constants';
import { authService } from './auth.service';

const LOCATION_TASK_NAME = 'background-location-task';

// Define el task en segundo plano
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
        // Por ahora, asumimos que '6a5e8c12faf82a430d99924b' es la reserva activa para la demo
        // En una app real, el ID de la reserva activa debe guardarse en AsyncStorage o pasar al task
        const reservaId = '6a5e8c12faf82a430d99924b';
        
        await axios.post(
          `${API_URL}/tracking/${reservaId}`,
          {
            latitud: location.coords.latitude,
            longitud: location.coords.longitude,
            velocidad: location.coords.speed
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log('📍 Ubicación en segundo plano enviada al servidor');
      } catch (err) {
        console.error('Error enviando ubicación:', err);
      }
    }
  }
});

export const locationService = {
  startTracking: async () => {
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
      console.log('Permiso de ubicación en primer plano denegado');
      return false;
    }

    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== 'granted') {
      console.log('Permiso de ubicación en segundo plano denegado');
      return false;
    }

    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 5 * 60 * 1000, // Cada 5 minutos (300000ms)
      distanceInterval: 100, // o cada 100 metros
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'Rastreo Activo',
        notificationBody: 'Tu ubicación está siendo monitoreada por la empresa.',
        notificationColor: '#3D9FD3',
      },
    });
    console.log('▶️ Rastreo GPS iniciado');
    return true;
  },

  stopTracking: async () => {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
    if (isRegistered) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      console.log('⏹️ Rastreo GPS detenido');
    }
  },
};
