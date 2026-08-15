import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LIGHT_COLORS, DARK_COLORS, AppColors, getGradients } from '../constants';

export type ThemePreference = 'light' | 'dark' | 'system';

interface ThemeContextType {
  colors: AppColors;
  gradients: ReturnType<typeof getGradients>;
  isDark: boolean;
  themePreference: ThemePreference;
  setThemePreference: (pref: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = '@bitnets_theme';

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme debe usarse dentro de ThemeProvider');
  return context;
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [themePreference, setThemePrefState] = useState<ThemePreference>('system');
  const [systemScheme, setSystemScheme] = useState<ColorSchemeName>(Appearance.getColorScheme());

  // Cargar preferencia guardada al iniciar
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(saved => {
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        setThemePrefState(saved);
      }
    });
  }, []);

  // Escuchar cambios del sistema
  useEffect(() => {
    const listener = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme);
    });
    return () => listener.remove();
  }, []);

  const setThemePreference = (pref: ThemePreference) => {
    setThemePrefState(pref);
    AsyncStorage.setItem(STORAGE_KEY, pref);
  };

  const isDark =
    themePreference === 'dark' ||
    (themePreference === 'system' && systemScheme === 'dark');

  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;
  const gradients = getGradients(isDark);

  return (
    <ThemeContext.Provider value={{ colors, gradients, isDark, themePreference, setThemePreference }}>
      {children}
    </ThemeContext.Provider>
  );
};
