import { Schema, model, Document } from 'mongoose';

export interface IVehicle extends Document {
  placa: string;
  marca: string;
  modelo: string;
  anio: number;
  color: string;
  tipo: 'sedan' | 'suv' | 'pickup' | 'van';
  estado: 'disponible' | 'reservado' | 'mantenimiento' | 'fuera_de_servicio';
  kilometraje: number;
  ultimoMantenimiento?: Date;
  imagenUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const vehicleSchema = new Schema<IVehicle>(
  {
    placa: {
      type: String,
      required: [true, 'La placa es obligatoria'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    marca: {
      type: String,
      required: [true, 'La marca es obligatoria'],
    },
    modelo: {
      type: String,
      required: [true, 'El modelo es obligatorio'],
    },
    anio: {
      type: Number,
      required: true,
      min: 2015,
      max: new Date().getFullYear() + 1,
    },
    color: {
      type: String,
      required: true,
    },
    tipo: {
      type: String,
      enum: ['sedan', 'suv', 'pickup', 'van'],
      required: true,
    },
    estado: {
      type: String,
      enum: ['disponible', 'reservado', 'mantenimiento', 'fuera_de_servicio'],
      default: 'disponible',
    },
    kilometraje: {
      type: Number,
      default: 0,
      min: 0,
    },
    ultimoMantenimiento: {
      type: Date,
    },
    imagenUrl: {
      type: String,
    },
  },
  { timestamps: true }
);

export default model<IVehicle>('Vehicle', vehicleSchema);
