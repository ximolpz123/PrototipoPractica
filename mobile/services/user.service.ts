import api from './api';
import { IUser } from '../types';

export const userService = {
  getUserFlags: async (userId: string): Promise<any[]> => {
    const response = await api.get(`/users/${userId}/flags`);
    return response.data;
  },
  assignFlag: async (userId: string, tipo: string, motivo: string): Promise<any> => {
    const response = await api.post(`/users/${userId}/flags`, { tipo, motivo });
    return response.data;
  },
};
