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

  success: '#22C55E',
  danger: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
};

export const GRADIENTS = {
  primary: ['#5C99CC', '#3D9FD3'] as const,
  primaryDark: ['#478EC6', '#2A6F9E'] as const,
  success: ['#4ADE80', '#22C55E'] as const,
  danger: ['#F87171', '#EF4444'] as const,
  warning: ['#FBBF24', '#F59E0B'] as const,
  cardBackground: isDarkMode ? (['#1E1E1E', '#252525'] as const) : (['#FFFFFF', '#F8FAFC'] as const),
  mainBackground: isDarkMode ? (['#121212', '#1A1A1A'] as const) : (['#F1F5F9', '#E2E8F0'] as const),
};

export const SHADOWS = {
  subtleMauve: {
    shadowColor: '#C4A4D4', // Rosa-malva sutil y elegante
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  elegant: {
    shadowColor: '#3D9FD3', // Sombra tenue corporativa
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  }
};

export const BORDER_RADIUS = {
  sm: 12,
  md: 18,
  lg: 24,
  xl: 32,
  round: 999,
};

// ─── Paletas de Color (para el ThemeContext) ──────────────────────────────────

export const LIGHT_COLORS = {
  primary: '#3D9FD3',
  secondary: '#5C99CC',
  primaryDark: '#478EC6',
  background: '#F1F5F9',
  white: '#FFFFFF',
  grayLight: '#D6D7D9',
  grayMedium: '#B5B8BE',
  grayDark: '#8E939A',
  text: '#1E293B',
  textMuted: '#8E939A',
  border: '#E2E8F0',
  success: '#22C55E',
  danger: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
};

export const DARK_COLORS = {
  primary: '#3D9FD3',
  secondary: '#5C99CC',
  primaryDark: '#478EC6',
  background: '#0F172A',
  white: '#1E293B',
  grayLight: '#334155',
  grayMedium: '#475569',
  grayDark: '#64748B',
  text: '#F1F5F9',
  textMuted: '#94A3B8',
  border: '#334155',
  success: '#22C55E',
  danger: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
};

export type AppColors = typeof LIGHT_COLORS;

export const getGradients = (dark: boolean) => ({
  primary: ['#5C99CC', '#3D9FD3'] as const,
  primaryDark: ['#478EC6', '#2A6F9E'] as const,
  success: ['#4ADE80', '#22C55E'] as const,
  danger: ['#F87171', '#EF4444'] as const,
  warning: ['#FBBF24', '#F59E0B'] as const,
  cardBackground: dark ? (['#1E293B', '#243048'] as const) : (['#FFFFFF', '#F8FAFC'] as const),
  mainBackground: dark ? (['#0F172A', '#1E293B'] as const) : (['#F1F5F9', '#E2E8F0'] as const),
});
