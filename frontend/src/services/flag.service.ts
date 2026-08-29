// Extendemos IFlag para incluir los campos populados por el backend (usuario, adminId, reserva)
export interface IAdminFlag {
  _id: string;
  tipo: 'verde' | 'amarilla' | 'naranja' | 'roja';
  motivo: string;
  asignadoPor: 'sistema' | 'admin';
  createdAt: string;
  updatedAt: string;
  usuario?: {
    _id: string;
    nombre: string;
    apellido: string;
    departamento: string;
  };
  adminId?: {
    _id: string;
    nombre: string;
    apellido: string;
  };
  reserva?: {
    _id: string;
    fechaInicio: string;
    fechaFin: string;
    vehiculo: string;
  };
}

const API_URL = 'http://localhost:5000/api/flags';

export const flagService = {
  getAll: async (token: string): Promise<IAdminFlag[]> => {
    const response = await fetch(API_URL, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    if (!response.ok) throw new Error('Error al obtener banderas');
    return response.json();
  }
};
