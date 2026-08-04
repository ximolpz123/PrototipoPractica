import api from './api';
import { IUser } from '../types';

export const userService = {
  getAll: async (): Promise<IUser[]> => {
    const response = await api.get('/users');
    return response.data;
  },
  getUserFlags: async (userId: string): Promise<any[]> => {
    const response = await api.get(`/users/${userId}/flags`);
    return response.data;
  },
  assignFlag: async (userId: string, tipo: string, motivo: string): Promise<any> => {
    const response = await api.post(`/users/${userId}/flags`, { tipo, motivo });
    return response.data;
  },
  updatePushToken: async (userId: string, pushToken: string): Promise<any> => {
    const response = await api.patch(`/users/${userId}/push-token`, { pushToken });
    return response.data;
  }
};
