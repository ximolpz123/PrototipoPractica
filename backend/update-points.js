import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/prototipopractica';

const userSchema = new mongoose.Schema({
  email: String,
  puntos: Number,
  banderaActual: String
}, { strict: false });

const User = mongoose.model('User', userSchema);

async function update() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Conectado a MongoDB.');
    
    await User.updateOne({ email: 'usuario@empresa.com' }, { $set: { puntos: 34, banderaActual: 'naranja' } });
    console.log('Juan Perez (usuario@empresa.com) actualizado a 34 puntos (naranja).');
    
    await User.updateOne({ email: 'usuario2@empresa.com' }, { $set: { puntos: 20, banderaActual: 'roja' } });
    console.log('Luis Perez (usuario2@empresa.com) actualizado a 20 puntos (roja).');
    
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

update();
