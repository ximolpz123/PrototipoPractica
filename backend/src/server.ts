import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import authRoutes from './routes/auth.routes.js';
import vehicleRoutes from './routes/vehicle.routes.js';
import reservationRoutes from './routes/reservation.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import trackingRoutes from './routes/tracking.routes.js';
import userRoutes from './routes/user.routes.js';
import devRoutes from './routes/dev.routes.js';
import configRoutes from './routes/config.routes.js';
import { initCronJobs } from './jobs/cron.js';

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/dev', devRoutes);
app.use('/api/config', configRoutes);

// Iniciar servidor
const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    initCronJobs(); // Iniciar tareas programadas
    console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
  });
};

startServer();
