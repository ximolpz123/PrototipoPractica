import mongoose, { Schema, Document } from 'mongoose';

export interface IConfig extends Document {
  factorCostoBencina: number;
}

const ConfigSchema: Schema = new Schema(
  {
    factorCostoBencina: {
      type: Number,
      required: true,
      default: 100, // Costo estimado de bencina por km
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IConfig>('Config', ConfigSchema);
