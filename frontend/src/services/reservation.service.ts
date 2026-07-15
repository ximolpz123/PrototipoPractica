import api from './api';
import type { IReservation } from '../types';

export const reservationService = {
  getAll: async (): Promise<IReservation[]> => {
    const { data } = await api.get<IReservation[]>('/reservations');
    return data;
  },

  create: async (reservationData: {
    vehiculo: string;
    fechaInicio: string;
    fechaFin: string;
    destino: string;
    motivo: string;
  }): Promise<IReservation> => {
    const { data } = await api.post<IReservation>('/reservations', reservationData);
    return data;
  },

  cancel: async (id: string): Promise<IReservation> => {
    const { data } = await api.patch<IReservation>(`/reservations/${id}/cancel`);
    return data;
  },
};
