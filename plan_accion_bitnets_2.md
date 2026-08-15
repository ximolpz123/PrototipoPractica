# 📅 Plan de Acción — Sistema Flota Bitnets v2
**Reunión:** Miércoles 12 de Agosto, 2026 | **Equipo:** Joaquín López (Mobile/Backend) + Gustavo (Web Frontend)
**Revisión:** Tercera entrega — Observaciones Post-Testing del 7 de Agosto.

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

### **Jueves 6 de Agosto**
> **Foco: Banderas Automáticas, Flujo Avanzado de Reservas y Tracking GPS**

#### Joaquín (Backend + Móvil)
- 🔵 **Backend:** Completar lógica oculta (`node-cron` y triggers) para asignación **automática de banderas** por comportamiento.
- 🔵 **Backend:** Ajustar modelo `Reservation` para soportar las 6 fotos obligatorias y los subviajes (cambio de conductor).
- 🔵 **Móvil:** **Tracking GPS Estricto**: Cambiar rastreo a 1 minuto y obligar a prender el GPS antes de iniciar viaje.
- 🔵 **Móvil & Backend:** **Flujo de Reservas Avanzado**: Subida de las 6 fotos obligatorias y la IA que lea los kilómetros al devolver el auto.
- 🎨 **Móvil & Web:** **Branding**: Actualizar el Logo y los colores base en el código (Reemplazar icon.png y splash.png).

#### Gustavo (Web)
- 🟢 **Web:** Panel de KPIs por departamento con gráfico de barras y tabla de costos.
- 🟢 **Web:** Mostrar el historial de banderas asignadas automáticamente.

---

### **Viernes 7 de Agosto** *(entrega — foco en detalles y nuevos módulos)*
> **Foco: Notificaciones de retraso, Inspecciones Aleatorias, Pasar el Mando**

#### Joaquín (Backend + Móvil)
- 🔵 **Backend:** **Sistema de Retrasos**: `node-cron` job cada minuto para detectar reservas atrasadas y enviar notificaciones push.
- 🔵 **Móvil:** Pantalla `AdminCreateReservationScreen` para que el Admin asigne reservas de forma directa a los usuarios.
- 🔵 **Backend & Móvil:** **Flujo de Transferencia (Pasar el mando)**: Pasar el control de un auto y su GPS de un conductor a otro en plena calle.
- 🔵 **Backend & Móvil:** **Módulo de Inspecciones Aleatorias**: Tareas sorpresa (revisar neumáticos, foto interior) puestas por el sistema durante un viaje.
- 🔵 **Móvil:** Pulido de diseño final y testing.

#### Gustavo (Web)
- 🟢 **Web:** Panel de inspecciones aleatorias → ver cuáles están pendientes y cuáles respondidas.
- 🟢 **Web:** En el mapa, mostrar el nombre del conductor activo (incluso si hubo transferencia de mando).
- 🔵🟢 **Ambos:** Pruebas del Happy Path completo con todos los nuevos flujos.

---

## 📦 Backlog (Post-entrega de la v2)

Estos ítems son de alcance amplio para una posible iteración futura:

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

## 💡 Ideas Adicionales — Aprobadas para implementar en Sprint v3

### 📱 QR de Vehículo *(¿Cómo funcionaría?)*
- Cada vehículo generaría un **código QR único** (basado en su `_id` de la DB) que el admin puede imprimir y pegar en el parabrisas del auto.
- Al escanear el QR con la app (usando `expo-camera` ya instalado), el sistema busca si el conductor tiene una **reserva aprobada** para ese vehículo.
- Si hay coincidencia: vincula automáticamente la reserva y habilita el botón de "Iniciar Viaje" sin que el conductor tenga que buscar el auto en la lista.
- Si no hay reserva activa para ese vehículo: muestra un error *"No tienes una reserva asignada para este vehículo"*.
- **Ventaja principal:** Elimina confusiones de "agarré el vehículo equivocado" y agiliza el proceso de inicio de viaje.
- **Técnicamente:** Backend genera el QR con la librería `qrcode`, la app lo escanea con `expo-barcode-scanner`.

### ✍️ Firma Digital al Inicio/Fin del Viaje
- Al iniciar y finalizar el viaje, el conductor ve una pantalla de **firma en pantalla táctil** (tipo tableta de firma).
- La firma se convierte en una imagen PNG y se guarda en la DB junto a la reserva como `firmaInicio` y `firmaFin`.
- El admin puede ver las firmas en el detalle de cada reserva como comprobante legal.
- **Tecnología:** `expo-signature` o `react-native-signature-canvas`.

### 🌑 Modo Oscuro en la App
- Toggle de Modo Oscuro / Modo Claro en la pantalla de Perfil.
- El sistema detecta automáticamente la preferencia del sistema operativo (`Appearance.getColorScheme()` de React Native).
- Los colores principales cambian de fondo blanco/azul a fondo oscuro con acentos en azul neón.

### 🏴 Panel de Banderas con Filtros (Web Admin — Obs. 9)
- Nueva sección en el panel Admin de la Web: **"Gestión de Banderas"**.
- **Filtros disponibles:** Por usuario, por color de bandera (🟢🟡🟠🔴), por rango de fechas, por tipo (manual/automática).
- Cada bandera en la lista es **cliqueable** y abre un modal de detalle con: foto del evento, motivo, reserva vinculada, conductor, fecha exacta.
- El admin puede **eliminar o corregir** una bandera asignada automáticamente por error.
- **Ídem para Inspecciones:** La lista de inspecciones aleatorias también es cliqueable y muestra las fotos que el conductor subió como evidencia, con opción de aprobar/rechazar la respuesta.
- **Responsable:** Gustavo (Web Frontend).

### 📄 Reporte PDF por Reserva
- El admin puede exportar un PDF con todos los detalles de un viaje (fotos, km, conductor, rutas GPS).

---

## 🎨 Nuevo Logo

El logo actualizado de Bitnets ha sido recibido y se integrará en:
- `mobile/assets/icon.png` y `splash.png`
- Pantalla de Login de la App Móvil
- Header del Panel Web
- Header de la App (NavBar)

---

## 🔁 Observaciones Post-Testing (7 de Agosto) — Sprint v2.1

Estas tareas surgen del testing del Happy Path realizado el 7 de agosto. Se organizan por prioridad/dependencia para ser completadas antes del miércoles 12.

---

### 🗓️ Jueves 7 de Agosto (HOY)
> **Foco: Quick Fixes Críticos — Errores visibles en producción**

#### Joaquín (Backend + Móvil)
- [x] 🔵 **Móvil:** Fix — Bloquear pantalla "Nueva Reserva" si la licencia del usuario no está validada, con mensaje claro para ir al Perfil a escanearla.
- [x] 🔵 **Backend:** Fix — El endpoint `/auth/login` no retornaba los campos de licencia (`licenciaEstado`, `licenciaVencimiento`, etc.), haciendo que al reiniciar sesión se viera como vencida.
- [x] 🔵 **Backend:** Fix — El endpoint `GET /api/users` era solo para Admins; los conductores no podían cargarlo para "Pasar el mando". Se movió fuera del middleware de admin.
- [x] 🔵 **Móvil:** Fix — En la lista de conductores para "Pasar el mando", el conductor actual se seguía viendo a sí mismo por un problema de comparación de `id` vs `_id`.

---

### 🗓️ Viernes 8 de Agosto
> **Foco: Obs. 3, 6 y 2 — Datos de perfil, UX de login y botón de reserva**

#### Joaquín (Backend + Móvil)
- [x] 🔵 **Backend & Móvil (Obs. 3):** Fix — El campo `telefono` existe en la DB pero no se muestra en el Perfil. Ajustar controlador y `PerfilScreen`.
- [x] 🔵 **Móvil (Obs. 6):** Agregar botón **"ojito"** (mostrar/ocultar contraseña) en la pantalla de Login.
- [x] 🎨 **Móvil (Obs. 2):** Rediseñar el botón **"+ Crear Reserva"** en el Inicio para que sea más grande, llamativo (gradiente, ícono, sombra).
- [x] 🎨 **Móvil (Nueva Idea):** Implementar **Modo Oscuro** automático/manual usando `Appearance` de React Native y un toggle en el Perfil.

---

### 🗓️ Sábado 9 de Agosto
> **Foco: Obs. 5 y 8 — Cancelación con motivo e Inspecciones Aleatorias mejoradas**

#### Joaquín (Backend + Móvil)
- [ ] 🔵 **Móvil (Obs. 5):** Al cancelar una reserva, mostrar modal que **pida el motivo** antes de confirmar. El motivo se guarda en la DB.
- [ ] 🔵 **Móvil (Obs. 8):** Permitir **múltiples fotos** en la respuesta de Inspección Aleatoria.
- [ ] 🔵 **Móvil (Obs. 8):** Agregar botón de **"Minimizar"** al panel de Inspección Aleatoria para que el conductor pueda ocultar el aviso.
- [ ] 🔵 **Backend & Móvil (Nueva Idea):** Implementar **Firma Digital** (`react-native-signature-canvas`) obligatoria al iniciar y finalizar un viaje. Guardar en DB.

---

### 🗓️ Domingo 10 de Agosto
> **Foco: Obs. 7 — IA del odómetro también al INICIO del viaje**

#### Joaquín (Backend + Móvil)
- [ ] 🔵 **Backend & Móvil (Obs. 7):** Extender el flujo de IA del odómetro al **inicio del viaje** (fotos de salida). La IA lee el km inicial y lo guarda como `kmSalida` para calcular km reales por reserva.
- [ ] 🔵 **Backend & Móvil (Nueva Idea):** Implementar el escaneo de **QR de Vehículo** (`expo-barcode-scanner`). Al escanear un QR generado desde la DB, vincula automáticamente el vehículo a la reserva activa del conductor.

---

### 🗓️ Lunes 11 de Agosto
> **Foco: Obs. 1 y 4 — Fotos del vehículo en creación + Flujo completo de Pasar el Mando**

#### Joaquín (Backend + Móvil)
- [ ] 🔵 **Backend & Móvil (Obs. 1):** Al **crear un vehículo**, agregar paso de **5 fotos de presentación** (Frontal, Trasero, Lateral Izq., Lateral Der., Interior). Se muestran en la galería del detalle del vehículo.
- [ ] 🔵 **Backend & Móvil (Obs. 4 — Flujo completo de Aceptación del Mando):**
  1. Conductor A pulsa "Pasar el Mando" y selecciona Conductor B → **push notification** al B.
  2. En el Inicio del B aparece **banner de solicitud**: *"Juan Pérez quiere pasarte el mando del [PLACA]. ¿Aceptas?"*
  3. Si B **rechaza**: escribe motivo, se notifica a A, y A **reanuda su viaje automáticamente sin nuevas fotos**.
  4. Si B **acepta**, se le pregunta: *¿Continúas el trayecto o harás el viaje de vuelta?*
     - **Continúa:** GPS se transfiere a B. A cierra su tramo sin fotos. B sigue normalmente.
     - **Vuelta:** Se activa flujo de **6 fotos de salida** para B con IA de odómetro para registrar `kmSalida` del nuevo tramo.

#### Gustavo (Web)
- [ ] 🟢 **Web (Obs. 9):** Panel de **"Gestión de Banderas"** con filtros por usuario, color y fecha. Cada bandera es cliqueable con modal de detalle (fotos, motivo, reserva vinculada). Inspecciones aleatorias también clicables con opción de aprobar/rechazar la respuesta del conductor.
- [ ] 🟢 **Backend & Web (Nueva Idea):** Implementar exportación de **Reporte PDF por Reserva** con todos los detalles (fotos, kilómetros, conductor).

#### Joaquín (Móvil)
- [x] 🔵 **Móvil (Nueva Idea):** Implementar **Pantalla de Gestión de Banderas (Solo Lectura para Admin)**. El admin puede ver un listado general de banderas asignadas a todos los usuarios, con filtros básicos, para auditar desde su teléfono.

---

### 🗓️ Martes 12 de Agosto (Reunión)
> **Foco: Testing final, pulido y preparación para la reunión**

#### Joaquín (Backend + Móvil)
- [ ] 🔵 **Testing:** Prueba del Happy Path completo con todos los flujos v2.1.
- [ ] 🔵 **Móvil:** Pulido final de diseño en pantallas nuevas o modificadas.
- [ ] 🔵 **Documentación:** Actualizar el plan con tareas completadas y resumen para la reunión.

---

## ❓ Respuesta: GPS y Notificaciones en Segundo Plano

**Estado actual (desarrollo local con Expo Go):**
- El GPS usa `startLocationUpdatesAsync` → funciona en segundo plano **en dispositivos físicos**. En emulador puede fallar.
- Las notificaciones push solo llegan si la app está en primer plano (Expo Go no tiene push real).

**Una vez publicada la app con `eas build`:**
- GPS rastreará en segundo plano de forma nativa.
- Inspecciones aleatorias llegarán como notificaciones reales aunque el teléfono esté bloqueado.

**Conclusión:** Ya está todo programado. Se activará al 100% cuando se lance la app con `eas build`.

---

*Plan creado en base a la reunión de revisión del 1 de Agosto, 2026.*
*Actualizado: Jueves 7 de Agosto, 2026 — Observaciones post-testing.*
*Próxima reunión: Miércoles 12 de Agosto, 2026.*
