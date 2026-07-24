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
  createdAt: string;
}

export const reservationService = {
  getMyReservations: async (): Promise<IReservation[]> => {
    const response = await api.get('/reservations');
    return response.data;
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

  cancel: async (id: string): Promise<void> => {
    await api.put(`/reservations/${id}/cancel`);
  },
};
