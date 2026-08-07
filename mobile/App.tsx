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
import { userService } from './services/user.service';
import { reservationService } from './services/reservation.service';
import { locationService } from './services/location.service'; // Import location service for global TaskManager registration
import type { IUser } from './types';
import { COLORS } from './constants';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

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
import AddVehicleAIScreen from './screens/AddVehicleAIScreen';
import AdminCreateReservationScreen from './screens/AdminCreateReservationScreen';
import AdminBanderasScreen from './screens/AdminBanderasScreen';
import { AlertProvider, useAlert } from './context/AlertContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ── Navegación del CONDUCTOR ────────────────────────────────────────────────
function MainTabNavigator({ route }: any) {
  const { user, handleLogout } = route.params;
  const { colors } = useTheme();

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
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.border },
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerShown: true,
        headerLeft: () => (
          <Image 
            source={require('./assets/logo.png')} 
            style={{ width: 30, height: 30, marginLeft: 15 }} 
            resizeMode="contain" 
          />
        ),
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
  const { themePreference, setThemePreference, colors } = useTheme();

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
          } else if (route.name === 'Banderas') {
            iconName = focused ? 'flag' : 'flag-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.border },
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerShown: true,
        headerLeft: () => (
          <Image 
            source={require('./assets/logo.png')} 
            style={{ width: 30, height: 30, marginLeft: 15 }} 
            resizeMode="contain" 
          />
        ),
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={AdminDashboardScreen}
        options={{
          title: 'Panel Admin',
          tabBarLabel: 'Solicitudes',
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 15 }}>
              <TouchableOpacity 
                onPress={() => {
                  if (themePreference === 'light') setThemePreference('dark');
                  else if (themePreference === 'dark') setThemePreference('system');
                  else setThemePreference('light');
                }}
                style={{ marginRight: 20 }}
              >
                <Ionicons 
                  name={themePreference === 'light' ? 'sunny' : themePreference === 'dark' ? 'moon' : 'phone-portrait-outline'} 
                  size={24} 
                  color={colors.primary} 
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setLogoutModalVisible(true)}>
                <Ionicons name="log-out-outline" size={24} color={COLORS.danger} />
              </TouchableOpacity>
            </View>
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
      <Tab.Screen
        name="Banderas"
        component={AdminBanderasScreen}
        options={{ title: 'Gestión de Banderas', tabBarLabel: 'Banderas' }}
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

// ====== COMPONENTE PRINCIPAL ======
function MainApp() {
  const { showAlert } = useAlert();
  const { colors } = useTheme();
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // Funciones de Push Notifications
  const registerForPushNotificationsAsync = async (currentUser: any) => {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        return;
      }
      
      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      
      if (!projectId) {
        console.log('⚠️ No se encontró EAS projectId. Ejecuta `eas init` si deseas notificaciones Push reales.');
        return; // Detener aquí para evitar el error 400 de Expo
      }

      try {
        const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
        if (currentUser && currentUser._id) {
          await userService.updatePushToken(currentUser._id, token);
        }
      } catch (e) {
        console.log('⚠️ Error de Expo Push Token (ignorable en dev local):', e);
      }
    }
  };

  // Al abrir la app, verificar si ya hay sesión activa
  useEffect(() => {
    const checkSession = async () => {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
      setCheckingSession(false);
      
      if (currentUser) {
        registerForPushNotificationsAsync(currentUser);
      }
    };
    checkSession();
  }, []);

  // Listeners de Notificaciones
  useEffect(() => {
    if (!user) return;

    const subscription = Notifications.addNotificationReceivedListener(notification => {
      const data = notification.request.content.data as any;
      if (data && data.type === 'DELAY_CONFIRMATION') {
        Alert.alert(
          notification.request.content.title || 'Retraso en vehículo',
          notification.request.content.body || 'Tu próximo vehículo está retrasado.',
          [
            {
              text: 'Cancelar Reserva',
              style: 'destructive',
              onPress: async () => {
                try {
                  await reservationService.handleDelayResponse(data.reservaId, false, 'Cancelada por el conductor debido a retraso de 15 mins.');
                  showAlert('Cancelada', 'Has cancelado la reserva.');
                } catch (err) {
                  showAlert('Error', 'No se pudo cancelar la reserva.');
                }
              }
            },
            {
              text: 'Aceptar Demora',
              onPress: async () => {
                try {
                  await reservationService.handleDelayResponse(data.reservaId, true);
                  showAlert('Éxito', 'Has aceptado la demora de 15 minutos.');
                } catch (err) {
                  showAlert('Error', 'No se pudo actualizar tu reserva.');
                }
              }
            }
          ],
          { cancelable: false }
        );
      } else if (data && data.type === 'HANDOVER_REQUEST') {
        Alert.alert(
          notification.request.content.title || 'Transferencia de Vehículo',
          notification.request.content.body || 'Te han asignado el regreso del vehículo. ¿Aceptas?',
          [
            { text: 'Rechazar', style: 'cancel' },
            {
              text: 'Aceptar',
              onPress: async () => {
                try {
                  await reservationService.cambioConductorTramo(data.reservaId, user.id || (user as any)._id, data.kmActual);
                  await locationService.startTracking(data.reservaId);
                  showAlert('Mando Aceptado', 'Has recibido el vehículo y el GPS está activo.');
                } catch (err: any) {
                  showAlert('Error', err.response?.data?.message || 'No se pudo aceptar el vehículo.');
                }
              }
            }
          ],
          { cancelable: false }
        );
      }
    });

    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      // Manejar click si es necesario
    });

    return () => {
      subscription.remove();
      responseSubscription.remove();
    };
  }, [user]);

  const handleLogin = async () => {
    if (!email || !password) {
      showAlert('Error', 'Por favor ingresa tu email y contraseña');
      return;
    }

    setLoading(true);
    try {
      const response = await authService.login({ email: email.trim(), password });
      setUser(response.user);
      registerForPushNotificationsAsync(response.user);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Error al iniciar sesión';
      showAlert('Error', message);
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
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>Cargando...</Text>
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
          {isAdmin && (
            <>
              <Stack.Screen
                name="AddVehicleAI"
                component={AddVehicleAIScreen}
                options={{ title: 'Crear Vehículo con IA' }}
              />
              <Stack.Screen
                name="AdminCreateReservation"
                component={AdminCreateReservationScreen}
                options={{ title: 'Asignar Vehículo' }}
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
            <Image 
              source={require('./assets/logo.png')} 
              style={styles.logoImage} 
              resizeMode="contain" 
            />
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

            <View style={styles.passwordContainerNew}>
              <TextInput
                style={styles.passwordInputNew}
                placeholder="Contraseña"
                placeholderTextColor={COLORS.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity 
                style={styles.eyeButtonNew} 
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons 
                  name={showPassword ? 'eye-off' : 'eye'} 
                  size={22} 
                  color={COLORS.textMuted} 
                />
              </TouchableOpacity>
            </View>

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

export default function App() {
  return (
    <ThemeProvider>
      <AlertProvider>
        <MainApp />
      </AlertProvider>
    </ThemeProvider>
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
  logoImage: {
    width: 80,
    height: 80,
    marginBottom: 10,
    borderRadius: 40,
    backgroundColor: COLORS.white,
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
  passwordContainerNew: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    marginBottom: 14,
  },
  passwordInputNew: {
    flex: 1,
    padding: 14,
    fontSize: 15,
    color: COLORS.text,
  },
  eyeButtonNew: {
    padding: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
