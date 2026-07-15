import { Schema, model, Document, Types } from 'mongoose';

export interface IReservation extends Document {
  usuario: Types.ObjectId;
  vehiculo: Types.ObjectId;
  fechaInicio: Date;
  fechaFin: Date;
  destino: string;
  motivo: string;
  estado: 'pendiente' | 'aprobada' | 'en_curso' | 'completada' | 'cancelada';
  kmSalida?: number;
  kmRetorno?: number;
  observaciones?: string;
  createdAt: Date;
  updatedAt: Date;
}

const reservationSchema = new Schema<IReservation>(
  {
    usuario: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'El usuario es obligatorio'],
    },
    vehiculo: {
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: [true, 'El vehículo es obligatorio'],
    },
    fechaInicio: {
      type: Date,
      required: [true, 'La fecha de inicio es obligatoria'],
    },
    fechaFin: {
      type: Date,
      required: [true, 'La fecha de fin es obligatoria'],
      validate: {
        validator: function (this: IReservation, value: Date) {
          return value > this.fechaInicio;
        },
        message: 'La fecha de fin debe ser posterior a la de inicio',
      },
    },
    destino: {
      type: String,
      required: [true, 'El destino es obligatorio'],
      trim: true,
    },
    motivo: {
      type: String,
      required: [true, 'El motivo es obligatorio'],
      trim: true,
    },
    estado: {
      type: String,
      enum: ['pendiente', 'aprobada', 'en_curso', 'completada', 'cancelada'],
      default: 'pendiente',
    },
    kmSalida: { type: Number, min: 0 },
    kmRetorno: { type: Number, min: 0 },
    observaciones: { type: String, trim: true },
  },
  { timestamps: true }
);

// Índice compuesto para evitar doble reserva del mismo vehículo en el mismo rango
reservationSchema.index({ vehiculo: 1, fechaInicio: 1, fechaFin: 1 });
// Índice para consultas por usuario
reservationSchema.index({ usuario: 1, estado: 1 });

export default model<IReservation>('Reservation', reservationSchema);
