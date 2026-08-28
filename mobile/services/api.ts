import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../constants';
import { eventEmitter } from '../utils/eventEmitter';

// Instancia de axios con la URL base del backend
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor: agrega el token JWT a cada request automáticamente
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor: si el token expira (401), limpia la sesión y emite evento de logout
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Limpiar storage
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      // Notificar a App.tsx para resetear el estado de React y navegar al login
      eventEmitter.emit('UNAUTHORIZED');
    }
    return Promise.reject(error);
  }
);

export default api;
