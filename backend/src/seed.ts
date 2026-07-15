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
      {
        nombre: 'María',
        apellido: 'García',
        email: 'maria.garcia@empresa.com',
        password: hashedPassword,
        departamento: 'Ventas',
        rol: 'usuario',
        activo: true,
      },
      {
        nombre: 'Juan',
        apellido: 'López',
        email: 'juan.lopez@empresa.com',
        password: hashedPassword,
        departamento: 'Operaciones',
        rol: 'usuario',
        activo: true,
      },
      {
        nombre: 'Ana',
        apellido: 'Rodríguez',
        email: 'ana.rodriguez@empresa.com',
        password: hashedPassword,
        departamento: 'Gerencia',
        rol: 'usuario',
        activo: true,
      },
      {
        nombre: 'Pedro',
        apellido: 'Fernández',
        email: 'pedro.fernandez@empresa.com',
        password: hashedPassword,
        departamento: 'Finanzas',
        rol: 'usuario',
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
    const reservations = await Reservation.insertMany([
      {
        usuario: users[1]._id, // María
        vehiculo: vehicles[0]._id, // Toyota Corolla
        fechaInicio: new Date('2026-07-20T08:00:00'),
        fechaFin: new Date('2026-07-20T18:00:00'),
        destino: 'Oficina Central - Sucursal Norte',
        motivo: 'Visita a cliente para presentación de propuesta',
        estado: 'aprobada',
      },
      {
        usuario: users[2]._id, // Juan
        vehiculo: vehicles[1]._id, // Hyundai Tucson
        fechaInicio: new Date('2026-07-22T07:00:00'),
        fechaFin: new Date('2026-07-23T19:00:00'),
        destino: 'Planta de producción - Zona Industrial',
        motivo: 'Supervisión de inventario y logística',
        estado: 'pendiente',
      },
      {
        usuario: users[3]._id, // Ana
        vehiculo: vehicles[2]._id, // Toyota Hilux
        fechaInicio: new Date('2026-07-25T06:00:00'),
        fechaFin: new Date('2026-07-25T20:00:00'),
        destino: 'Evento corporativo - Hotel Marriott',
        motivo: 'Reunión trimestral con directivos regionales',
        estado: 'pendiente',
      },
    ]);

    console.log(`📅 ${reservations.length} reservas creadas`);

    // --- Resumen ---
    console.log('\n========================================');
    console.log('   🎉 SEED COMPLETADO EXITOSAMENTE');
    console.log('========================================');
    console.log('\n📋 Credenciales de prueba:');
    console.log('   Admin:   admin@empresa.com / password123');
    console.log('   Usuario: maria.garcia@empresa.com / password123');
    console.log('   Usuario: juan.lopez@empresa.com / password123');
    console.log('   Usuario: ana.rodriguez@empresa.com / password123');
    console.log('   Usuario: pedro.fernandez@empresa.com / password123');
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
