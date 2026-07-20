// Interfaces TypeScript — iguales a las del frontend web

export interface IUser {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  departamento: string;
  rol: 'usuario' | 'admin';
  activo: boolean;
}

export interface IVehicle {
  _id: string;
  placa: string;
  marca: string;
  modelo: string;
  anio: number;
  color: string;
  tipo: 'sedan' | 'suv' | 'pickup' | 'van';
  estado: 'disponible' | 'reservado' | 'mantenimiento' | 'fuera_de_servicio';
  kilometraje: number;
  ultimoMantenimiento?: string;
  imagenUrl?: string;
}

export interface IReservation {
  _id: string;
  usuario: IUser | string;
  vehiculo: IVehicle | string;
  fechaInicio: string;
  fechaFin: string;
  destino: string;
  motivo: string;
  estado: 'pendiente' | 'aprobada' | 'en_curso' | 'completada' | 'cancelada';
  kmSalida?: number;
  kmRetorno?: number;
  observaciones?: string;
  createdAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: IUser;
  message?: string;
}
