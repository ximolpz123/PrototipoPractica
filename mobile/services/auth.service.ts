import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';
import type { LoginCredentials, AuthResponse, IUser } from '../types';

export const authService = {
  // Iniciar sesión
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>('/auth/login', credentials);
    await AsyncStorage.setItem('token', data.token);
    await AsyncStorage.setItem('user', JSON.stringify(data.user));
    return data;
  },

  // Cerrar sesión
  logout: async (): Promise<void> => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
  },

  // Obtener el usuario guardado en el dispositivo
  getCurrentUser: async (): Promise<IUser | null> => {
    const user = await AsyncStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  // Verificar si hay sesión activa
  isAuthenticated: async (): Promise<boolean> => {
    const token = await AsyncStorage.getItem('token');
    return !!token;
  },

  // Obtener el token guardado
  getToken: async (): Promise<string | null> => {
    return await AsyncStorage.getItem('token');
  },
};
