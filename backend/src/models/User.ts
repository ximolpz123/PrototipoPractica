import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  departamento: string;
  telefono?: string;
  rol: 'usuario' | 'admin';
  activo: boolean;
  banderaActual: 'verde' | 'amarilla' | 'naranja' | 'roja' | 'ninguna';
  pushToken?: string;
  // ── Licencia (sistema antiguo — se mantiene por compatibilidad) ──
  licenciaAlDia: boolean;
  fechaVencimientoLicencia?: Date;
  // ── Licencia v2 (con foto e IA) ──
  licenciaFotoUrl?: string;
  licenciaVencimiento?: Date;
  licenciaEstado: 'vigente' | 'vencida' | 'pendiente';
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      trim: true,
    },
    apellido: {
      type: String,
      required: [true, 'El apellido es obligatorio'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'El email es obligatorio'],
      unique: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Email no válido'],
    },
    password: {
      type: String,
      required: [true, 'La contraseña es obligatoria'],
      minlength: 6,
      select: false, // No se devuelve en queries por defecto
    },
    departamento: {
      type: String,
      required: true,
      enum: ['Operaciones', 'Jefatura'],
    },
    telefono: {
      type: String,
      trim: true,
    },
    rol: {
      type: String,
      enum: ['usuario', 'admin'],
      default: 'usuario',
    },
    activo: {
      type: Boolean,
      default: true,
    },
    banderaActual: {
      type: String,
      enum: ['verde', 'amarilla', 'naranja', 'roja', 'ninguna'],
      default: 'ninguna',
    },
    pushToken: {
      type: String,
    },
    // ── Licencia (sistema antiguo — se mantiene por compatibilidad) ──
    licenciaAlDia: {
      type: Boolean,
      default: true,
    },
    fechaVencimientoLicencia: {
      type: Date,
      default: null,
    },
    // ── Licencia v2 (con foto e IA) ──
    licenciaFotoUrl: {
      type: String,
    },
    licenciaVencimiento: {
      type: Date,
    },
    licenciaEstado: {
      type: String,
      enum: ['vigente', 'vencida', 'pendiente'],
      default: 'pendiente',
    },
  },
  { timestamps: true }
);

export default model<IUser>('User', userSchema);
