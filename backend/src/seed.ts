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

    // Crear usuarios de prueba (v2)
    const users = await User.insertMany([
      {
        nombre: 'Admin',
        apellido: 'Sistema',
        email: 'admin@empresa.com',
        password: hashedPassword,
        departamento: 'Jefatura',
        telefono: '+56911112222',
        rol: 'admin',
        activo: true,
        licenciaAlDia: true,
        fechaVencimientoLicencia: new Date('2027-12-31'),
        licenciaEstado: 'vigente',
      },
      {
        nombre: 'Juan',
        apellido: 'Pérez',
        email: 'usuario@empresa.com',
        password: hashedPassword,
        departamento: 'Operaciones',
        telefono: '+56933334444',
        rol: 'usuario',
        activo: true,
        licenciaAlDia: true,
        fechaVencimientoLicencia: new Date('2027-06-30'),
        licenciaEstado: 'vigente',
      },
      {
        nombre: 'Luis',
        apellido: 'Pérez',
        email: 'usuario2@empresa.com',
        password: hashedPassword,
        departamento: 'Operaciones',
        telefono: '+56955556666',
        rol: 'usuario',
        activo: true,
        licenciaAlDia: true,
        fechaVencimientoLicencia: new Date('2027-06-30'),
        licenciaEstado: 'vigente',
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
        nivelBencina: 100,
        tipoIndicador: 'digital',
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
        nivelBencina: 80,
        tipoIndicador: 'digital',
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
        nivelBencina: 50,
        tipoIndicador: 'analogico',
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
        nivelBencina: 90,
        tipoIndicador: 'analogico',
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
        nivelBencina: 100,
        tipoIndicador: 'digital',
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
    console.log('   Admin:     admin@empresa.com   / password123');
    console.log('   Conductor: usuario@empresa.com / password123');
    console.log('   Cond. 2:   usuario2@empresa.com / password123');
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
