import type { IRandomInspection } from '../types';

const API_URL = 'http://localhost:5000/api/inspections';

export const inspectionService = {
  getAll: async (token: string): Promise<IRandomInspection[]> => {
    const response = await fetch(API_URL, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    if (!response.ok) throw new Error('Error al obtener inspecciones');
    return response.json();
  },

  getPending: async (token: string): Promise<IRandomInspection[]> => {
    const response = await fetch(`${API_URL}/pending`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    if (!response.ok) throw new Error('Error al obtener inspecciones pendientes');
    return response.json();
  }
};
