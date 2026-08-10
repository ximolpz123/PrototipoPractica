// Interfaces TypeScript que espejean los modelos de Mongoose

export interface IUser {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string;
  departamento: string;
  rol: 'usuario' | 'admin';
  activo: boolean;
  licenciaAlDia?: boolean;
  banderaActual?: 'verde' | 'amarilla' | 'naranja' | 'roja';
  historialBanderas?: IFlag[];
  createdAt: string;
  updatedAt: string;
}

export interface IFlag {
  tipo: 'verde' | 'amarilla' | 'naranja' | 'roja';
  motivo: string;
  fecha: string;
  asignadoPor?: string;
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
  nivelBencina?: number;
  tipoIndicador?: 'digital' | 'analogico';
  fotosVehiculo?: string[];
  ultimoMantenimiento?: string;
  imagenUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IReservation {
  _id: string;
  usuario: IUser | string;
  vehiculo: IVehicle | string;
  fechaInicio: string;
  fechaFin: string;
  destino: string;
  motivo: string;
  estado: 'pendiente' | 'aprobada' | 'en_curso' | 'completada' | 'cancelada' | 'rechazada';
  kmSalida?: number;
  kmRetorno?: number;
  fotosSalida?: string[];
  fotosRetorno?: string[];
  observaciones?: string;
  motivoRechazo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IRandomInspection {
  _id: string;
  conductorId: string;
  conductorNombre: string;
  vehiculoId: string;
  vehiculoPlaca: string;
  tarea: string;
  estado: 'pendiente' | 'respondida' | 'vencida';
  fechaActivacion: string;
  respuesta?: {
    texto?: string;
    fotoUrl?: string;
    fechaRespuesta: string;
  };
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  departamento: string;
}

export interface AuthResponse {
  token: string;
  user: IUser;
  message?: string;
}
