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
    kilometraje?: number;
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
  estado: 'pendiente' | 'aprobada' | 'en_curso' | 'en_transicion' | 'completada' | 'cancelada' | 'rechazada';
  kmSalida?: number;
  kmRetorno?: number;
  fotosSalida?: string[];
  fotosRetorno?: string[];
  observaciones?: string;
  motivoRechazo?: string;
  motivoCancelacion?: string;
  firmaInicio?: string;
  firmaFin?: string;
  solicitudTraspaso?: {
    conductorDestino: string;
    conductorOrigen: string;
    estado: 'pendiente' | 'aceptada' | 'rechazada';
    motivoRechazo?: string;
  };
  tramos?: any[];
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

  startReservation: async (id: string, kmSalida?: number, observacionKmSalida?: string, isTramo?: boolean): Promise<IReservation> => {
    const response = await api.patch(`/reservations/${id}/start`, { kmSalida, observacionKmSalida, isTramo });
    return response.data.reservation;
  },

  completeReservation: async (id: string, kmRetorno: number, observaciones?: string): Promise<IReservation> => {
    const response = await api.patch(`/reservations/${id}/complete`, { kmRetorno, observaciones });
    return response.data.reservation;
  },

  cancel: async (id: string, motivoCancelacion: string): Promise<void> => {
    await api.patch(`/reservations/${id}/cancel`, { motivoCancelacion });
  },

  requestCambioConductorTramo: async (reservaId: string, nuevoConductorId: string, kmActual?: number) => {
    const response = await api.post(`/reservations/${reservaId}/tramos/cambio/request`, { 
      nuevoConductorId, 
      kmActual 
    });
    return response.data;
  },

  responderTraspaso: async (reservaId: string, respuesta: 'aceptar' | 'rechazar', tipo?: 'continuar' | 'regreso', motivo?: string, kmActual?: number) => {
    const response = await api.post(`/reservations/${reservaId}/responder-traspaso`, {
      respuesta,
      tipo,
      motivo,
      kmActual
    });
    return response.data;
  },

  cancelarTraspaso: async (reservaId: string) => {
    const response = await api.patch(`/reservations/${reservaId}/cancelar-traspaso`);
    return response.data;
  },

  cambioConductorTramo: async (id: string, nuevoConductorId: string, kmActual?: number): Promise<any> => {
    const response = await api.post(`/reservations/${id}/tramos/cambio`, { nuevoConductorId, kmActual });
    return response.data;
  },

  handleDelayResponse: async (id: string, acepta: boolean, motivoCancelacion?: string) => {
    const response = await api.post(`/reservations/${id}/handle-delay-response`, { acepta, motivoCancelacion });
    return response.data;
  },

  saveFirma: async (id: string, tipo: 'inicio' | 'fin', firma: string): Promise<void> => {
    await api.patch(`/reservations/${id}/firma`, { tipo, firma });
  },
};
