# 📋 Plan de Trabajo - Práctica Profesional

Dado que los requisitos de la práctica exigen una separación clara de los commits y el trabajo, la división del proyecto será estrictamente **Backend (Joaquín)** y **Frontend (Gustavo)**.

---

## 👨‍💻 Joaquín: Backend (La Lógica y Datos)
*Tu objetivo es asegurar que la API entregue los datos correctos, controle la seguridad y maneje casos extremos (como intentar reservar un auto que ya está ocupado).*

### Tareas Pendientes para el Backend:
1. **Mejora del Modelo de Vehículos:**
   - Crear un endpoint para que un Administrador pueda marcar un auto en "mantenimiento" y bloquee reservas en esas fechas.
   - Añadir soporte para subir imágenes de los vehículos.
2. **Dashboard y Estadísticas:**
   - Crear un endpoint `GET /api/dashboard/stats` que devuelva datos calculados para la vista principal: total de reservas activas, vehículo más usado, próximos mantenimientos.
3. **Manejo del Kilometraje:**
   - Crear un endpoint donde, al finalizar una reserva, se deba ingresar el `kmRetorno`. El sistema debe actualizar automáticamente el `kilometraje` total del vehículo.
4. **Validaciones Avanzadas:**
   - Asegurarse de que un usuario "normal" no pueda reservar más de un vehículo para las mismas fechas.

---

## 👨‍🎨 Gustavo: Frontend (La Interfaz Visual)
*Su objetivo es consumir la API que construye Joaquín y crear una interfaz visual atractiva, funcional y que maneje bien los estados de carga y errores.*

### Tareas Pendientes para el Frontend:
1. **Diseño y Layout Base:**
   - Configurar la navegación (Navbar y Sidebar) dependiendo del rol (Admin vs Usuario).
   - Implementar un sistema de alertas (ej. *Toast notifications*) para mensajes de éxito o error.
2. **Módulo de Autenticación:**
   - Construir las pantallas de Login y Registro.
   - Proteger las rutas con React Router para que nadie entre al Dashboard sin estar logueado.
3. **Módulo de Vehículos:**
   - Crear una galería o grilla (`Vehicles.tsx`) donde se vean los autos con sus fotos y si están "Disponibles" o "Reservados".
4. **Módulo de Reservas (El núcleo):**
   - Crear el formulario complejo para pedir un auto, con validación de fechas (fin mayor a inicio).
   - Crear una tabla para el Administrador donde vea todas las peticiones "pendientes" con botones para **Aprobar** o **Rechazar**.
5. **Dashboard:**
   - Consumir el endpoint de estadísticas y mostrar gráficos simples o tarjetas.

---

## 🚦 Flujo de Trabajo Seguro en Git (Guía Paso a Paso)

> [!CAUTION]
> **NUNCA trabajen directamente en la rama `main`**. La rama `main` es intocable y solo debe tener código que funciona al 100%. Usen las ramas (branches) como copias seguras.
> **Regla de oro:** Joaquín solo toca la carpeta `backend/`. Gustavo solo toca la carpeta `frontend/`.

### Guía Rápida de Comandos para Gustavo y Joaquín:

#### Paso 1: Antes de empezar a programar en el día
Siempre asegúrate de tener el código más reciente de tu compañero antes de iniciar.
```bash
# Cambiarte a la rama principal
git checkout main

# Descargar las últimas actualizaciones de GitHub
git pull origin main
```

#### Paso 2: Crear tu espacio seguro (Tu Rama)
Ahora crea una "copia paralela" (rama) para trabajar en tu tarea del día sin romper nada.
```bash
# Si eres Gustavo y vas a hacer el login:
git checkout -b frontend-login

# Si eres Joaquín y harás las estadísticas:
git checkout -b backend-stats
```

#### Paso 3: Trabajar y guardar tus avances (Commits)
Escribe tu código. Cuando tengas algo funcionando, guárdalo en un "commit". Puedes hacer varios commits en el mismo día.
```bash
# Ver qué archivos cambiaste
git status

# Agregar TODOS tus cambios para guardarlos
git add .

# Crear el "paquete" (commit) con un mensaje claro y descriptivo. 
git commit -m "feat: crear pantalla de login"
```

#### Paso 4: Subir tu trabajo a GitHub
Al terminar tu tarea (o al final del día), sube tu rama (tu copia segura) a GitHub.
```bash
# Reemplaza "nombre-de-tu-rama" con el nombre que pusiste en el Paso 2
git push -u origin nombre-de-tu-rama
```

#### Paso 5: Unir tu código al "Main" (Pull Request)
1. Ve a **GitHub.com** a su repositorio.
2. Te aparecerá un botón verde que dice **"Compare & pull request"**. Haz clic.
3. Esto crea una solicitud para unir tu código con el `main`. Tu compañero podrá revisar el código en la web o probarlo localmente.
4. Si todo está correcto, el otro (ej. Joaquín) hace clic en **"Merge pull request"**. ¡Listo! El código ya es oficialmente parte del proyecto principal.

---

## 🕵️‍♂️ ¿Cómo probar el código de mi compañero antes de aprobarlo?

Imagina que Gustavo creó el Pull Request de `frontend-login`. Joaquín (el dueño del repo) quiere asegurarse de que funciona en su propia PC antes de darle al botón de "Merge". Joaquín debe seguir estos pasos en su terminal:

**1. Descargar las ramas nuevas de GitHub:**
```bash
git fetch origin
```

**2. "Viajar" a la rama de tu compañero:**
```bash
# Al hacer esto, tus archivos locales cambian a la versión de Gustavo
git checkout frontend-login
```

**3. Levantar el proyecto y probar:**
```bash
npm run dev
```
*Abre tu navegador, prueba el login y asegúrate de que no haya errores de consola.*

**4. Volver a la normalidad:**
- **Si funcionó perfecto:** Vas a GitHub y haces clic en el botón verde **"Merge pull request"**. 
- **Si tenía errores:** Le avisas por chat a Gustavo para que haga las correcciones en su código (él solo hace un nuevo commit y push a su misma rama, tú haces `git pull` para ver la corrección).

Finalmente, regresas a tu zona segura (`main`) y te actualizas:
```bash
git checkout main
git pull origin main
```
