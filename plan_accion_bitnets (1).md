# 📅 Plan de Acción — Sistema Flota Bitnets
**Fecha límite:** 30 de Julio, 2026 | **Equipo:** Carlos (Mobile/Backend) + Gustavo (Web Frontend)

---

## 🎯 Resumen de lo que ya está listo
- ✅ Backend (API REST, Auth JWT, Reservas, Vehículos, Dashboard)
- ✅ App Móvil: Login, Cámara de evidencia (fotos → Cloudinary), GPS en segundo plano
- ✅ Base de datos MongoDB con modelos completos

---

## 📌 Requerimientos clave del documento (ERS Bitnets)

| # | Módulo | Responsable | Estado |
|---|--------|-------------|--------|
| RF-001/005 | Auth JWT + Roles (Operario, Admin, RRHH) | Carlos | ✅ Listo |
| RF-006/012 | CRUD 100 usuarios + control perfiles | Gustavo (web) | ⏳ Pendiente |
| RF-013/020 | Bloqueo por licencia vencida | Carlos (backend) | ✅ Listo |
| RF-021/035 | Portal de Reservas + Calendario | Gustavo (web) | ⏳ Pendiente |
| RF-036/042 | Trazabilidad: fotos entrada/salida, odómetro | Carlos | 🔶 Parcial |
| RF-043/050 | Reportería, KPIs, alertas licencias | Gustavo (web) | ⏳ Pendiente |

---

## 🗓️ Plan Día a Día (Lunes 21 — Miércoles 30 Julio)

### 🔵 CARLOS (Backend + App Móvil)
### 🟢 GUSTAVO (Web Frontend — Vite/React)

---

### **Lunes 21 (HOY)**
> **Foco: Cáscara Móvil — Navegación Base y Pestañas**

- 🔵 **Carlos:** Actualizar la app móvil para tener una navegación por pestañas (`BottomTabNavigator`). Crear las pantallas base (cáscaras) vacías:
  - `Inicio / Dashboard`
  - `Mis Reservas`
  - `Flota (Catálogo de Vehículos)`
  - `Perfil`
- 🟢 **Gustavo:** Armar la cáscara del portal Web. Layout base con Sidebar y Header. Vistas vacías de Login, Dashboard, Gestión RRHH y Calendario de Reservas.

---

### **Martes 22**
> **Foco: Diseño UI Móvil — Flota y Reservas (Prototipo)**

- 🔵 **Carlos:** Diseñar la lista de la flota en la app móvil (Tarjetas de los vehículos, fotos de muestra, estado simulado).
- 🔵 **Carlos:** Pantalla de "Mis Reservas" con diseño de tarjetas (reservas activas, pasadas y opción de "Nueva Reserva").
- 🟢 **Gustavo:** Prototipar la vista del Calendario en la Web (sin conexión real, solo datos *mockeados* para mostrar cómo se vería).

---

### **Miércoles 23**
> **Foco: Flujo de Nueva Reserva Móvil (Mockup)**

- 🔵 **Carlos:** Flujo de crear reserva en la app: seleccionar vehículo → calendario/fecha → confirmación (todo simulado/mock).
- 🔵 **Carlos:** Refinar el flujo ya existente del viaje (Cámara y GPS) para que encaje bien en la nueva navegación.
- 🟢 **Gustavo:** Prototipar la vista de Gestión de Usuarios (RRHH) en la web con datos falsos (para mostrar la tabla de conductores y estado de licencias).

---

### **Jueves 24**
> **Foco: Dashboards y Reportes Visuales (Cáscara)**

- 🔵 **Carlos:** Mejorar la vista de Perfil y estado de la licencia en la app.
- 🟢 **Gustavo:** Prototipar la vista de Reportes y KPIs en la web (gráficos estáticos, alertas simuladas de licencias por vencer).
- 🟢 **Gustavo:** Mockup del Mapa GPS en la web para mostrar los vehículos en tránsito.

---

### **Viernes 25**
> **Foco: Conexión Inicial (App ↔ Backend)**

- 🔵 **Carlos:** Empezar a reemplazar los datos simulados de la app móvil con llamadas reales al backend (ya tenemos los endpoints de vehículos y reservas).
- 🟢 **Gustavo:** Conectar el Login web y empezar a traer la lista real de vehículos desde la API.

---

### **Lunes 28 a Miércoles 30**
> **Foco: Pulido Final del Prototipo y Presentación**

- 🔵🟢 **Ambos:** Unir las piezas. Hacer que las reservas de la app se vean en el calendario web.
- 🔵🟢 **Ambos:** Asegurar que la paleta de colores corporativa (`#3D9FD3`, `#5C99CC`, etc.) esté consistente en todo el sistema.
- 🔵🟢 **Ambos:** Pruebas del "Camino Feliz" (Happy Path) para la presentación del prototipo:
  1. Conductor se loguea en la app.
  2. Solicita reserva (o inicia viaje de reserva simulada).
  3. Sube fotos de evidencia.
  4. Admin ve la actividad en la web.
- 🏁 **Miércoles 30:** Entrega del Prototipo Funcional.

---

## ⚠️ Prioridades para el Prototipo (Entrega 31 Jul)

1. **Navegación Intuitiva (Cáscara):** Que el usuario pueda pasear por toda la app móvil y web sin que se caiga, aunque los datos sean falsos.
2. **Identidad Visual:** Logos, colores y estilos corporativos aplicados.
3. **Flujo de Viaje (Cámara/GPS):** Es la característica "estrella" que más llama la atención, debe funcionar bien.
4. **Calendario Web:** Que se vea claro cómo se administrará el conflicto de horas.

---

## 🔑 Notas técnicas importantes

- **Mockear primero:** No bloquearnos por falta de endpoints o lógicas de backend complejas. Usar datos estáticos (`const DUMMY_DATA = [...]`) para avanzar en la UI.
- Recordar integrar el **logo de la empresa** en la pantalla de login (móvil y web).
- Mantener la paleta resumida: Azul Principal `#3D9FD3`, Oscuro `#478EC6`, Blancos/Grises.
