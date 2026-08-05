import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import InspeccionAleatoria from '../models/InspeccionAleatoria.js';

export const getInspections = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const filter: any = { fechaActivacion: { $gte: today } };
    
    // Si no es admin, solo ve sus propias inspecciones
    if (req.userRol !== 'admin') {
      filter.usuario = req.userId;
    }

    const inspecciones = await InspeccionAleatoria.find(filter)
      .populate('usuario', 'nombre apellido departamento')
      .populate('reserva', 'vehiculo destino')
      .sort({ fechaActivacion: -1 });

    res.json(inspecciones);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener inspecciones', error });
  }
};

export const getPendingInspections = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const inspecciones = await InspeccionAleatoria.find({
      usuario: req.userId,
      estado: 'pendiente'
    })
      .populate('reserva', 'vehiculo destino')
      .sort({ fechaLimite: 1 });

    res.json(inspecciones);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener inspecciones pendientes', error });
  }
};

export const respondToInspection = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { respuestaTexto } = req.body;
    const file = req.file;

    const inspeccion = await InspeccionAleatoria.findById(id);
    if (!inspeccion) {
      res.status(404).json({ message: 'Inspección no encontrada' });
      return;
    }

    if (inspeccion.usuario.toString() !== req.userId) {
      res.status(403).json({ message: 'No tienes permiso para responder a esta inspección' });
      return;
    }

    if (inspeccion.estado !== 'pendiente') {
      res.status(400).json({ message: `La inspección ya está ${inspeccion.estado}` });
      return;
    }

    if (!respuestaTexto && !file) {
      res.status(400).json({ message: 'Debes proporcionar un texto o una foto' });
      return;
    }

    inspeccion.estado = 'respondida';
    if (respuestaTexto) {
      inspeccion.respuestaTexto = respuestaTexto;
    }
    if (file) {
      inspeccion.respuestaFotoUrl = file.path; // Cloudinary URL
    }

    await inspeccion.save();
    res.json({ message: 'Inspección respondida exitosamente', inspeccion });
  } catch (error) {
    res.status(500).json({ message: 'Error al responder la inspección', error });
  }
};
