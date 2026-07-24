import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ImageBackground,
  Image,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { authService } from './services/auth.service';
import './services/location.service'; // Import location service for global TaskManager registration
import type { IUser } from './types';
import { COLORS } from './constants';

// Screens
import HomeScreen from './screens/HomeScreen';
import CameraScreen from './screens/CameraScreen';
import MisReservasScreen from './screens/MisReservasScreen';
import FlotaScreen from './screens/FlotaScreen';
import PerfilScreen from './screens/PerfilScreen';
import CreateReservationScreen from './screens/CreateReservationScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabNavigator({ route }: any) {
  const { user, handleLogout } = route.params;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          if (route.name === 'Inicio') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Reservas') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Flota') {
            iconName = focused ? 'car' : 'car-outline';
          } else if (route.name === 'Perfil') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        headerShown: true,
      })}
    >
      <Tab.Screen 
        name="Inicio" 
        component={HomeScreen} 
        initialParams={{ user }} 
      />
      <Tab.Screen 
        name="Reservas" 
        component={MisReservasScreen} 
      />
      <Tab.Screen 
        name="Flota" 
        component={FlotaScreen} 
      />
      <Tab.Screen 
        name="Perfil" 
        component={PerfilScreen} 
        initialParams={{ user, handleLogout }} 
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [user, setUser] = useState<IUser | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // Al abrir la app, verificar si ya hay sesión activa
  useEffect(() => {
    const checkSession = async () => {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
      setCheckingSession(false);
    };
    checkSession();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Por favor ingresa tu email y contraseña');
      return;
    }

    setLoading(true);
    try {
      const response = await authService.login({ email: email.trim(), password });
      setUser(response.user);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Error al iniciar sesión';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    setUser(null);
    setEmail('');
    setPassword('');
  };

  // Pantalla de carga inicial
  if (checkingSession) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  // Si el usuario está logueado, usar Navigation
  if (user) {
    return (
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen 
            name="MainTabs" 
            component={MainTabNavigator} 
            initialParams={{ user, handleLogout }} 
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="Camera" 
            component={CameraScreen} 
            options={{ title: 'Tomar Evidencia' }}
          />
          <Stack.Screen 
            name="CreateReservation" 
            component={CreateReservationScreen} 
            options={{ title: 'Crear Reserva' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  // Pantalla de Login
  return (
    <ImageBackground 
      source={require('./assets/login-bg.png')} 
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.loginCardNew}>
          <View style={styles.loginHeader}>
            <View style={styles.logoPlaceholder}>
              <Text style={styles.logoText}>BF</Text>
            </View>
            <Text style={styles.titleNew}>Bitnets Flota</Text>
            <Text style={styles.subtitleNew}>Ingrese sus credenciales</Text>
          </View>
          
          <View style={styles.loginForm}>
            <TextInput
              style={styles.inputNew}
              placeholder="Email (Ej: admin@empresa.com)"
              placeholderTextColor={COLORS.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <TextInput
              style={styles.inputNew}
              placeholder="Contraseña"
              placeholderTextColor={COLORS.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <TouchableOpacity
              style={[styles.loginBtnNew, loading && styles.loginBtnDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.loginBtnTextNew}>INGRESE</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    padding: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 10,
    color: COLORS.textMuted,
    fontSize: 14,
  },
  loginCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: COLORS.text,
    marginBottom: 14,
    backgroundColor: COLORS.background,
  },
  loginBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  loginBtnDisabled: {
    opacity: 0.6,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  loginCardNew: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
    overflow: 'hidden',
  },
  loginHeader: {
    backgroundColor: COLORS.primary,
    padding: 30,
    alignItems: 'center',
  },
  logoPlaceholder: {
    width: 60,
    height: 60,
    backgroundColor: 'white',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  logoText: {
    color: COLORS.primary,
    fontSize: 22,
    fontWeight: 'bold',
  },
  titleNew: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  subtitleNew: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  loginForm: {
    padding: 24,
  },
  inputNew: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 14,
    fontSize: 15,
    color: COLORS.text,
    marginBottom: 14,
    backgroundColor: '#f8fafc',
  },
  loginBtnNew: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  loginBtnTextNew: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
