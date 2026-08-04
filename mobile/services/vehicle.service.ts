import api from './api';

export interface IVehicle {
  _id: string;
  placa: string;
  marca: string;
  modelo: string;
  anio: number;
  color: string;
  tipo: string;
  estado: 'disponible' | 'reservado' | 'en_curso' | 'mantenimiento' | 'fuera_de_servicio';
  kilometraje: number;
  ultimoMantenimiento?: string;
}

export const vehicleService = {
  getAll: async (): Promise<IVehicle[]> => {
    const response = await api.get('/vehicles');
    return response.data;
  },
  createVehicle: async (data: Partial<IVehicle>): Promise<IVehicle> => {
    const response = await api.post('/vehicles', data);
    return response.data;
  },
  iaCreate: async (fotos: string[]): Promise<any> => {
    const formData = new FormData();
    fotos.forEach((fotoUri, i) => {
      const filename = fotoUri.split('/').pop() || `foto${i}.jpg`;
      formData.append('fotos', {
        uri: fotoUri,
        name: filename,
        type: 'image/jpeg',
      } as any);
    });

    const response = await api.post('/vehicles/ia-create', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};
