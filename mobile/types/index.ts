// Interfaces TypeScript — iguales a las del frontend web

export interface IUser {
  id?: string;
  _id?: string;
  nombre: string;
  apellido: string;
  email: string;
  departamento: string;
  telefono?: string;
  rol: 'usuario' | 'admin';
  activo: boolean;
  licenciaEstado?: string;
  licenciaAlDia?: boolean;
  licenciaVencimiento?: string;
  fechaVencimientoLicencia?: string;
  licenciaFotoUrl?: string;
  banderaActual?: string;
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
  nivelBencina?: number;
  tipoIndicador?: 'digital' | 'analogico';
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
