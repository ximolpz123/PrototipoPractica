import api from './api';

export interface IInspeccion {
  _id: string;
  tipo: string;
  descripcion: string;
  estado: 'pendiente' | 'respondida' | 'vencida';
  fechaActivacion: string;
  fechaLimite: string;
  respuestaTexto?: string;
  respuestaFotoUrl?: string;
  reserva: any;
  usuario: any;
}

export const inspectionService = {
  getTodayInspections: async (): Promise<IInspeccion[]> => {
    const response = await api.get('/inspections');
    return response.data;
  },

  getPendingInspections: async (): Promise<IInspeccion[]> => {
    const response = await api.get('/inspections/pending');
    return response.data;
  },

  respondInspection: async (id: string, respuestaTexto?: string, photoUri?: string): Promise<IInspeccion> => {
    const formData = new FormData();
    
    if (respuestaTexto) {
      formData.append('respuestaTexto', respuestaTexto);
    }
    
    if (photoUri) {
      const filename = photoUri.split('/').pop() || 'photo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;
      
      formData.append('foto', {
        uri: photoUri,
        name: filename,
        type
      } as any);
    }

    const response = await api.post(`/inspections/${id}/respond`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data.inspeccion;
  }
};
