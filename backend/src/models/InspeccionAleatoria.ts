import { Schema, model, Document, Types } from 'mongoose';

export type TipoInspeccion =
  | 'revisarNeumaticos'
  | 'tomarFotoInterior'
  | 'verificarBencina'
  | 'revisarCarroceria'
  | 'tomarFotoTablero';

export interface IInspeccionAleatoria extends Document {
  usuario: Types.ObjectId;
  reserva: Types.ObjectId;
  tipo: TipoInspeccion;
  descripcion: string;             // Mensaje que verá el conductor
  estado: 'pendiente' | 'respondida' | 'vencida';
  respuestaFotoUrl?: string;
  respuestaTexto?: string;
  fechaActivacion: Date;
  fechaLimite: Date;               // fechaActivacion + 20 minutos
  recordatoriosEnviados: number;   // cuántos pushes de spam ya se enviaron
  flagAsignada?: Types.ObjectId;   // referencia a la bandera generada si venció
  createdAt: Date;
  updatedAt: Date;
}

const inspeccionSchema = new Schema<IInspeccionAleatoria>(
  {
    usuario: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reserva: {
      type: Schema.Types.ObjectId,
      ref: 'Reservation',
      required: true,
    },
    tipo: {
      type: String,
      enum: ['revisarNeumaticos', 'tomarFotoInterior', 'verificarBencina', 'revisarCarroceria', 'tomarFotoTablero'],
      required: true,
    },
    descripcion: {
      type: String,
      required: true,
      trim: true,
    },
    estado: {
      type: String,
      enum: ['pendiente', 'respondida', 'vencida'],
      default: 'pendiente',
    },
    respuestaFotoUrl: { type: String },
    respuestaTexto:   { type: String, trim: true },
    fechaActivacion:  { type: Date, required: true },
    fechaLimite:      { type: Date, required: true },
    recordatoriosEnviados: { type: Number, default: 0 },
    flagAsignada: {
      type: Schema.Types.ObjectId,
      ref: 'Flag',
    },
  },
  { timestamps: true }
);

// Para buscar inspecciones pendientes rápidamente en el cron job
inspeccionSchema.index({ estado: 1, fechaLimite: 1 });
inspeccionSchema.index({ usuario: 1, estado: 1 });

export default model<IInspeccionAleatoria>('InspeccionAleatoria', inspeccionSchema);
