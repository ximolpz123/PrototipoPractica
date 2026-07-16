# 🚗 PrototipoPractica — Sistema de Reserva de Vehículos

Sistema prototipo para gestionar la reserva de **4 vehículos** de empresa por parte de **100 usuarios autorizados**.

## 🛠️ Tech Stack

| Capa | Tecnología | Detalles |
|------|-----------|-----------|
| **Frontend** | React 19 + TypeScript + Vite | React Router DOM para navegación, Axios para peticiones HTTP con interceptores JWT. |
| **Backend** | Node.js + Express + TypeScript | Rutas protegidas, controladores CRUD para Vehículos, Reservas y Usuarios. |
| **Base de datos** | MongoDB Atlas + Mongoose | Modelos estrictos, validación de fechas (evita reservas dobles), conexión directa (Non-SRV). |
| **Autenticación** | JWT (JSON Web Tokens) | Contraseñas encriptadas con `bcryptjs`, middleware de protección por roles (Admin/User). |

## 👥 Equipo de Desarrollo (Práctica Profesional)

Este proyecto sigue una división de responsabilidades estricta:
- **Joaquín (Backend)**: Lógica de negocio, API REST, Base de Datos, Autenticación y validaciones.
- **Gustavo (Frontend)**: Interfaz de usuario, consumo de API, gestión de estados y navegación.

> 📝 **Nota:** Revisar el archivo `plan_de_trabajo.md` (o el PDF adjunto) para ver las reglas exactas de los commits y el uso de ramas de Git.

---

## 🚀 Instalación y Configuración Local

### 1. Clonar el repositorio

```bash
git clone https://github.com/ximolpz123/PrototipoPractica.git
cd PrototipoPractica
```

### 2. Instalar todas las dependencias

```bash
# Instalar dependencias raíz (para ejecutar ambos proyectos a la vez)
npm install

# Instalar dependencias del Backend y Frontend
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

### 3. Configurar variables de entorno

Copia el archivo `.env.example` en la carpeta `backend` y renómbralo a `.env`:
```bash
cp backend/.env.example backend/.env
```

Edita `backend/.env` con la URL directa de MongoDB (formato 2.2.12 sin SRV para evitar bloqueos de red) y asegúrate de poner la contraseña real:

```env
MONGODB_URI="mongodb://usuario:PASSWORD@ac-98xn2br-shard-00-00.zwhrp0v.mongodb.net:27017,ac-98xn2br-shard-00-01.zwhrp0v.mongodb.net:27017,ac-98xn2br-shard-00-02.zwhrp0v.mongodb.net:27017/reserva-vehiculos?ssl=true&replicaSet=atlas-spro0z-shard-0&authSource=admin&appName=Cluster0"
JWT_SECRET=prototipo_practica_jwt_secret_2026
PORT=5000
```

### 4. Cargar datos de prueba (Seed)

Solo debes correr esto una vez para poblar tu base de datos con los autos y usuarios de prueba.

```bash
cd backend
npx tsx src/seed.ts
```
*(Si es exitoso, verás en consola que se crearon 5 usuarios, 4 vehículos y 3 reservas).*

### 5. Ejecutar el proyecto (Frontend + Backend juntos)

```bash
# Vuelve a la raíz del proyecto y ejecuta:
npm run dev
```

Esto levantará automáticamente:
- **Frontend Vite**: `http://localhost:5173`
- **Backend API**: `http://localhost:5000`

---

## 🔑 Usuarios de Prueba Creados por el Seed

Puedes usar estos usuarios para iniciar sesión cuando el Frontend esté listo:

| Rol | Correo | Contraseña |
|-----|--------|------------|
| **Administrador** | `admin@empresa.com` | `password123` |
| **Usuario** | `maria.garcia@empresa.com` | `password123` |
| **Usuario** | `juan.lopez@empresa.com` | `password123` |

---

## 📁 Estructura del Proyecto

```
PrototipoPractica/
├── frontend/          # Interfaz visual (Gustavo)
├── backend/           # Lógica y API (Joaquín)
├── plan_de_trabajo.md # Reglas de equipo y Git
├── package.json       # Scripts raíz (concurrently)
└── README.md          # Este archivo
```
