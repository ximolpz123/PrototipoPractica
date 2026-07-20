import { Schema, model, Document, Types } from 'mongoose';

export interface ITracking extends Document {
  reserva: Types.ObjectId;
  vehiculo: Types.ObjectId;
  latitud: number;
  longitud: number;
  velocidad?: number;
  timestamp: Date;
}

const trackingSchema = new Schema<ITracking>(
  {
    reserva: {
      type: Schema.Types.ObjectId,
      ref: 'Reservation',
      required: true,
    },
    vehiculo: {
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: true,
    },
    latitud: {
      type: Number,
      required: true,
    },
    longitud: {
      type: Number,
      required: true,
    },
    velocidad: {
      type: Number,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false }
);

// Índices para consultas rápidas de historial
trackingSchema.index({ reserva: 1, timestamp: -1 });
trackingSchema.index({ vehiculo: 1, timestamp: -1 });

export default model<ITracking>('Tracking', trackingSchema);
