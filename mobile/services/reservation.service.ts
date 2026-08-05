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
    tipoIndicador?: string;
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
  estado: 'pendiente' | 'aprobada' | 'en_curso' | 'completada' | 'cancelada' | 'rechazada';
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

  updateStatus: async (id: string, estado: string, motivoRechazo?: string): Promise<IReservation> => {
    const response = await api.patch(`/reservations/${id}/status`, { estado, motivoRechazo });
    return response.data.reservation;
  },

  create: async (data: {
    vehiculo: string;
    fechaInicio: string;
    fechaFin: string;
    destino: string;
    motivo: string;
    usuarioId?: string;
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

  cambioConductorTramo: async (id: string, nuevoConductorId: string, kmActual?: number): Promise<any> => {
    const response = await api.post(`/reservations/${id}/tramos/cambio`, { nuevoConductorId, kmActual });
    return response.data;
  },

  requestCambioConductorTramo: async (id: string, nuevoConductorId: string, kmActual?: number): Promise<any> => {
    const response = await api.post(`/reservations/${id}/tramos/cambio/request`, { nuevoConductorId, kmActual });
    return response.data;
  },

  handleDelayResponse: async (id: string, acepta: boolean, motivoCancelacion?: string) => {
    const response = await api.post(`/reservations/${id}/handle-delay-response`, { acepta, motivoCancelacion });
    return response.data;
  },
};
