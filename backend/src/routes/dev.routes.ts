import { Router, Request, Response } from 'express';
import { timeService } from '../services/time.service.js';

const router = Router();

// POST /api/dev/time
router.post('/time', (req: Request, res: Response) => {
  const { action, hours, days } = req.body;

  try {
    if (action === 'reset') {
      timeService.reset();
      res.json({ message: 'Tiempo reiniciado', simulatedTime: timeService.getCurrentTime() });
      return;
    }

    let offset = timeService.getOffset();
    if (hours) offset += hours * 60 * 60 * 1000;
    if (days) offset += days * 24 * 60 * 60 * 1000;

    timeService.setOffset(offset);
    res.json({ message: 'Tiempo actualizado', simulatedTime: timeService.getCurrentTime() });
  } catch (error) {
    res.status(500).json({ message: 'Error al cambiar tiempo', error });
  }
});

export default router;
