import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './models/User.js';
import Vehicle from './models/Vehicle.js';
import Reservation from './models/Reservation.js';

dotenv.config();

const seedData = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI) {
      throw new Error('MONGODB_URI no está definida. Copia .env.example a .env y configúralo.');
    }

    await mongoose.connect(mongoURI);
    console.log('✅ Conectado a MongoDB');

    // Limpiar colecciones existentes
    await User.deleteMany({});
    await Vehicle.deleteMany({});
    await Reservation.deleteMany({});
    console.log('🗑️  Colecciones limpiadas');

    // --- Crear usuarios de prueba ---
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    const users = await User.insertMany([
      {
        nombre: 'Carlos',
        apellido: 'Martínez',
        email: 'admin@empresa.com',
        password: hashedPassword,
        departamento: 'TI',
        rol: 'admin',
        activo: true,
      },
    ]);

    console.log(`👥 ${users.length} usuarios creados`);

    // --- Crear los 5 vehículos reales de la empresa ---
    const vehicles = await Vehicle.insertMany([
      {
        placa: 'AMK-2024',
        marca: 'Volkswagen',
        modelo: 'Amarok',
        anio: 2024,
        color: 'Blanco',
        tipo: 'pickup',
        estado: 'disponible',
        kilometraje: 12000,
        ultimoMantenimiento: new Date('2026-06-01'),
      },
      {
        placa: 'AMK-2025',
        marca: 'Volkswagen',
        modelo: 'Amarok',
        anio: 2025,
        color: 'Gris',
        tipo: 'pickup',
        estado: 'disponible',
        kilometraje: 2500,
        ultimoMantenimiento: new Date('2026-07-15'),
      },
      {
        placa: 'HLX-2024',
        marca: 'Toyota',
        modelo: 'Hilux SRV',
        anio: 2024,
        color: 'Plata',
        tipo: 'pickup',
        estado: 'disponible',
        kilometraje: 15500,
        ultimoMantenimiento: new Date('2026-05-10'),
      },
      {
        placa: 'HLX-2025',
        marca: 'Toyota',
        modelo: 'Hilux SRV',
        anio: 2025,
        color: 'Blanco',
        tipo: 'pickup',
        estado: 'disponible',
        kilometraje: 1800,
        ultimoMantenimiento: new Date('2026-07-20'),
      },
      {
        placa: 'NSN-2024',
        marca: 'Nissan',
        modelo: 'Versa',
        anio: 2024,
        color: 'Negro',
        tipo: 'sedan',
        estado: 'disponible',
        kilometraje: 9000,
        ultimoMantenimiento: new Date('2026-06-25'),
      },
    ]);

    console.log(`🚗 ${vehicles.length} vehículos creados`);

    // --- Crear algunas reservas de ejemplo ---
    // (Omitidas temporalmente porque solo existe el usuario Admin)
    
    console.log(`📅 0 reservas creadas`);

    // --- Resumen ---
    console.log('\n========================================');
    console.log('   🎉 SEED COMPLETADO EXITOSAMENTE');
    console.log('========================================');
    console.log('\n📋 Credenciales de prueba:');
    console.log('   Admin:   admin@empresa.com / password123');
    console.log('========================================\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en seed:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

seedData();
