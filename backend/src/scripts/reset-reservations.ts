import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Import using relative paths based on where this script will be executed from
import Reservation from '../models/Reservation';
import Vehicle from '../models/Vehicle';

// Load .env from backend root
dotenv.config({ path: path.join(__dirname, '../../.env') });

const resetReservations = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined');
    }

    console.log('Connecting to DB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');

    // 1. Delete all reservations
    console.log('Deleting all reservations...');
    const delRes = await Reservation.deleteMany({});
    console.log(`Deleted ${delRes.deletedCount} reservations.`);

    // 2. Set all vehicles to "disponible"
    console.log('Resetting all vehicles to "disponible"...');
    const updVeh = await Vehicle.updateMany({}, { estado: 'disponible' });
    console.log(`Updated ${updVeh.modifiedCount} vehicles.`);

    console.log('Reset complete!');
    process.exit(0);
  } catch (error) {
    console.error('Error resetting DB:', error);
    process.exit(1);
  }
};

resetReservations();
