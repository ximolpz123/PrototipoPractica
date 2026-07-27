import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  departamento: string;
  rol: 'usuario' | 'admin';
  activo: boolean;
  licenciaAlDia: boolean;
  fechaVencimientoLicencia?: Date;
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
      enum: ['Gerencia', 'Ventas', 'Operaciones', 'TI', 'RRHH', 'Finanzas'],
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
    licenciaAlDia: {
      type: Boolean,
      default: true, // Por defecto se asume al día, RRHH puede cambiarlo
    },
    fechaVencimientoLicencia: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export default model<IUser>('User', userSchema);
