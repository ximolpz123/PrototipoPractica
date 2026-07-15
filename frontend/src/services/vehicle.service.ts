import api from './api';
import type { IVehicle } from '../types';

export const vehicleService = {
  getAll: async (): Promise<IVehicle[]> => {
    const { data } = await api.get<IVehicle[]>('/vehicles');
    return data;
  },

  getAvailable: async (): Promise<IVehicle[]> => {
    const { data } = await api.get<IVehicle[]>('/vehicles/available');
    return data;
  },

  getById: async (id: string): Promise<IVehicle> => {
    const { data } = await api.get<IVehicle>(`/vehicles/${id}`);
    return data;
  },
};
