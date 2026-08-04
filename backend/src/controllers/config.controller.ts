import { Request, Response } from 'express';
import Config from '../models/Config.js';

export const getConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    let config = await Config.findOne();
    if (!config) {
      config = await Config.create({ factorCostoBencina: 100 });
    }
    res.json(config);
  } catch (error) {
    console.error('Error fetching config:', error);
    res.status(500).json({ message: 'Error en el servidor al obtener la configuración' });
  }
};

export const updateConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const { factorCostoBencina } = req.body;
    let config = await Config.findOne();
    if (!config) {
      config = await Config.create({ factorCostoBencina });
    } else {
      if (factorCostoBencina !== undefined) config.factorCostoBencina = factorCostoBencina;
      await config.save();
    }
    res.json(config);
  } catch (error) {
    console.error('Error updating config:', error);
    res.status(500).json({ message: 'Error en el servidor al actualizar la configuración' });
  }
};
