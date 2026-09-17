import User from '../models/User.js';
import InspeccionAleatoria, { TipoInspeccion } from '../models/InspeccionAleatoria.js';

/**
 * Updates a user's points based on a newly created flag.
 * Also handles penalties (creating inspections or blocking account).
 * 
 * @param userId - The ID of the user
 * @param flagType - The type of flag ('verde', 'amarilla', 'naranja', 'roja')
 */
export const updateUserPoints = async (userId: string, flagType: 'verde' | 'amarilla' | 'naranja' | 'roja'): Promise<void> => {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    let pointDelta = 0;
    switch (flagType) {
      case 'verde':
        pointDelta = 5;
        break;
      case 'amarilla':
        pointDelta = -10;
        break;
      case 'naranja':
        pointDelta = -20;
        break;
      case 'roja':
        pointDelta = -30;
        break;
    }

    // Update points
    user.puntos += pointDelta;
    
    // Limits
    if (user.puntos > 100) user.puntos = 100;
    if (user.puntos < 0) user.puntos = 0;

    // Update banderaActual based on points
    if (user.puntos >= 76) {
      user.banderaActual = 'verde';
    } else if (user.puntos >= 51) {
      user.banderaActual = 'amarilla';
    } else if (user.puntos >= 21) {
      user.banderaActual = 'naranja';
    } else {
      user.banderaActual = 'roja';
    }

    // Penalties logic
    // We only assign inspections if they receive a negative flag and remain in the penalty zone.
    if (pointDelta < 0) {
      if (user.puntos < 10 && user.activo) {
        // Block account
        user.activo = false;
        // Optionally generate a push notification or email here
      } else if (user.puntos >= 10 && user.puntos <= 20) {
        // 3 Inspecciones
        await generatePenaltyInspections(user._id.toString(), 3);
      } else if (user.puntos <= 35 && user.puntos > 20) {
        // 2 Inspecciones
        await generatePenaltyInspections(user._id.toString(), 2);
      }
    }

    await user.save();
  } catch (error) {
    console.error('Error in updateUserPoints:', error);
  }
};

const generatePenaltyInspections = async (userId: string, count: number): Promise<void> => {
  const genericTypes: TipoInspeccion[] = [
    'tomarFotoTablero',
    'tomarFotoInterior',
    'revisarNeumaticos',
    'revisarCarroceria',
    'verificarBencina'
  ];

  for (let i = 0; i < count; i++) {
    // Pick a random type
    const tipo = genericTypes[Math.floor(Math.random() * genericTypes.length)];
    
    // Inspections expire in 24 hours for penalties since they might not be driving right now.
    const now = new Date();
    const deadline = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    await InspeccionAleatoria.create({
      usuario: userId,
      tipo,
      descripcion: `Inspección de penalidad por bajo puntaje de conductor. Por favor completa esta tarea.`,
      estado: 'pendiente',
      fechaActivacion: now,
      fechaLimite: deadline,
    });
  }
};
