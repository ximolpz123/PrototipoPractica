import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Vehicle from './models/Vehicle.js';

dotenv.config();

const updateImages = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('✅ Conectado a MongoDB');

    const vehicles = await Vehicle.find();
    for (const v of vehicles) {
      if (v.marca === 'Volkswagen' && v.color === 'Gris') {
        v.imagenUrl = 'https://images.unsplash.com/photo-1559404060-e8326d953d5a?auto=format&fit=crop&w=800&q=80';
      } else if (v.marca === 'Volkswagen' && v.color === 'Blanco') {
        v.imagenUrl = 'https://images.unsplash.com/photo-1581451512803-db49652a2ea1?auto=format&fit=crop&w=800&q=80';
      } else if (v.marca === 'Toyota' && v.color === 'Plata') {
        v.imagenUrl = 'https://images.unsplash.com/photo-1616423640778-28d1b53229bd?auto=format&fit=crop&w=800&q=80';
      } else if (v.marca === 'Toyota' && v.color === 'Blanco') {
        v.imagenUrl = 'https://images.unsplash.com/photo-1603513492128-ba7bc9b3e143?auto=format&fit=crop&w=800&q=80';
      } else if (v.marca === 'Nissan' && v.color === 'Negro') {
        v.imagenUrl = 'https://images.unsplash.com/photo-1609521263047-f8f205293f24?auto=format&fit=crop&w=800&q=80';
      } else {
        v.imagenUrl = 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80';
      }
      await v.save();
    }
    console.log('📸 Imágenes asignadas a los vehículos en la base de datos');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

updateImages();
