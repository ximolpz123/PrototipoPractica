import { Request, Response } from 'express';
import Vehicle from '../models/Vehicle.js';
import Audit from '../models/Audit.js';
import { AuthRequest } from '../middleware/auth.js';

// Obtener todos los vehículos
export const getVehicles = async (_req: Request, res: Response): Promise<void> => {
  try {
    const vehicles = await Vehicle.find().sort({ marca: 1 });
    res.json(vehicles);
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
    res.status(500).json({ message: 'Error al crear vehículo', error });
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
    await Audit.create({
      usuario: req.userId,
      accion: 'MANTENIMIENTO_VEHICULO',
      entidad: 'Vehicle',
      entidadId: vehicle._id,
      detalles: `El vehículo ${vehicle.placa} ha sido enviado a mantenimiento. (Bloquea futuras reservas)`
    });

    res.json({ message: 'Vehículo enviado a mantenimiento exitosamente', vehicle });
  } catch (error) {
    res.status(500).json({ message: 'Error al poner vehículo en mantenimiento', error });
  }
};
