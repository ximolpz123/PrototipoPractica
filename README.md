# 🚗 PrototipoPractica — Sistema de Reserva de Vehículos (Bitnets)

Sistema funcional integral para gestionar y auditar la flota de vehículos corporativos, proporcionando control en tiempo real al administrador y una herramienta fácil de usar para los conductores.

## 🌟 Características Principales

### 📱 App Móvil (Conductores y Administradores)
- **Control de Viajes:** Solicita reservas, inicia y finaliza viajes desde el teléfono.
- **Evidencia Fotográfica:** Captura fotos obligatorias del vehículo al salir y al regresar. Las fotos se suben directamente a Cloudinary.
- **Rastreo GPS:** Transmisión de ubicación en segundo plano cada 3 minutos mientras el viaje está en curso.
- **Kilometraje Automatizado:** Registra el odómetro de salida y retorno, actualizando automáticamente la base de datos central.
- **Panel Administrador Móvil:** Permite aprobar o rechazar reservas directamente desde la app, incluyendo motivos de rechazo detallados.

### 💻 Plataforma Web (Administración Global)
- **Mapa en Tiempo Real:** Visualiza la posición GPS exacta y en vivo de los vehículos que están en ruta.
- **Gestión de Reservas:** Sistema robusto para aprobar o rechazar solicitudes. Incluye validación de superposición de fechas (anti-conflictos).
- **Control de Flota:** Mantenimiento y registro de los vehículos de la empresa.
- **Auditoría Completa:** Historial inmutable de quién usó qué vehículo, cuándo y cuántos kilómetros recorrió.

## 🛠️ Tech Stack

| Capa | Tecnología | Detalles |
|------|-----------|-----------|
| **Backend** | Node.js + Express + TypeScript | API REST con lógica de negocio, validaciones anti-conflictos, cálculo de distancias y rastreo GPS. |
| **App Móvil** | React Native + Expo (TypeScript) | UI fluida, integración de `expo-location` (Background tasks), `expo-camera` y mapas nativos. |
| **Frontend Web** | React 19 + Vite (TypeScript) | Dashboard administrativo con diseño *Glassmorphism*, mapas con `Leaflet.js` y gráficas en vivo. |
| **Base de datos** | MongoDB Atlas + Mongoose | Base de datos NoSQL alojada en la nube con validación estricta de esquemas. |
| **Seguridad** | JWT + bcryptjs | Autenticación y cifrado de contraseñas, validación por roles (Usuario/Admin). |

---

## 👥 Equipo de Desarrollo

Proyecto desarrollado con roles especializados para garantizar la mejor calidad en cada capa tecnológica:
- **Joaquín (Backend y App Móvil)**: Diseño de la arquitectura de la API, persistencia de datos en MongoDB, algoritmos de validación de reservas y desarrollo completo de la aplicación en React Native.
- **Gustavo (Frontend Web)**: Desarrollo de la plataforma administrativa web en React, integración de mapas Leaflet y consumo de los endpoints del backend.

---

## 🚀 Instalación y Ejecución Local

### 1. Clonar e Instalar
```bash
git clone https://github.com/ximolpz123/PrototipoPractica.git
cd PrototipoPractica

# Instalar dependencias concurrentes (para Web y Backend)
npm install

# Instalar dependencias individuales de cada entorno
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
cd mobile && npm install && cd ..
```

### 2. Configurar Variables de Entorno (`.env`)
En la carpeta `backend`, crea tu archivo `.env` tomando como base `.env.example`:
- `MONGODB_URI`: Tu string de conexión de Atlas.
- `JWT_SECRET`: Tu secreto para los tokens.
- `CLOUDINARY_*`: Tus credenciales para subir imágenes.

En la carpeta `mobile/constants/index.ts`, actualiza `API_URL` con tu **Dirección IPv4 local** para probar en un dispositivo físico.

### 3. Levantar el Proyecto

**Para la Web y el Backend simultáneamente:**
```bash
# En la raíz del proyecto
npm run dev
```

**Para la App Móvil:**
```bash
# En otra terminal, dentro de la carpeta mobile
npm start -- --clear
```
*(Escanea el código QR con la app Expo Go en tu teléfono).*

---

## 🔑 Credenciales de Prueba

La base de datos contiene datos "semilla" (seed) para pruebas inmediatas del sistema completo:

| Rol | Correo | Contraseña | Funciones |
|-----|--------|------------|-----------|
| **Administrador** | `admin@empresa.com` | `password123` | Acceso al panel web y vista admin en la app móvil. |
| **Conductor** | `usuario@empresa.com` | `password123` | Solicitud y ejecución de viajes en la app móvil. |

> 💡 **Tip:** Usa el "Reloj Simulado" (Máquina del Tiempo) incluido en la App Móvil (solo en desarrollo) para adelantar las horas y probar el flujo completo (Solicitar → Aprobar → Iniciar → *Adelantar 3 horas* → Finalizar) sin tener que esperar.
