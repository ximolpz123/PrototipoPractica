# 🚗 PrototipoPractica — Sistema de Reserva de Vehículos (Bitnets)

Sistema prototipo para gestionar la reserva de la flota de vehículos de la empresa, integrando una plataforma web de administración y una aplicación móvil para los conductores.

## 🛠️ Tech Stack

| Capa | Tecnología | Detalles |
|------|-----------|-----------|
| **Backend** | Node.js + Express + TypeScript | Rutas protegidas, controladores para Vehículos, Reservas y Usuarios. Lógica anti-conflictos, estadísticas y auditoría. |
| **App Móvil** | React Native + Expo (TypeScript) | Aplicación para usuarios/conductores. Flujos de reserva, subida de evidencia a Cloudinary, tracking GPS y validación de licencias. |
| **Frontend Web** | React 19 + TypeScript + Vite | Plataforma administrativa para gestionar la flota, ver reportes y auditar reservas. |
| **Base de datos** | MongoDB Atlas + Mongoose | Modelos estrictos, colección de auditoría y conexión en la nube. |
| **Autenticación** | JWT (JSON Web Tokens) | Contraseñas encriptadas con `bcryptjs`, protección por roles (Admin/User). |
| **Almacenamiento** | Cloudinary | Guardado en la nube de fotografías de evidencia (estado del auto antes y después del viaje). |

## 👥 Equipo de Desarrollo

Este proyecto sigue una división de responsabilidades estricta:
- **Joaquín (Backend y Móvil)**: Lógica de negocio, API REST, Base de Datos, Autenticación, validaciones de choque de fechas, app móvil completa e integración de cámara/GPS.
- **Gustavo (Frontend Web)**: Interfaz de usuario administrativa, consumo de API, gestión de estados y navegación en la web.

---

## 🚀 Instalación y Configuración Local

### 1. Clonar el repositorio

```bash
git clone https://github.com/ximolpz123/PrototipoPractica.git
cd PrototipoPractica
```

### 2. Instalar todas las dependencias

```bash
# Instalar dependencias raíz (para levantar backend y frontend web a la vez)
npm install

# Instalar dependencias individuales
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
cd mobile && npm install && cd ..
```

### 3. Configurar variables de entorno

**Backend:** Copia `.env.example` a `.env` en la carpeta `backend` y configura la cadena de MongoDB Atlas, el puerto (5000), tu JWT Secret y las llaves de tu cuenta de Cloudinary.

**App Móvil:** Modifica el archivo `mobile/constants/index.ts` y asegúrate de que la variable `API_URL` apunte a la **IP IPv4 de tu computadora actual** para poder probarla en el celular físico.

### 4. Cargar datos de prueba (Seed)

Para poblar la base de datos con los autos y el administrador:

```bash
cd backend
npm run seed
```
*(Se limpiarán las colecciones y se creará 1 usuario Administrador y los 4 vehículos de la flota).*

### 5. Ejecutar el proyecto

Para la **Web y el Backend** (se levantan juntos en la raíz):
```bash
npm run dev
```

Para la **App Móvil** (abre una terminal nueva):
```bash
cd mobile
npm start -- --clear
```

---

## 🔑 Credenciales de Prueba (DB Actualizada)

Se ha limpiado la base de datos para pruebas. Usa esta cuenta maestra:

| Rol | Correo | Contraseña |
|-----|--------|------------|
| **Administrador** | `admin@empresa.com` | `password123` |

Los usuarios normales podrán ser registrados o integrados posteriormente.

---

## 📁 Estructura del Proyecto

```
PrototipoPractica/
├── mobile/            # App Móvil (Expo/React Native)
├── backend/           # Lógica y API Node.js
├── frontend/          # Plataforma Administrativa Web
├── Tareas_actividades del Proyecto.xlsx # Plan de acción
└── README.md          # Este archivo
```
