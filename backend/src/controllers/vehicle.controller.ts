import { Request, Response } from 'express';
import Vehicle from '../models/Vehicle.js';
import Audit from '../models/Audit.js';
import { AuthRequest } from '../middleware/auth.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Reservation from '../models/Reservation.js';

// Obtener todos los vehículos
export const getVehicles = async (_req: Request, res: Response): Promise<void> => {
  try {
    const vehicles = await Vehicle.find().sort({ marca: 1 }).lean();
    
    const activeReservations = await Reservation.find({ estado: 'en_curso' })
      .populate('usuario', 'nombre apellido departamento')
      .lean();
    
    const hoyInicio = new Date();
    hoyInicio.setHours(0, 0, 0, 0);
    const hoyFin = new Date();
    hoyFin.setHours(23, 59, 59, 999);

    const todayReservations = await Reservation.find({
      fechaInicio: { $lte: hoyFin },
      fechaFin: { $gte: hoyInicio },
      estado: { $in: ['aprobada', 'en_curso', 'completada'] }
    }).populate('usuario', 'nombre apellido departamento').lean();
    
    const vehiclesWithInfo = vehicles.map(v => {
      let extra = {};
      if (v.estado === 'reservado') {
        const activeRes = activeReservations.find(r => r.vehiculo.toString() === v._id.toString());
        if (activeRes) extra = { conductorActual: activeRes.usuario };
      }

      const historialHoy = todayReservations
        .filter(r => r.vehiculo.toString() === v._id.toString())
        .map(r => ({
          usuario: r.usuario,
          estado: r.estado,
          fechaInicio: r.fechaInicio,
          fechaFin: r.fechaFin,
        }));

      return { ...v, ...extra, historialHoy };
    });

    res.json(vehiclesWithInfo);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener vehículos', error });
  }
};

// Obtener vehículo por ID
export const getVehicleById = async (req: Request, res: Response): Promise<void> => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      res.status(404).json({ message: 'Vehículo no encontrado' });
      return;
    }
    res.json(vehicle);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener vehículo', error });
  }
};

// Obtener vehículos disponibles
export const getAvailableVehicles = async (_req: Request, res: Response): Promise<void> => {
  try {
    const vehicles = await Vehicle.find({ estado: 'disponible' });
    res.json(vehicles);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener vehículos disponibles', error });
  }
};

// Crear vehículo (admin)
export const createVehicle = async (req: Request, res: Response): Promise<void> => {
  try {
    const vehicle = await Vehicle.create(req.body);
    res.status(201).json(vehicle);
  } catch (error) {
    res.status(500).json({ message: 'Error al subir imagen', error });
  }
};

export const iaCreateVehicle = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ message: 'Se requieren fotos para el análisis' });
      return;
    }

    if (!process.env.GEMINI_API_KEY) {
      res.status(500).json({ message: 'Clave de API de Gemini no configurada' });
      return;
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const prompt = `Analiza las siguientes imágenes de un vehículo (frontal, patente, tablero, etc).
Extrae la siguiente información y devuélvela ÚNICAMENTE como un objeto JSON válido, sin texto adicional ni bloques de código markdown:
{
  "patente": "ej: ABCD12 o null",
  "marca": "ej: Toyota o null",
  "kilometraje": número entero o null,
  "nivelBencina": número entre 0 y 100 o null (representando el %)
}`;

    const imageParts = await Promise.all(
      files.map(async (file) => {
        const response = await fetch(file.path);
        const buffer = await response.arrayBuffer();
        return {
          inlineData: {
            data: Buffer.from(buffer).toString("base64"),
            mimeType: file.mimetype || "image/jpeg"
          }
        };
      })
    );

    const result = await model.generateContent([prompt, ...imageParts]);
    let text = result.response.text().trim();
    
    if (text.startsWith('```json')) text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    if (text.startsWith('```')) text = text.replace(/```/g, '').trim();

    try {
      const data = JSON.parse(text);
      res.json(data);
    } catch (e) {
      console.error("Gemini returned invalid JSON:", text);
      res.status(500).json({ message: 'La IA no devolvió un formato válido', raw: text });
    }
  } catch (error) {
    console.error('Error en iaCreateVehicle:', error);
    res.status(500).json({ message: 'Error procesando las imágenes con IA' });
  }
};


// Actualizar vehículo (admin)
export const updateVehicle = async (req: Request, res: Response): Promise<void> => {
  try {
    const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!vehicle) {
      res.status(404).json({ message: 'Vehículo no encontrado' });
      return;
    }
    res.json(vehicle);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar vehículo', error });
  }
};

// Eliminar vehículo (admin)
export const deleteVehicle = async (req: Request, res: Response): Promise<void> => {
  try {
    const vehicle = await Vehicle.findByIdAndDelete(req.params.id);
    if (!vehicle) {
      res.status(404).json({ message: 'Vehículo no encontrado' });
      return;
    }
    res.json({ message: 'Vehículo eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar vehículo', error });
  }
};

// Poner vehículo en mantenimiento (admin)
export const setVehicleMaintenance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const vehicle = await Vehicle.findByIdAndUpdate(
      req.params.id,
      { estado: 'mantenimiento' },
      { new: true }
    );

    if (!vehicle) {
      res.status(404).json({ message: 'Vehículo no encontrado' });
      return;
    }

    // Registro de Auditoría
    // await Audit.create({
    //  usuario: req.userId,
    //  accion: 'MANTENIMIENTO_VEHICULO',
    //  entidad: 'Vehicle',
    //  entidadId: vehicle!._id,
    //   detalles: `El vehículo ${vehicle!.placa} ha sido enviado a mantenimiento. (Bloquea futuras reservas)`
    // });

    res.json({ message: 'Vehículo enviado a mantenimiento exitosamente', vehicle });
  } catch (error) {
    res.status(500).json({ message: 'Error al poner vehículo en mantenimiento', error });
  }
};

// Subir imagen de vehículo
export const uploadVehicleImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ message: 'No se proporcionó imagen' });
      return;
    }
    // Cloudinary multer storage sets the url in req.file.path
    res.json({ url: file.path });
  } catch (error) {
    res.status(500).json({ message: 'Error al subir imagen de vehículo', error });
  }
};
