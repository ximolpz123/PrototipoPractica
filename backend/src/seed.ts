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

    // --- Crear los 4 vehículos de la empresa ---
    const vehicles = await Vehicle.insertMany([
      {
        placa: 'ABC-1234',
        marca: 'Toyota',
        modelo: 'Corolla',
        anio: 2023,
        color: 'Blanco',
        tipo: 'sedan',
        estado: 'disponible',
        kilometraje: 15200,
        ultimoMantenimiento: new Date('2026-06-01'),
      },
      {
        placa: 'DEF-5678',
        marca: 'Hyundai',
        modelo: 'Tucson',
        anio: 2024,
        color: 'Gris',
        tipo: 'suv',
        estado: 'disponible',
        kilometraje: 8500,
        ultimoMantenimiento: new Date('2026-05-15'),
      },
      {
        placa: 'GHI-9012',
        marca: 'Toyota',
        modelo: 'Hilux',
        anio: 2022,
        color: 'Negro',
        tipo: 'pickup',
        estado: 'disponible',
        kilometraje: 42000,
        ultimoMantenimiento: new Date('2026-04-20'),
      },
      {
        placa: 'JKL-3456',
        marca: 'Kia',
        modelo: 'Carnival',
        anio: 2023,
        color: 'Azul',
        tipo: 'van',
        estado: 'mantenimiento',
        kilometraje: 28700,
        ultimoMantenimiento: new Date('2026-07-01'),
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
