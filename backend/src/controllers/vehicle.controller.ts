import { Request, Response } from 'express';
import Vehicle from '../models/Vehicle.js';

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
