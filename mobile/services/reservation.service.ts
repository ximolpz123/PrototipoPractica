import api from './api';

export interface IReservation {
  _id: string;
  vehiculo: {
    _id: string;
    placa: string;
    marca: string;
    modelo: string;
    color: string;
    tipo: string;
  };
  usuario: {
    _id: string;
    nombre: string;
    apellido: string;
    email: string;
  };
  fechaInicio: string;
  fechaFin: string;
  destino: string;
  motivo: string;
  estado: 'pendiente' | 'aprobada' | 'en_curso' | 'completada' | 'cancelada';
  kmSalida?: number;
  kmRetorno?: number;
  fotosSalida?: string[];
  fotosRetorno?: string[];
  observaciones?: string;
  motivoRechazo?: string;
  createdAt: string;
}

export const reservationService = {
  // Conductor: solo sus reservas
  getMyReservations: async (): Promise<IReservation[]> => {
    const response = await api.get('/reservations');
    return response.data;
  },

  // Admin: todas las reservas del sistema
  getAllReservations: async (): Promise<IReservation[]> => {
    const response = await api.get('/reservations');
    return response.data;
  },

  // Admin: aprobar, rechazar, etc.
  updateStatus: async (id: string, estado: string): Promise<IReservation> => {
    const response = await api.patch(`/reservations/${id}/status`, { estado });
    return response.data.reservation;
  },

  create: async (data: {
    vehiculo: string;
    fechaInicio: string;
    fechaFin: string;
    destino: string;
    motivo: string;
  }): Promise<IReservation> => {
    const response = await api.post('/reservations', data);
    return response.data;
  },

  startReservation: async (id: string): Promise<IReservation> => {
    const response = await api.patch(`/reservations/${id}/start`);
    return response.data.reservation;
  },

  completeReservation: async (id: string, kmRetorno: number, observaciones?: string): Promise<IReservation> => {
    const response = await api.patch(`/reservations/${id}/complete`, { kmRetorno, observaciones });
    return response.data.reservation;
  },

  cancel: async (id: string, motivoRechazo?: string): Promise<void> => {
    await api.patch(`/reservations/${id}/cancel`, { motivoRechazo });
  },
};
