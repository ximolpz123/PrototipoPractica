import api from './api';

export interface IVehicle {
  _id: string;
  placa: string;
  marca: string;
  modelo: string;
  anio: number;
  color: string;
  tipo: string;
  estado: 'disponible' | 'reservado' | 'mantenimiento' | 'fuera_de_servicio';
  kilometraje: number;
  ultimoMantenimiento?: string;
}

export const vehicleService = {
  getAll: async (): Promise<IVehicle[]> => {
    const response = await api.get('/vehicles');
    return response.data;
  },
};
