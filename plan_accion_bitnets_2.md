# 📅 Plan de Acción — Sistema Flota Bitnets v2
**Fecha límite:** Viernes 7 de Agosto, 2026 | **Equipo:** Joaquín López (Mobile/Backend) + Gustavo (Web Frontend)
**Revisión:** Segunda entrega — Post aprobación del cliente.

---

## 🧠 Análisis de Requerimientos y Propuestas de IA

Antes del plan, aquí va el análisis técnico de cada requerimiento con la propuesta concreta de implementación:

---

### 1. 👤 Perfil de Usuario Extendido (Departamento, Teléfono, Licencia con IA)

**Cambios en el modelo `User`:**
- Agregar campos: `departamento`, `telefono`, `licenciaFotoUrl`, `licenciaVencimiento`, `licenciaEstado`.

**IA para validación de licencia:**
- Usar **Google Cloud Vision API** o **OpenAI GPT-4 Vision**: el usuario saca foto a su licencia, el backend la envía a la IA que extrae la fecha de vencimiento automáticamente y calcula si está vigente o vencida.
- Si la IA detecta vencimiento → `licenciaEstado: 'vencida'` → bloquea la creación de reservas (ya tienes el middleware de bloqueo).
- Si no puede leer → solicitar foto más clara.

---

### 2. 📊 KPIs de Gastos por Departamento

**Backend:**
- Nuevo endpoint: `GET /api/dashboard/department-costs`.
- Lógica: Agrupar reservas completadas por `usuario.departamento`, calcular total de km recorridos, y multiplicar por un factor configurable de `$costo_por_km` (costo promedio de bencina).
- También calcular **uso de horas del vehículo** por departamento.

**Web Frontend (Gustavo):**
- Panel nuevo con gráfico de barras por departamento.
- Tabla comparativa con filtros por mes y rango de fechas.

---

### 3. 📸 Sistema de 6 Fotos Obligatorias + IA para Kilometraje

**Flujo de fotos requeridas (en orden):**
1. 📷 Frontal del vehículo
2. 📷 Lateral derecho
3. 📷 Lateral izquierdo
4. 📷 Trasero
5. 📷 **Tablero** → con IA OCR para leer el odómetro
6. 📷 Interior del vehículo

**IA para leer el odómetro del tablero:**
- Usar **Google Vision API (OCR)** o **OpenAI Vision**: el usuario saca foto al tablero, la IA extrae los números del odómetro y actualiza `kmRetorno` automáticamente en la DB, sin que el usuario tenga que tipear nada.
- Mostrar preview del valor detectado con opción de corrección manual.

**Lógica del nivel de bencina:**
- Al tomar la foto del tablero, se le pregunta al usuario si el indicador de bencina es:
  - **Digital (barras):** Mostrar un slider de 0% a 100% para que seleccione el nivel.
  - **Analógico (varilla):** Mostrar selector de tipo "E/1/4/2/4/3/4/F" para que marque en qué posición está.
- Este valor se guarda en `vehicle.nivelBencina` y es visible para el admin.

---

### 4. ⛽ Nivel de Bencina en el Vehículo

- Campo `nivelBencina` (número de 0-100) en el modelo `Vehicle`.
- El admin puede verlo y actualizarlo manualmente también.
- En la tarjeta del vehículo (Web y Móvil), mostrar una barra de progreso visual del nivel.
- Tipo de indicador (`digital`/`analogico`) configurable por vehículo en sus detalles.

---

### 5. 🔄 Cambio de Conductor en el Mismo Viaje (Subviajes)

**Propuesta: Sistema de Sub-Viaje (Tramo)**
- Una reserva puede tener múltiples `tramos`: `[{conductor, gps, fechaInicio, fechaFin}]`.
- Al llegar al destino, el conductor activo puede "Pasar el mando" a otro usuario desde la app.
- El sistema notifica al admin (push notification) que hubo cambio de conductor.
- El nuevo conductor recibe una notificación para aceptar el control del GPS.
- Si el nuevo conductor acepta, el GPS se transfiere a su dispositivo automáticamente.
- Tanto el tramo de ida como el de vuelta quedan registrados con KPIs separados en el historial.

---

### 6. ⏰ Validación de Fotos Fuera de Hora + Notificaciones

**Flujo de la lógica:**
1. Llega la `fechaFin` de la reserva → push notification al conductor: *"Recuerda tomar las fotos de retorno"*.
2. Si pasan **15 minutos** sin fotos → notificación al admin con nombre, teléfono del conductor y nombre del vehículo para que se contacte.
3. El admin puede escribir un mensaje de motivo de demora → el sistema notifica a la reserva siguiente que su hora se atrasa 15 minutos automáticamente.
4. La validación de "mínimo 6 fotos" ya bloquea el formulario de finalización → si no están todas, no puede finalizar.

**Backend:** Job programado (`node-cron`) que corre cada minuto revisando reservas con `estado: 'en_curso'` cuya `fechaFin` ya pasó.

---

### 7. 🗺️ GPS cada 1 Minuto + Activación Obligatoria

- Cambiar el intervalo de `setInterval` de 3 min a **1 minuto** en el Background Task de Expo.
- Antes de habilitar el botón "Iniciar Viaje":
  1. Verificar que el GPS esté activo.
  2. Si no → mostrar alerta bloqueante: *"Debes activar el GPS para iniciar el viaje"* con botón directo a la configuración del sistema.
- La app no procederá hasta que el GPS esté disponible.

---

### 8. 🚗 Flota: Usuario en Curso y Cambio de Diseño

- En `FlotaScreen`: Si el vehículo está `en_curso`, mostrar debajo del nombre:
  - **Nombre del conductor** y su **Departamento**.
- En los detalles del vehículo (tanto usuario como admin): mostrar historial diario de conductores ("¿Quién usó este vehículo hoy?").
- En el admin: historial de uso del vehículo paginado por día.

---

### 9. 📋 Admin: Crear y Asignar Reservas a Usuarios

- Nueva pantalla `AdminCreateReservationScreen`.
- El admin puede:
  1. Seleccionar un usuario de la lista.
  2. Elegir un vehículo disponible.
  3. Definir fecha de inicio, fin y destino.
  4. La reserva se crea directamente en estado `aprobada` (ya que el mismo admin la aprueba).
- La notificación push llega al conductor asignado: *"El admin te ha asignado una reserva"*.

---

### 10. 🎨 Mejoras de Diseño + Nuevo Logo

- Logo actualizado ya recibido → integrar en Login, SplashScreen y Header.
- Paleta refinada con más detalles femeninos suaves manteniendo los azules corporativos: toques en gradientes, sombras más suaves, bordes redondeados más pronunciados, iconos con fondo de color en lugar de bordes duros.
- Pequeñas animaciones de entrada en las pantallas principales.

---

### 11. 🏴 Sistema de Banderas (Performance del Conductor)

**Modelo `UserFlag`:** Almacena el historial de banderas de cada usuario.

| Bandera | Color | Criterio de activación |
|---------|-------|------------------------|
| 🟢 Verde | Buena conducta | 2 entregas puntuales seguidas, 2 llenados de estanque seguidos, 6 fotos completas en 2 reservas seguidas. |
| 🟡 Amarilla | Falta leve | Le faltó 1-2 fotos, llegó tarde pero avisó, nivel de bencina bajo al devolver. |
| 🟠 Naranja | Falta grave | Vehículo sucio, solo 1-2 fotos, tardó excesivamente sin avisar. 3 naranjas = 1 roja automática. |
| 🔴 Roja | Falta muy grave | Llegó muy atrasado, entregó chocado, sin gasolina, ruedas pinchadas. 3 rojas = alerta admin de "conducta reiterada". |

**En el perfil de cada usuario:** Badge visual con la bandera actual. Historial completo de banderas con fecha y motivo.
**El admin puede asignar banderas manualmente** con descripción del motivo.
**Lógica automática:** El sistema asigna banderas al cerrar una reserva según las reglas anteriores.

---

### 12. 🎲 Sistema de Inspecciones Aleatorias (Randomizador)

- Cada **2 o 3 reservas** (configurable), el sistema activa una "Tarea Aleatoria" para un usuario al azar.
- Tareas posibles: Revisar neumáticos, tomar foto interior, verificar nivel de bencina, revisar estado de la carrocería.
- Al activarse: **notificación push** al conductor con la tarea específica.
- El conductor tiene **20 minutos** para responder (foto o mensaje de texto).
- Si no responde → recordatorio cada 1 minuto (máximo 20 recordatorios).
- Al cumplirse los 20 min → **bandera amarilla o naranja** automática según la tarea.
- El admin puede ver qué inspecciones están pendientes y cuáles fueron respondidas.

---

## 🗓️ Plan Día a Día

> **Principio:** Las tareas de Backend primero para que Gustavo (Web) pueda consumir los endpoints a medida que se construyen.

---

### **Lunes 4 de Agosto**
> **Foco: Fundamentos — Modelo de datos + GPS 1 min + Logo + Perfil extendido**

#### Joaquín (Backend + Móvil)
- 🔵 **Backend:** Ampliar modelo `User` → agregar `departamento`, `telefono`, `licenciaFotoUrl`, `licenciaVencimiento`, `licenciaEstado`.
- 🔵 **Backend:** Ampliar modelo `Vehicle` → agregar `nivelBencina` (0-100), `tipoIndicador` (`digital/analogico`).
- 🔵 **Backend:** Endpoint `PATCH /api/users/:id/licencia` → acepta foto, la sube a Cloudinary y llama a la API de IA para extracción de fecha.
- 🔵 **Backend:** Integrar **OpenAI Vision** (o Google Vision) para leer fecha de vencimiento de la licencia.
- 🔵 **Móvil:** Actualizar `PerfilScreen` → campos de departamento, teléfono, sección de licencia con foto y estado.
- 🔵 **Móvil:** GPS: cambiar de 3 minutos a **1 minuto**.
- 🔵 **Móvil:** Validación obligatoria de GPS antes de poder iniciar viaje.
- 🎨 **Logo:** Integrar el nuevo logo en Login, SplashScreen y Header de la app.

#### Gustavo (Web)
- 🟢 **Web:** Actualizar formulario de creación/edición de usuario para incluir `departamento` y `telefono`.
- 🟢 **Web:** En el panel de usuarios, mostrar el departamento de cada uno.
- 🟢 **Web:** Mostrar el nivel de bencina con una barra visual en los detalles del vehículo.

---

### **Martes 5 de Agosto**
> **Foco: Sistema de 6 Fotos + IA para Odómetro + Bencina**

#### Joaquín (Backend + Móvil)
- 🔵 **Backend:** Actualizar modelo `Reservation` → `fotosSalida` y `fotosRetorno` ahora tienen mínimo 6 posiciones con tipo (`frontal`, `lateralDer`, `lateralIzq`, `trasero`, `tablero`, `interior`).
- 🔵 **Backend:** Endpoint para recibir foto del tablero → llamar a IA OCR → devolver el número detectado → actualizar `kmRetorno` automáticamente.
- 🔵 **Móvil:** Actualizar `CameraScreen` → flujo guiado de 6 fotos con indicador de paso: *"Paso 1 de 6: Tome foto frontal"*.
- 🔵 **Móvil:** Integrar resultado de la IA al tomar la foto del tablero: mostrar el km detectado con opción de confirmar o corregir.
- 🔵 **Móvil:** Selector de nivel de bencina post-foto del tablero (slider digital / selector analógico E-1/4-2/4-3/4-F).
- 🔵 **Móvil:** Validar que las 6 fotos estén completas antes de permitir finalizar el viaje.

#### Gustavo (Web)
- 🟢 **Web:** En el historial de reservas, mostrar las 6 fotos organizadas por categoría con sus labels.
- 🟢 **Web:** Mostrar el km detectado por IA como dato resaltado en el detalle de la reserva.

---

### **Miércoles 6 de Agosto**
> **Foco: KPIs por Departamento + Sistema de Banderas + Admin crea reservas**

#### Joaquín (Backend + Móvil)
- 🔵 **Backend:** Endpoint `GET /api/dashboard/department-costs` → gastos agrupados por departamento.
- 🔵 **Backend:** Lógica de asignación automática de banderas al cerrar una reserva.
- 🔵 **Backend:** Modelo `Flag` → `{usuario, tipo, motivo, fecha, asignadoPor}`.
- 🔵 **Backend:** Endpoint `POST /api/users/:id/flags` → admin asigna bandera manual.
- 🔵 **Backend:** Endpoint `GET /api/users/:id/flags` → historial de banderas de un usuario.
- 🔵 **Móvil:** Nueva pantalla `AdminCreateReservationScreen` → admin asigna reserva a usuario.
- 🔵 **Móvil:** En el perfil del usuario, mostrar badge de banderas (verde/amarilla/naranja/roja) con historial.
- 🔵 **Móvil:** En `AdminDashboardScreen`: botón para asignar bandera manual con selector de tipo y motivo.

#### Gustavo (Web)
- 🟢 **Web:** Panel de KPIs por departamento con gráfico de barras y tabla de costos.
- 🟢 **Web:** En el perfil de usuario web, mostrar el badge de banderas y el historial.

---

### **Jueves 7 de Agosto** *(entrega — foco en detalles y pulido)*
> **Foco: Validación de fotos tardías + Diseño + Flota mejorada + Inspecciones aleatorias (base)**

#### Joaquín (Backend + Móvil)
- 🔵 **Backend:** `node-cron` job cada minuto → detectar reservas `en_curso` con `fechaFin` vencida → enviar push al conductor.
- 🔵 **Backend:** Si pasan 15 min → notificación al admin con nombre y teléfono del conductor.
- 🔵 **Backend:** Endpoint para que admin envíe mensaje de demora al conductor de la siguiente reserva.
- 🔵 **Backend:** Base del sistema de inspecciones aleatorias → modelo `InspeccionAleatoria`, endpoint de activación y respuesta.
- 🔵 **Móvil:** En `FlotaScreen`: mostrar nombre del conductor y departamento en el vehículo `en_curso`.
- 🔵 **Móvil:** En detalle del vehículo: historial diario de conductores.
- 🎨 **Móvil:** Pulido de diseño general → gradientes más suaves, micro-animaciones, sombras mejoradas, logo actualizado en todos los headers.
- 🔵 **Móvil:** Notificación de inspección aleatoria al conductor (base funcional).

#### Gustavo (Web)
- 🟢 **Web:** Actualizar el logo en el panel web.
- 🟢 **Web:** En el mapa, mostrar el nombre del conductor y su departamento en el marcador del vehículo.
- 🟢 **Web:** Panel de inspecciones aleatorias → ver cuáles están pendientes y cuáles respondidas.
- 🟢 **Web:** Mejorar diseño del dashboard (toques más elegantes y detallados según feedback del cliente).
- 🔵🟢 **Ambos:** Pruebas del Happy Path completo con todos los nuevos flujos.

---

## 📦 Backlog (Post-entrega del Viernes 7)

Estos ítems son más complejos o de alcance amplio. Se recomiendan para la v3:

| Ítem | Complejidad | Razón |
|------|------------|-------|
| Sistema de Sub-Viaje / Cambio de Conductor | 🔴 Alta | Requiere rediseño del modelo de Reserva y GPS multidispositivo. |
| Randomizador completo con spam cada 1 min | 🟡 Media | Requiere infraestructura de push notifications bien configurada. |
| Lectura de bencina con IA desde la foto | 🔴 Alta | Modelo de visión especializado en tableros. Requiere entrenamiento. |

---

## 🔑 Decisiones Técnicas Clave

| Decisión | Tecnología propuesta |
|----------|---------------------|
| IA para leer licencia (fecha venc.) | OpenAI GPT-4 Vision / Google Vision OCR |
| IA para leer odómetro del tablero | OpenAI GPT-4 Vision / Google Vision OCR |
| Push Notifications | Expo Push Notifications (ya configurado) |
| Cron Job para alertas tardías | `node-cron` en el backend |
| Factor costo bencina | Variable configurable por admin en el sistema |

---

## 💡 Ideas Adicionales que Puedes Proponer para el Siguiente Sprint

- **QR de Vehículo:** Cada auto tiene un QR que al escanearlo el conductor lo vincula directamente a su reserva activa, sin necesidad de buscar el vehículo en la lista.
- **Firma digital al inicio/fin del viaje:** El conductor firma en pantalla al recibir y devolver el vehículo, como comprobante legal.
- **Reporte PDF por reserva:** El admin puede exportar un PDF con todos los detalles de un viaje (fotos, km, conductor, rutas GPS).
- **Modo oscuro en la app:** Ya que el cliente valora el diseño, una opción de modo oscuro puede ser un diferenciador.

---

## 🎨 Nuevo Logo

El logo actualizado de Bitnets ha sido recibido y se integrará en:
- `mobile/assets/icon.png` y `splash.png`
- Pantalla de Login de la App Móvil
- Header del Panel Web
- Header de la App (NavBar)

---

*Plan creado en base a la reunión de revisión del 1 de Agosto, 2026.*
*Próxima revisión: Viernes 7 de Agosto, 2026.*
