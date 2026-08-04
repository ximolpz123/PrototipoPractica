import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { AuthRequest } from '../middleware/auth.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Flag from '../models/Flag.js';

// GET /api/users
export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener usuarios', error });
  }
};

// POST /api/users
export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { nombre, apellido, email, password, departamento, rol, activo } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ message: 'El email ya está registrado' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      nombre,
      apellido,
      email,
      password: hashedPassword,
      departamento,
      rol: rol || 'usuario',
      activo: activo !== undefined ? activo : true
    });

    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear usuario', error });
  }
};

// PUT /api/users/:id
export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { nombre, apellido, email, departamento, telefono, rol, activo } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { nombre, apellido, email, departamento, telefono, rol, activo },
      { new: true }
    ).select('-password');
    
    if (!user) {
      res.status(404).json({ message: 'Usuario no encontrado' });
      return;
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar usuario', error });
  }
};

// PATCH /api/users/:id/perfil
export const updatePerfil = async (req: Request, res: Response): Promise<void> => {
  try {
    // Un usuario solo puede actualizar su propio perfil a menos que sea admin
    // La protección de ID la manejaremos aquí o en middleware
    if (req.params.id !== (req as any).userId && (req as any).userRol !== 'admin') {
      res.status(403).json({ message: 'No tienes permiso para actualizar este perfil' });
      return;
    }

    const { departamento, telefono } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { departamento, telefono },
      { new: true }
    ).select('-password');

    if (!user) {
      res.status(404).json({ message: 'Usuario no encontrado' });
      return;
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar perfil', error });
  }
};

// PATCH /api/users/:id/licencia
export const updateLicencia = async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.params.id !== (req as any).userId && (req as any).userRol !== 'admin') {
      res.status(403).json({ message: 'No tienes permiso para actualizar esta licencia' });
      return;
    }

    const file = req.file;
    if (!file) {
      res.status(400).json({ message: 'Debe proporcionar una imagen de la licencia' });
      return;
    }

    const fotoUrl = file.path; // Cloudinary
    
    // AQUÍ IRÍA LA LLAMADA A LA IA (OpenAI Vision o Google Vision)
    // Para efectos del prototipo y si no hay API KEY, simulamos una respuesta exitosa
    // asumiendo que la licencia vence en 1 año más:
    const fechaSimulada = new Date();
    fechaSimulada.setFullYear(fechaSimulada.getFullYear() + 1);

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { 
        licenciaFotoUrl: fotoUrl,
        licenciaVencimiento: fechaSimulada,
        licenciaEstado: 'vigente',
        licenciaAlDia: true // legacy
      },
      { new: true }
    ).select('-password');

    res.json({
      message: 'Licencia procesada exitosamente con IA (Simulado)',
      user
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar licencia', error });
  }
};

// DELETE /api/users/:id
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      res.status(404).json({ message: 'Usuario no encontrado' });
      return;
    }
    res.json({ message: 'Usuario eliminado' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar usuario', error });
  }
};

// Actualizar push token
export const updatePushToken = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { pushToken } = req.body;
    if (!pushToken) {
      res.status(400).json({ message: 'pushToken es requerido' });
      return;
    }
    
    // Si el usuario que intenta actualizar no es el dueño ni admin
    if (req.params.id !== req.userId && req.userRol !== 'admin') {
      res.status(403).json({ message: 'No tienes permiso para actualizar este token' });
      return;
    }

    const user = await User.findByIdAndUpdate(req.params.id, { pushToken }, { new: true });
    if (!user) {
      res.status(404).json({ message: 'Usuario no encontrado' });
      return;
    }

    res.json({ message: 'Push token actualizado', pushToken: user.pushToken });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar push token', error });
  }
};

// Obtener historial de banderas de un usuario
export const getUserFlags = async (req: Request, res: Response): Promise<void> => {
  try {
    const flags = await Flag.find({ usuario: req.params.id })
      .populate('adminId', 'nombre apellido')
      .populate('reserva', 'fechaInicio fechaFin vehiculo')
      .sort({ createdAt: -1 });
    res.json(flags);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener historial de banderas', error });
  }
};

// Asignar bandera manual (admin)
export const assignFlag = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { tipo, motivo } = req.body;
    if (!['verde', 'amarilla', 'naranja', 'roja'].includes(tipo)) {
      res.status(400).json({ message: 'Tipo de bandera inválido' });
      return;
    }
    
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404).json({ message: 'Usuario no encontrado' });
      return;
    }

    const flag = await Flag.create({
      usuario: req.params.id,
      tipo,
      motivo,
      asignadoPor: 'admin',
      adminId: req.userId,
    });

    user.banderaActual = tipo;
    await user.save();

    res.status(201).json({ message: 'Bandera asignada exitosamente', flag });
  } catch (error) {
    res.status(500).json({ message: 'Error al asignar bandera', error });
  }
};

