import { Schema, model, Document, Types } from 'mongoose';

export interface IAudit extends Document {
  usuario: Types.ObjectId;
  accion: string;
  entidad: string;
  entidadId?: Types.ObjectId;
  detalles?: string;
  createdAt: Date;
  updatedAt: Date;
}

const auditSchema = new Schema<IAudit>(
  {
    usuario: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    accion: {
      type: String,
      required: true,
    },
    entidad: {
      type: String,
      required: true,
    },
    entidadId: {
      type: Schema.Types.ObjectId,
    },
    detalles: {
      type: String,
    },
  },
  { timestamps: true }
);

export default model<IAudit>('Audit', auditSchema);
