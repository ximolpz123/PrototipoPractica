import api from './api';

export interface IInspeccion {
  _id: string;
  tipo: string;
  descripcion: string;
  estado: 'pendiente' | 'respondida' | 'vencida';
  fechaActivacion: string;
  fechaLimite: string;
  respuestaTexto?: string;
  respuestaFotosUrls?: string[];
  reserva: any;
  usuario: any;
}

export const inspectionService = {
  getTodayInspections: async (): Promise<IInspeccion[]> => {
    const response = await api.get('/inspections');
    return response.data;
  },

  getAllInspections: async (): Promise<IInspeccion[]> => {
    const response = await api.get('/inspections?all=true');
    return response.data;
  },

  getPendingInspections: async (): Promise<IInspeccion[]> => {
    const response = await api.get('/inspections/pending');
    return response.data;
  },

  respondInspection: async (id: string, respuestaTexto?: string, photoUris?: string[]): Promise<IInspeccion> => {
    const formData = new FormData();
    
    if (respuestaTexto) {
      formData.append('respuestaTexto', respuestaTexto);
    }
    
    if (photoUris && photoUris.length > 0) {
      photoUris.forEach((uri) => {
        const filename = uri.split('/').pop() || 'photo.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;
        
        formData.append('fotos', {
          uri,
          name: filename,
          type
        } as any);
      });
    }

    const response = await api.post(`/inspections/${id}/respond`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data.inspeccion;
  }
};
