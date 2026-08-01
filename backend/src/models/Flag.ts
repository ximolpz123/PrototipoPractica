import { Schema, model, Document, Types } from 'mongoose';

export type TipoFlag = 'verde' | 'amarilla' | 'naranja' | 'roja';

export interface IFlag extends Document {
  usuario: Types.ObjectId;
  tipo: TipoFlag;
  motivo: string;
  reserva?: Types.ObjectId;       // Reserva que originó la bandera (si aplica)
  asignadoPor: 'sistema' | 'admin';
  adminId?: Types.ObjectId;       // Quién asignó (si fue un admin)
  createdAt: Date;
  updatedAt: Date;
}

const flagSchema = new Schema<IFlag>(
  {
    usuario: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'El usuario es obligatorio'],
    },
    tipo: {
      type: String,
      enum: ['verde', 'amarilla', 'naranja', 'roja'],
      required: [true, 'El tipo de bandera es obligatorio'],
    },
    motivo: {
      type: String,
      required: [true, 'El motivo es obligatorio'],
      trim: true,
    },
    reserva: {
      type: Schema.Types.ObjectId,
      ref: 'Reservation',
    },
    asignadoPor: {
      type: String,
      enum: ['sistema', 'admin'],
      default: 'sistema',
    },
    adminId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

// Índice para consultar rápido por usuario
flagSchema.index({ usuario: 1, createdAt: -1 });

export default model<IFlag>('Flag', flagSchema);
