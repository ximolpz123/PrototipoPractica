import { Appearance } from 'react-native';

// export const API_URL = 'http://192.168.1.50:5000/api';
export const API_URL = 'http://10.99.41.176:5000/api';

const isDarkMode = Appearance.getColorScheme() === 'dark';

export const COLORS = {
  primary: '#3D9FD3',       // Azul principal
  secondary: '#5C99CC',     // Azul secundario
  primaryDark: '#478EC6',   // Azul oscuro

  // Colores dinámicos basados en el tema
  background: isDarkMode ? '#121212' : '#F1F5F9', // Fondo de la app
  white: isDarkMode ? '#1E1E1E' : '#FFFFFF',      // Fondo de las tarjetas
  grayLight: isDarkMode ? '#333333' : '#D6D7D9',
  grayMedium: isDarkMode ? '#555555' : '#B5B8BE',
  grayDark: '#8E939A',

  text: isDarkMode ? '#F1F5F9' : '#1E293B',       // Texto principal
  textMuted: '#8E939A',                           // El color gris oscuro solicitado por el usuario
  border: isDarkMode ? '#333333' : '#D6D7D9',     // Bordes sutiles

  success: '#16A34A',
  danger: '#DC2626',
  warning: '#F59E0B',
  info: '#0284C7',
};
