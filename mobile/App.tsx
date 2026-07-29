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
  Modal,
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
import AdminDashboardScreen from './screens/AdminDashboardScreen';
import AdminHistoryScreen from './screens/AdminHistoryScreen';
import AdminMapScreen from './screens/AdminMapScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ── Navegación del CONDUCTOR ────────────────────────────────────────────────
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
      <Tab.Screen name="Inicio" component={HomeScreen} initialParams={{ user }} />
      <Tab.Screen name="Reservas" component={MisReservasScreen} />
      <Tab.Screen name="Flota" component={FlotaScreen} />
      <Tab.Screen name="Perfil" component={PerfilScreen} initialParams={{ user, handleLogout }} />
    </Tab.Navigator>
  );
}

// ── Navegación del ADMINISTRADOR ─────────────────────────────────────────────
function AdminTabNavigator({ route }: any) {
  const { user, handleLogout } = route.params;
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  return (
    <>
      <Tab.Navigator
        screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'grid';
          if (route.name === 'Dashboard') {
            iconName = focused ? 'grid' : 'grid-outline';
          } else if (route.name === 'Mapa Admin') {
            iconName = focused ? 'map' : 'map-outline';
          } else if (route.name === 'Flota Admin') {
            iconName = focused ? 'car' : 'car-outline';
          } else if (route.name === 'Historial Admin') {
            iconName = focused ? 'list' : 'list-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        headerShown: true,
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={AdminDashboardScreen}
        options={{
          title: '🛡 Panel Admin',
          tabBarLabel: 'Solicitudes',
          headerRight: () => (
            <TouchableOpacity 
              onPress={() => setLogoutModalVisible(true)} 
              style={{ marginRight: 15 }}
            >
              <Ionicons name="log-out-outline" size={24} color={COLORS.danger} />
            </TouchableOpacity>
          ),
        }}
      />
      <Tab.Screen
        name="Mapa Admin"
        component={AdminMapScreen}
        options={{ title: 'Mapa en Tiempo Real', tabBarLabel: 'Mapa' }}
      />
      <Tab.Screen
        name="Flota Admin"
        component={FlotaScreen}
        options={{ title: 'Flota de Vehículos', tabBarLabel: 'Flota' }}
      />
      <Tab.Screen
        name="Historial Admin"
        component={AdminHistoryScreen}
        options={{ title: 'Auditoría y Evidencia', tabBarLabel: 'Historial' }}
      />
    </Tab.Navigator>
    
      {/* Modal de confirmación de cierre de sesión con el diseño de la app */}
      <Modal visible={logoutModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
              <Ionicons name="log-out-outline" size={40} color={COLORS.danger} />
            </View>
            <Text style={styles.modalTitle}>Cerrar Sesión</Text>
            <Text style={styles.modalText}>¿Estás seguro de que deseas cerrar sesión y salir del panel de administración?</Text>
            
            <View style={styles.modalButtonsRow}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setLogoutModalVisible(false)}>
                <Text style={styles.modalBtnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnDanger} onPress={handleLogout}>
                <Text style={styles.modalBtnDangerText}>Sí, Salir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
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

  // Si el usuario está logueado, bifurcar por rol
  if (user) {
    const isAdmin = user.rol === 'admin';
    return (
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen
            name="MainTabs"
            component={isAdmin ? AdminTabNavigator : MainTabNavigator}
            initialParams={{ user, handleLogout }}
            options={{ headerShown: false }}
          />
          {/* Pantallas de stack solo para conductores */}
          {!isAdmin && (
            <>
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
            </>
          )}
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
  btnTextDark: {
    color: COLORS.primaryDark,
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  modalIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.danger + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 10,
  },
  modalText: {
    fontSize: 15,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  modalBtnCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  modalBtnCancelText: {
    color: COLORS.text,
    fontWeight: '600',
    fontSize: 16,
  },
  modalBtnDanger: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: COLORS.danger,
    alignItems: 'center',
  },
  modalBtnDangerText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 16,
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
