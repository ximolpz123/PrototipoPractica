# 📱 Plan de Expansión: App Móvil

## La Buena Noticia: El Backend ya está listo

El API REST que construiste (Node.js + Express) **no necesita cambios** para funcionar con una app móvil. Una app en el celular llama a los mismos endpoints exactamente igual que el navegador web. Esa es la magia de REST.

```
                     ┌─────────────────────┐
                     │  BACKEND (Joaquín)  │
                     │  Node.js + Express  │
                     │  MongoDB Atlas      │
                     └──────────┬──────────┘
                                │
                 ┌──────────────┼──────────────┐
                 │              │              │
        ┌────────▼───┐   ┌──────▼──────┐  ┌───▼──────────┐
        │ Web React  │   │  App Móvil  │  │  Postman /   │
        │ (Gustavo)  │   │  (Joaquín)  │  │  Futuro...   │
        └────────────┘   └─────────────┘  └──────────────┘
```

---

## 📱 ¿Qué tecnología usar para la App Móvil?

### Recomendación: React Native + Expo ✅

| Tecnología | Pros | Contras |
|-----------|------|---------|
| **React Native + Expo** ⭐ | Ya sabes React y TypeScript. Sirve para Android e iOS a la vez. Expo facilita mucho el inicio. | Puede tener limitaciones en funciones nativas muy avanzadas |
| Flutter | Muy potente, buen rendimiento | Hay que aprender Dart (otro lenguaje) |
| Android nativo (Java/Kotlin) | Máximo control | Solo funciona en Android, mucho más complejo |

**¿Por qué React Native + Expo es la opción ideal para ti?**
- Ya conoces TypeScript, JSX y el concepto de componentes de React.
- Puedes **reutilizar** las interfaces TypeScript (`IVehicle`, `IReservation`, `IUser`) que ya creamos.
- Puedes **reutilizar** la lógica de los servicios de la API (axios, auth service).
- Con Expo puedes probar la app en tu celular físico escaneando un QR. Sin cables.
- Funciona en **Android e iOS** con el mismo código.

---

## 🗂 Nueva Estructura del Repositorio

Se agrega una carpeta `mobile/` al mismo repositorio que ya tienen:

```
PrototipoPractica/
├── backend/          # API REST — Joaquín  ✅ Listo
├── frontend/         # Web React — Gustavo 🔄 En progreso
├── mobile/           # App Móvil — Joaquín 🆕 Por iniciar
│   ├── app/          # Pantallas (Expo Router)
│   │   ├── (auth)/
│   │   │   ├── login.tsx
│   │   │   └── register.tsx
│   │   ├── (tabs)/
│   │   │   ├── index.tsx       # Dashboard
│   │   │   ├── vehicles.tsx    # Lista de autos
│   │   │   └── reservations.tsx# Mis reservas
│   │   └── _layout.tsx
│   ├── components/   # Componentes reutilizables
│   ├── services/     # Axios — misma lógica que el frontend web
│   ├── types/        # Interfaces TypeScript — copiar del frontend
│   ├── constants/    # Colors, API_URL, etc.
│   ├── package.json
│   └── app.json      # Configuración de Expo
├── package.json      # Scripts raíz
└── README.md
```

---

## 📋 División de Trabajo Actualizada

| Desarrollador | Responsabilidad | Carpeta |
|---|---|---|
| **Joaquín** | Backend API + App Móvil (React Native) | `backend/` + `mobile/` |
| **Gustavo** | Frontend Web (React + Vite) | `frontend/` |

> [!NOTE]
> Aunque Joaquín tiene dos responsabilidades, el Backend ya está prácticamente completo. La mayor parte del tiempo irá ahora a la app móvil.

---

## 🚀 Pasos para Arrancar la App Móvil

### Prerequisito: Instalar Expo CLI
```bash
npm install -g expo-cli
```

### Paso 1: Crear el proyecto Expo dentro del repo
```bash
# Desde la raíz de PrototipoPractica
npx create-expo-app mobile --template blank-typescript
cd mobile
```

### Paso 2: Instalar dependencias clave
```bash
npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar
npm install axios @react-native-async-storage/async-storage
```

> ⚠️ **Importante:** En móvil, `localStorage` (que usa el frontend web) NO existe. Se reemplaza por `AsyncStorage` de React Native para guardar el token JWT.

### Paso 3: Configurar la URL de la API
El celular no conoce `localhost`. Cuando pruebes en tu celular físico con Expo Go, necesitas usar **la IP de tu computador en la red local**:

```typescript
// mobile/constants/api.ts
// Reemplaza con tu IP local (ver con: ipconfig → IPv4)
export const API_URL = 'http://192.168.X.X:5000/api';
```

### Paso 4: Probar en tu celular
```bash
cd mobile
npx expo start
```
Escanea el QR con la app **Expo Go** (disponible en Play Store / App Store).

---

## 📱 Pantallas que debe tener la App Móvil

Las mismas funciones que la web, adaptadas a móvil:

1. **Login / Registro** — Formulario con teclado adaptado
2. **Dashboard** — Tarjetas con estadísticas del sistema
3. **Lista de Vehículos** — Cards con foto, estado (disponible/reservado)
4. **Crear Reserva** — Formulario con DatePicker nativo del celular
5. **Mis Reservas** — Lista con opción de cancelar o completar
6. **Perfil** — Info del usuario + botón de cerrar sesión

---

## ✅ Checklist para Joaquín antes de empezar la app móvil

- [ ] Hacer el Pull Request + Merge de las 3 ramas pendientes (`backend-dashboard-stats`, `backend-kilometraje`, `backend-validaciones-avanzadas`) al `main`.
- [ ] Confirmar que Gustavo ya clonó el repo y puede correr el frontend.
- [ ] Instalar **Expo Go** en tu celular desde la tienda de apps.
- [ ] Crear la carpeta `mobile/` con `npx create-expo-app`.
- [ ] Arrancar con la pantalla de Login (la más crítica).

---

## ⚠️ Diferencias clave entre Web y Móvil

| Concepto | Web (React) | Móvil (React Native) |
|----------|------------|---------------------|
| Elementos UI | `<div>`, `<p>`, `<button>` | `<View>`, `<Text>`, `<TouchableOpacity>` |
| Estilos | CSS / className | `StyleSheet.create({})` de React Native |
| Navegación | React Router | Expo Router (similar) |
| Guardar token | `localStorage` | `AsyncStorage` |
| Probar | Navegador | App **Expo Go** en tu celular |
| Fecha/hora | HTML `<input type="date">` | `@react-native-community/datetimepicker` |
