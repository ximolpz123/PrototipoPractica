# 🚗 PrototipoPractica — Sistema de Reserva de Vehículos

Sistema prototipo para gestionar la reserva de **4 vehículos** de empresa por parte de **100 usuarios autorizados**.

## Tech Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19 + TypeScript + Vite |
| Backend | Node.js + Express + TypeScript |
| Base de datos | MongoDB Atlas + Mongoose |
| Autenticación | JWT (JSON Web Tokens) |

## 📋 Requisitos Previos

- [Node.js](https://nodejs.org/) v20 LTS o superior
- [Git](https://git-scm.com/)
- Cuenta en [MongoDB Atlas](https://www.mongodb.com/atlas) (tier gratuito M0)
- [MongoDB Compass](https://www.mongodb.com/products/compass) (opcional, para inspeccionar la BD)

## 🚀 Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/TU_USUARIO/PrototipoPractica.git
cd PrototipoPractica
```

### 2. Instalar dependencias

```bash
# Instalar todo (raíz + frontend + backend)
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

### 3. Configurar variables de entorno

```bash
# Copiar el archivo de ejemplo
cp backend/.env.example backend/.env
```

Editar `backend/.env` con tu connection string de MongoDB Atlas:

```
MONGODB_URI=mongodb+srv://<usuario>:<password>@<cluster>.mongodb.net/reserva-vehiculos
JWT_SECRET=tu_secreto_super_seguro
PORT=5000
```

### 4. Cargar datos de prueba (seed)

```bash
cd backend
npx tsx src/seed.ts
```

### 5. Ejecutar en desarrollo

```bash
# Desde la raíz del proyecto (corre front y back simultáneamente)
npm run dev
```

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000
- **Health check**: http://localhost:5000/api/health

## 📁 Estructura del Proyecto

```
PrototipoPractica/
├── frontend/          # React + TypeScript (Vite)
├── backend/           # Node.js + Express + TypeScript
├── package.json       # Scripts raíz (concurrently)
└── README.md
```

## 👥 Equipo

- **Desarrollador 1**: Cascarón del proyecto, modelos y backend
- **Desarrollador 2**: (por definir)

## 📄 Licencia

Proyecto académico / prototipo interno.
