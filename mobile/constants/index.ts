// URL del backend — cambia esto por la IP de tu PC cuando pruebes en el celular físico
// Para encontrar tu IP: abre una terminal y escribe "ipconfig" → busca "IPv4"
// Ejemplo: export const API_URL = 'http://192.168.1.50:5000/api';
export const API_URL = 'http://10.66.96.176:5000/api';

export const COLORS = {
  primary: '#3D9FD3',       // Azul principal
  secondary: '#5C99CC',     // Azul secundario
  primaryDark: '#478EC6',   // Azul oscuro
  background: '#F1F5F9',    // Mantenemos un fondo ligeramente gris para contraste
  white: '#FFFFFF',         // Blanco
  grayLight: '#D6D7D9',     // Gris claro
  grayMedium: '#B5B8BE',    // Gris medio
  grayDark: '#8E939A',      // Gris oscuro
  text: '#1E293B',          // Texto principal oscuro
  textMuted: '#8E939A',     // Texto secundario usando el gris oscuro
  border: '#D6D7D9',        // Bordes usando el gris claro
  success: '#16A34A',       // Verde de éxito (mantenido de la base)
  danger: '#DC2626',        // Rojo de error (mantenido de la base)
};
