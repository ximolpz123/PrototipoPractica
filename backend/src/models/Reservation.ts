import { Schema, model, Document, Types } from 'mongoose';

// ── Estructura de fotos v2 (6 posiciones obligatorias) ──────────────────────
export interface IFotosEvidencia {
  frontal?: string;
  lateralDer?: string;
  lateralIzq?: string;
  trasero?: string;
  tablero?: string;
  interior?: string;
}

// ── Tramo de viaje (para cambio de conductor) ───────────────────────────────
export interface ITramo {
  conductor: Types.ObjectId;
  fechaInicio: Date;
  fechaFin?: Date;
  gpsActivo: boolean;
  kmInicio?: number;
  kmFin?: number;
  fotosInicio?: IFotosEvidencia;
  requiereFotosInicio?: boolean;
}

export interface IReservation extends Document {
  usuario: Types.ObjectId;
  vehiculo: Types.ObjectId;
  fechaInicio: Date;
  fechaFin: Date;
  destino: string;
  motivo: string;
  estado: 'pendiente' | 'aprobada' | 'en_curso' | 'en_transicion' | 'completada' | 'cancelada' | 'rechazada';
  kmSalida?: number;
  observacionKmSalida?: string;
  kmRetorno?: number;
  justificacionKm?: string;
  // ── Fotos v2 (objeto con posiciones) ──
  fotosSalida?: IFotosEvidencia;
  fotosSalidaAt?: Date;
  fotosRetorno?: IFotosEvidencia;
  // ── Fotos legacy (array — se mantiene por compatibilidad) ──
  fotosSalidaLegacy?: string[];
  fotosRetornoLegacy?: string[];
  // ── Bencina y tablero ──
  nivelBencinaRetorno?: number;   // 0–100
  kmTableroUrl?: string;          // URL de la foto del tablero para la IA
  // ── Sub-viajes / cambio de conductor ──
  tramos?: ITramo[];
  solicitudTraspaso?: {
    conductorDestino: Types.ObjectId;
    conductorOrigen: Types.ObjectId;
    estado: 'pendiente' | 'aceptada' | 'rechazada' | 'cancelada';
    motivoRechazo?: string;
  };
  observaciones?: string;
  motivoRechazo?: string;
  motivoCancelacion?: string;
  // ── Firmas Digitales ──
  firmaInicio?: string;           // URL de la firma digital al inicio del viaje
  firmaFin?: string;              // URL de la firma digital al finalizar el viaje
  // ── Notificaciones de retraso ──
  notificadoRetrasoInicio?: boolean;
  notificadoRetraso?: boolean;
  notificadoAdmin?: boolean;
  demoraAceptadaSiguiente?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ── Sub-esquema de fotos ─────────────────────────────────────────────────────
const fotosEvidenciaSchema = new Schema<IFotosEvidencia>(
  {
    frontal:    { type: String },
    lateralDer: { type: String },
    lateralIzq: { type: String },
    trasero:    { type: String },
    tablero:    { type: String },
    interior:   { type: String },
  },
  { _id: false }
);

// ── Sub-esquema de tramo ─────────────────────────────────────────────────────
const tramoSchema = new Schema<ITramo>(
  {
    conductor:  { type: Schema.Types.ObjectId, ref: 'User', required: true },
    fechaInicio: { type: Date, required: true },
    fechaFin:   { type: Date },
    gpsActivo:  { type: Boolean, default: true },
    kmInicio:   { type: Number, min: 0 },
    kmFin:      { type: Number, min: 0 },
    fotosInicio: { type: fotosEvidenciaSchema },
    requiereFotosInicio: { type: Boolean, default: false }
  },
  { _id: false }
);

// ── Esquema principal ────────────────────────────────────────────────────────
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
      enum: ['pendiente', 'aprobada', 'en_curso', 'en_transicion', 'completada', 'cancelada', 'rechazada'],
      default: 'pendiente',
    },
    kmSalida: {
      type: Number,
      required: false
    },
    observacionKmSalida: {
      type: String,
      required: false
    },
    kmRetorno: { type: Number, min: 0 },
    // ── Fotos v2 ──
    fotosSalida:   { type: fotosEvidenciaSchema },
    fotosSalidaAt: { type: Date },
    fotosRetorno:  { type: fotosEvidenciaSchema },
    // ── Fotos legacy ──
    fotosSalidaLegacy:  [{ type: String }],
    fotosRetornoLegacy: [{ type: String }],
    // ── Bencina y tablero ──
    nivelBencinaRetorno: { type: Number, min: 0, max: 100 },
    kmTableroUrl:        { type: String },
    // ── Tramos ──
    tramos: [tramoSchema],
    solicitudTraspaso: {
      conductorDestino: { type: Schema.Types.ObjectId, ref: 'User' },
      conductorOrigen:  { type: Schema.Types.ObjectId, ref: 'User' },
      estado: { type: String, enum: ['pendiente', 'aceptada', 'rechazada', 'cancelada'] },
      motivoRechazo: { type: String, trim: true }
    },
    observaciones:  { type: String, trim: true },
    motivoRechazo: {
      type: String,
      trim: true,
    },
    motivoCancelacion: {
      type: String,
      trim: true,
    },
    // ── Firmas Digitales ──
    firmaInicio: { type: String },   // base64 PNG de la firma al iniciar
    firmaFin:    { type: String },   // base64 PNG de la firma al finalizar
    // ── Notificaciones de retraso ──
    notificadoRetrasoInicio: {
      type: Boolean,
      default: false,
    },
    notificadoRetraso: {
      type: Boolean,
      default: false,
    },
    notificadoAdmin: {
      type: Boolean,
      default: false,
    },
    demoraAceptadaSiguiente: {
      type: Boolean,
    },
  },
  { timestamps: true }
);

// Índice compuesto para evitar doble reserva del mismo vehículo en el mismo rango
reservationSchema.index({ vehiculo: 1, fechaInicio: 1, fechaFin: 1 });
// Índice para consultas por usuario
reservationSchema.index({ usuario: 1, estado: 1 });

export default model<IReservation>('Reservation', reservationSchema);
