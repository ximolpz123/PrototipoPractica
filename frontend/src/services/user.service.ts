import api from './api';
import type { IUser } from '../types';

export const userService = {
  // Obtener todos los usuarios
  getAll: async (): Promise<IUser[]> => {
    const response = await api.get('/users');
    return response.data;
  },

  // Crear usuario
  create: async (userData: any): Promise<IUser> => {
    const response = await api.post('/users', userData);
    return response.data;
  },

  // Actualizar perfil (departamento, teléfono, avatar)
  updatePerfil: async (id: string, formData: FormData): Promise<IUser> => {
    const response = await api.patch(`/users/${id}/perfil`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Subir / actualizar foto de licencia
  updateLicencia: async (id: string, formData: FormData): Promise<{ message: string; user: IUser }> => {
    const response = await api.patch(`/users/${id}/licencia`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Invalidar licencia (admin o sistema)
  invalidateLicencia: async (id: string): Promise<{ message: string; user: IUser }> => {
    const response = await api.delete(`/users/${id}/licencia`);
    return response.data;
  },

  // Asignar bandera manualmente (admin)
  assignFlag: async (id: string, tipo: string, motivo: string): Promise<any> => {
    const response = await api.post(`/users/${id}/flags`, { tipo, motivo });
    return response.data;
  }
};
