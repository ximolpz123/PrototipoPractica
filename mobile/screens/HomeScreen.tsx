import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, Modal, ScrollView, RefreshControl, Linking, Animated, Image, Alert, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, AppColors, GRADIENTS, SHADOWS, BORDER_RADIUS } from '../constants';
import { useTheme } from '../context/ThemeContext';
import { useAlert } from '../context/AlertContext';
import { locationService } from '../services/location.service';
import { reservationService, IReservation } from '../services/reservation.service';
import { userService } from '../services/user.service';
import { inspectionService, IInspeccion } from '../services/inspection.service';
import { IUser } from '../types';
import api from '../services/api';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useAuth } from '../context/AuthContext';

export default function HomeScreen({ route, navigation }: any) {
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);
  

  const { showAlert } = useAlert();
  const { user: authUser } = useAuth();
  const user = authUser!; // Safe: HomeScreen only renders when user is logged in

  const [activeReserva, setActiveReserva] = useState<IReservation | null>(null);
  const [upcomingReserva, setUpcomingReserva] = useState<IReservation | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Micro-animación de entrada
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(20));

  useFocusEffect(
    useCallback(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        })
      ]).start();
    }, [fadeAnim, slideAnim])
  );

  const [activeInspection, setActiveInspection] = useState<IInspeccion | null>(null);
  const [inspectionPhotos, setInspectionPhotos] = useState<string[]>([]);
  const [inspectionText, setInspectionText] = useState('');
  const [submittingInspection, setSubmittingInspection] = useState(false);
  const [isInspectionMinimized, setIsInspectionMinimized] = useState(false);

  // Modal DEV para Máquina del Tiempo
  const [devModalVisible, setDevModalVisible] = useState(false);
  const [manualMinutes, setManualMinutes] = useState('');

  // Cancelación de reserva desde el Inicio
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [canceling, setCanceling] = useState(false);

  const [serverOffset, setServerOffset] = useState(0);
  const [simulatedTime, setSimulatedTime] = useState(new Date());

  const [showDriverModal, setShowDriverModal] = useState(false);
  const [drivers, setDrivers] = useState<IUser[]>([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);

  // ── Nuevo Flujo Traspaso (Mando) ──
  const [pendingHandover, setPendingHandover] = useState<IReservation | null>(null);
  const [showHandoverRejectModal, setShowHandoverRejectModal] = useState(false);
  const [showHandoverAcceptModal, setShowHandoverAcceptModal] = useState(false);
  const [handoverReason, setHandoverReason] = useState('');
  const [respondingHandover, setRespondingHandover] = useState(false);

  const fetchTimeOffset = async () => {
    try {
      const res = await api.get('/dev/time');
      setServerOffset(res.data.offset);
    } catch (e) {
      console.log('No se pudo obtener offset del server', e);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setSimulatedTime(new Date(Date.now() + serverOffset));
    }, 1000);
    return () => clearInterval(interval);
  }, [serverOffset]);

  const changeDevTime = async (hours: number, days: number, minutes: number = 0) => {
    try {
      await api.post('/dev/time', { action: 'set', hours, days, minutes });
      showAlert('Éxito', 'Tiempo adelantado (simulado).');
      setDevModalVisible(false);
      await fetchTimeOffset();
      loadReservas(true); // Recargar datos
    } catch (error) {
      showAlert('Error', 'No se pudo cambiar el tiempo');
    }
  };

  const resetDevTime = async () => {
    try {
      await api.post('/dev/time', { action: 'reset' });
      showAlert('Éxito', 'Reloj vuelto a la normalidad.');
      setDevModalVisible(false);
      await fetchTimeOffset();
      loadReservas(true);
    } catch (error) {
      showAlert('Error', 'No se pudo reiniciar el tiempo');
    }
  };

  const loadReservas = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const all = await reservationService.getMyReservations();

      const currentUserId = user.id || (user as any)._id;

      // Buscar reserva en_curso (viaje activo)
      const enCurso = all.find((r) => {
        if (r.estado !== 'en_curso') return false;
        
        // Verificar si el usuario actual es el conductor activo
        const isCurrentDriver = r.tramos && r.tramos.length > 0 
          ? (typeof r.tramos[r.tramos.length - 1].conductor === 'string' 
              ? r.tramos[r.tramos.length - 1].conductor === currentUserId 
              : (r.tramos[r.tramos.length - 1].conductor as any)._id === currentUserId)
          : (typeof r.usuario === 'string' ? r.usuario === currentUserId : (r.usuario as any)._id === currentUserId);
          
        return isCurrentDriver;
      }) ?? null;
      
      // Chequear si el usuario actual tiene un tramo y requiere fotos
      let requiereFotosInicio = false;
      if (enCurso && enCurso.tramos && enCurso.tramos.length > 0) {
        const lastTramo = enCurso.tramos[enCurso.tramos.length - 1];
        if (lastTramo.conductor === currentUserId && lastTramo.requiereFotosInicio) {
          requiereFotosInicio = true;
        }
      }
      
      // Si requiereFotosInicio y no tiene fotosInicio, marcamos la reserva con una bandera temporal para UI
      if (enCurso && requiereFotosInicio) {
        (enCurso as any)._requiereFotos = true;
      }

      setActiveReserva(enCurso);

      // Buscar solicitud de traspaso para el RECEPTOR
      const handover = all.find(r => 
        r.estado === 'en_curso' && 
        r.solicitudTraspaso && 
        r.solicitudTraspaso.estado === 'pendiente' && 
        (typeof r.solicitudTraspaso.conductorDestino === 'string' 
          ? r.solicitudTraspaso.conductorDestino === currentUserId 
          : (r.solicitudTraspaso.conductorDestino as any)._id === currentUserId)
      ) ?? null;
      setPendingHandover(handover);

      // Si no hay una en curso, buscar la próxima aprobada
      if (all.length > 0) {
        const now = new Date();
        const proxima = all
          .filter((r) => {
            if (new Date(r.fechaFin) < now) return false;
            if (r.estado === 'aprobada') return true;
            if (r.estado === 'en_transicion') {
              const currentUserId = user.id || (user as any)._id;
              const isCurrentDriver = r.tramos && r.tramos.length > 0 
                ? (typeof r.tramos[r.tramos.length - 1].conductor === 'string' 
                    ? r.tramos[r.tramos.length - 1].conductor === currentUserId 
                    : (r.tramos[r.tramos.length - 1].conductor as any)._id === currentUserId)
                : (typeof r.usuario === 'string' ? r.usuario === currentUserId : (r.usuario as any)._id === currentUserId);
              return isCurrentDriver;
            }
            return false;
          })
          .sort((a, b) => new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime())[0] ?? null;
        setUpcomingReserva(proxima);
      } else {
        setUpcomingReserva(null);
      }

      // Sincronizar estado del GPS
      const tracking = await locationService.isTracking();
      setIsTracking(tracking);

      // Sincronizar inspecciones aleatorias
      const pendingInspections = await inspectionService.getPendingInspections();
      if (pendingInspections.length > 0) {
        setActiveInspection(pendingInspections[0]);
      } else {
        setActiveInspection(null);
      }

      await fetchTimeOffset();
    } catch (err) {
      console.error('Error cargando reservas:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadReservas(true);
  }, []);

  // Recargar al volver a la pantalla
  useFocusEffect(
    useCallback(() => {
      loadReservas();
    }, [])
  );

  const handleStartTrip = async () => {
    const reserva = upcomingReserva;
    if (!reserva) {
      showAlert('Sin reserva', 'No tienes una reserva aprobada para iniciar.');
      return;
    }

    const maxTiempoAntes = new Date(new Date(reserva.fechaInicio).getTime() - 10 * 60000); // 10 mins antes
    if (new Date() < maxTiempoAntes) {
      const horaFormateada = maxTiempoAntes.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      showAlert(
        'Aún es muy pronto',
        `Puedes iniciar el viaje a partir de las ${horaFormateada}.`
      );
      return;
    }

    // Verificar GPS antes de continuar
    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) {
      Alert.alert(
        'GPS Apagado',
        'Debes encender el GPS de tu celular para poder iniciar el viaje.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Ir a Configuración', onPress: () => Linking.openSettings() }
        ]
      );
      return;
    }

    try {
      // Solo navegamos a la cámara. El viaje inicia realmente al subir las fotos.
      navigation.navigate('Camera', { 
        reservaId: reserva._id, 
        tipo: 'salida', 
        tipoIndicador: reserva.vehiculo?.tipoIndicador,
        kilometrajeActual: reserva.vehiculo?.kilometraje || 0 
      });
    } catch (err: any) {
      const msg = err.response?.data?.message ?? 'Error al ir a la cámara.';
      showAlert('Error', msg);
    }
  };

  const handleResumeGps = async () => {
    const reserva = activeReserva;
    if (!reserva) return;
    try {
      // Cancelar solicitud de traspaso si el origen se arrepiente y reanuda
      const currentUserId = user.id || (user as any)._id;
      const isOrigen = reserva.solicitudTraspaso?.estado === 'pendiente' && 
        (typeof reserva.solicitudTraspaso.conductorOrigen === 'string' 
          ? reserva.solicitudTraspaso.conductorOrigen === currentUserId 
          : (reserva.solicitudTraspaso.conductorOrigen as any)?._id === currentUserId);

      if (isOrigen) {
        await reservationService.cancelarTraspaso(reserva._id);
        showAlert('Traspaso cancelado', 'Has reanudado tu viaje y la solicitud de traspaso fue cancelada.');
      }

      const started = await locationService.startTracking(reserva._id);
      if (started) {
        setIsTracking(true);
        if (!isOrigen) showAlert('Éxito', 'GPS reactivado correctamente.');
      } else {
        showAlert('GPS Requerido', 'Por favor enciende el GPS de tu teléfono y asegúrate de haber dado permisos de ubicación.');
      }
    } catch (err: any) {
      showAlert('Error', 'No se pudo reanudar el GPS.');
    }
  };

  const handleCancelUpcoming = async () => {
    if (!cancelReason.trim()) {
      showAlert('Error', 'Debes ingresar un motivo para cancelar la reserva.');
      return;
    }
    if (!upcomingReserva) return;
    
    setCanceling(true);
    try {
      await reservationService.cancel(upcomingReserva._id, cancelReason.trim());
      showAlert('Cancelada', 'La reserva ha sido cancelada exitosamente.');
      setShowCancelModal(false);
      setCancelReason('');
      loadReservas();
    } catch (err: any) {
      showAlert('Error', err.response?.data?.message || 'No se pudo cancelar la reserva.');
    } finally {
      setCanceling(false);
    }
  };

  const handleOpenPasarMando = async () => {
    try {
      setLoadingDrivers(true);
      setShowDriverModal(true);
      const allUsers = await userService.getAll();
      const currentUserId = user.id || user._id;
      setDrivers(allUsers.filter(u => {
        const uid = u.id || u._id;
        return uid !== currentUserId && u.rol !== 'admin';
      }));
    } catch (err) {
      showAlert('Error', 'No se pudieron cargar los conductores');
      setShowDriverModal(false);
    } finally {
      setLoadingDrivers(false);
    }
  };

  const handleConfirmPasarMando = (nuevoConductor: IUser) => {
    if (!activeReserva) return;
    showAlert(
      '¿Pasar el Mando?',
      `El vehículo y el rastreo GPS pasarán a ${nuevoConductor.nombre} ${nuevoConductor.apellido}. Se cerrará tu viaje actual.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Confirmar', 
          onPress: async () => {
            try {
              setLoading(true);
              setShowDriverModal(false);
              await reservationService.requestCambioConductorTramo(activeReserva._id, (nuevoConductor as any)._id);
              await locationService.stopTracking(); // Stop MY tracking while handing over
              setIsTracking(false);
              showAlert('Solicitud enviada', `Se ha notificado a ${nuevoConductor.nombre}. Cuando acepte, el vehículo será transferido.`);
              loadReservas(); // Reload to update state
            } catch (err: any) {
              showAlert('Error', err.response?.data?.message || 'Error al cambiar conductor');
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleRejectHandover = async () => {
    if (!handoverReason.trim()) {
      showAlert('Error', 'Debes ingresar un motivo para rechazar.');
      return;
    }
    setRespondingHandover(true);
    try {
      await reservationService.responderTraspaso(pendingHandover!._id, 'rechazar', undefined, handoverReason.trim());
      showAlert('Traspaso Rechazado', 'Se ha notificado al conductor original.');
      setShowHandoverRejectModal(false);
      setHandoverReason('');
      loadReservas();
    } catch (err: any) {
      showAlert('Error', err.response?.data?.message || 'Error al rechazar');
    } finally {
      setRespondingHandover(false);
    }
  };

  const handleAcceptHandover = async (tipo: 'continuar' | 'regreso') => {
    setRespondingHandover(true);
    try {
      await reservationService.responderTraspaso(pendingHandover!._id, 'aceptar', tipo);
      setShowHandoverAcceptModal(false);
      loadReservas();
      if (tipo === 'continuar') {
         await locationService.startTracking(pendingHandover!._id);
         showAlert('Traspaso Aceptado', 'GPS activado. Continuas el trayecto.');
      } else {
         showAlert('Traspaso Aceptado', 'Inicias el viaje de regreso. Debes tomar las fotos para arrancar el GPS.');
      }
    } catch (err: any) {
      showAlert('Error', err.response?.data?.message || 'Error al aceptar');
    } finally {
      setRespondingHandover(false);
    }
  };

  const handleNavigate = async () => {
    if (!activeReserva?.destino) return;

    const query = encodeURIComponent(activeReserva.destino);
    // URL universal que funciona en iOS y Android para abrir Google Maps
    const url = `https://www.google.com/maps/search/?api=1&query=${query}`;

    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      showAlert('Error', 'No se pudo abrir la aplicación de mapas.');
    }
  };

  const handleEndTrip = () => {
    const reserva = activeReserva;
    if (!reserva) return;
    navigation.navigate('Camera', { 
      reservaId: reserva._id, 
      tipo: 'retorno', 
      tipoIndicador: reserva.vehiculo?.tipoIndicador,
      kilometrajeActual: reserva.vehiculo?.kilometraje || 0 
    });
  };

  const handleTakeInspectionPhoto = async () => {
    if (inspectionPhotos.length >= 5) {
      showAlert('Límite alcanzado', 'Puedes adjuntar un máximo de 5 fotos por respuesta.');
      return;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Permiso denegado', 'Se necesita permiso para usar la cámara.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.5,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      setInspectionPhotos(prev => [...prev, result.assets[0].uri]);
    }
  };

  const handleSubmitInspection = async () => {
    if (!activeInspection) return;
    if (!inspectionText && inspectionPhotos.length === 0) {
      showAlert('Error', 'Debes enviar un comentario o al menos una foto.');
      return;
    }
    
    setSubmittingInspection(true);
      try {
        await inspectionService.respondInspection(activeInspection._id, inspectionText, inspectionPhotos);
        showAlert('Enviado', 'Respuesta de inspección enviada.');
        setInspectionText('');
        setInspectionPhotos([]);
        setActiveInspection(null);
      } catch (err: any) {
      showAlert('Error', err.response?.data?.message || 'Error al enviar inspección');
    } finally {
      setSubmittingInspection(false);
    }
  };



  const vehiculoNombre = (r: IReservation) =>
    r.vehiculo ? `${r.vehiculo.marca} ${r.vehiculo.modelo}` : 'Vehículo';

  const formatFecha = (f: string) =>
    new Date(f).toLocaleDateString('es-CL', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const currentUserIdForRender = user.id || (user as any)._id;
  const isPendingHandoverSender = activeReserva?.solicitudTraspaso?.estado === 'pendiente' && 
     (typeof activeReserva.solicitudTraspaso.conductorOrigen === 'string' 
       ? activeReserva.solicitudTraspaso.conductorOrigen === currentUserIdForRender 
       : (activeReserva.solicitudTraspaso.conductorOrigen as any)?._id === currentUserIdForRender);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
      }
    >
      {/* Bienvenida */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.welcomeTitle}>¡Bienvenido!👋</Text>
          <Text style={styles.welcomeName}>{user.nombre} {user.apellido}</Text>
          <Text style={styles.welcomeRole}>Rol: {user.rol}</Text>
        </View>

        {/* Reloj visible */}
        <View style={styles.clockContainer}>
          <Text style={styles.clockTime}>
            {simulatedTime.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </Text>
          <Text style={styles.clockDate}>
            {simulatedTime.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}
          </Text>
          {serverOffset !== 0 && <Text style={styles.clockDevBadge}>SIMULADO</Text>}
        </View>
      </View>

      {/* Botón DEV (Visible solo para pruebas) */}
      <TouchableOpacity
        style={{ backgroundColor: 'orange', padding: 10, borderRadius: 8, marginVertical: 10, alignItems: 'center' }}
        onPress={() => setDevModalVisible(true)}
      >
        <Text style={{ color: 'white', fontWeight: 'bold' }}>Cambiar Hora del simulador</Text>
      </TouchableOpacity>

      {/* Banner de Inspección Minimizada */}
      {activeInspection && isInspectionMinimized && (
        <TouchableOpacity 
          style={{ backgroundColor: colors.warning, padding: 16, borderRadius: BORDER_RADIUS.lg, marginBottom: 20, flexDirection: 'row', alignItems: 'center', ...SHADOWS.subtleMauve }}
          onPress={() => setIsInspectionMinimized(false)}
        >
          <Ionicons name="warning" size={28} color="#FFF" style={{ marginRight: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16 }}>🚨 Inspección Pendiente</Text>
            <Text style={{ color: '#FFF', fontSize: 13, marginTop: 2 }}>Toca aquí para responderla ahora</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* ── Banner de Solicitud de Traspaso (Flujo Nuevo) ── */}
      {pendingHandover && (
        <Animated.View style={[styles.handoverBanner, { opacity: fadeAnim }]}>
          <View style={styles.handoverBannerContent}>
            <Ionicons name="key" size={28} color="#FFF" style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 15 }}>Transferencia de Mando</Text>
              <Text style={{ color: '#FFF', fontSize: 13, marginTop: 2, opacity: 0.9 }}>
                Un conductor quiere pasarte el mando del vehículo {vehiculoNombre(pendingHandover)}. ¿Aceptas?
              </Text>
            </View>
          </View>
          <View style={styles.handoverBannerActions}>
            <TouchableOpacity style={[styles.btnDangerHalf, { flex: 1, marginRight: 8 }]} onPress={() => setShowHandoverRejectModal(true)}>
              <Text style={styles.btnText}>Rechazar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btnSuccessHalf, { flex: 1 }]} onPress={() => setShowHandoverAcceptModal(true)}>
              <Text style={styles.btnText}>Aceptar</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* Tarjeta de Viaje Activo */}
      {activeReserva ? (
        <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <LinearGradient
            colors={GRADIENTS.primary}
            style={[StyleSheet.absoluteFill, { borderRadius: 16, opacity: 0.1 }]}
          />
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>🚗 VIAJE EN CURSO</Text>
              <Text style={styles.cardVehiculo}>{vehiculoNombre(activeReserva)}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: colors.success + '20' }]}>
              <Text style={[styles.badgeText, { color: colors.success }]}>ACTIVO</Text>
            </View>
          </View>

          <View style={styles.cardBody}>
            <Text style={styles.infoLine}>📍 Destino: <Text style={styles.bold}>{activeReserva.destino}</Text></Text>
            <Text style={styles.infoLine}>🕒 Inicio: <Text style={styles.bold}>{formatFecha(activeReserva.fechaInicio)}</Text></Text>
            <Text style={styles.infoLine}>🏁 Fin: <Text style={styles.bold}>{formatFecha(activeReserva.fechaFin)}</Text></Text>
          </View>

          {(activeReserva as any)._requiereFotos ? (
            <TouchableOpacity 
              style={[styles.btnPrimary, { backgroundColor: colors.secondary }]} 
              onPress={() => {
                navigation.navigate('Camera', { 
                  reservaId: activeReserva._id, 
                  tipo: 'tramo', 
                  tipoIndicador: activeReserva.vehiculo?.tipoIndicador,
                  kilometrajeActual: activeReserva.vehiculo?.kilometraje || 0,
                  isTramoStart: true 
                });
              }}
            >
              <Text style={styles.btnText}>📷 Iniciar Tramo de Regreso</Text>
            </TouchableOpacity>
          ) : (
            !isTracking && (
              <TouchableOpacity style={styles.btnPrimary} onPress={handleResumeGps}>
                <Text style={styles.btnText}>Reanudar GPS</Text>
              </TouchableOpacity>
            )
          )}

          <View style={styles.activeActionsRow}>
            <TouchableOpacity style={styles.btnNav} onPress={handleNavigate}>
              <Text style={styles.btnText}>Navegar</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnDangerHalf} onPress={handleEndTrip}>
              <Text style={styles.btnText}>Finalizar</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={[styles.btnPrimary, { marginTop: 10, backgroundColor: colors.warning }]} 
            onPress={handleOpenPasarMando}
          >
            <Text style={styles.btnText}>Pasar el Mando 🔑</Text>
          </TouchableOpacity>
        </Animated.View>
      ) : upcomingReserva ? (
        <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <LinearGradient
            colors={isDark ? ['#1E1E1E', '#252525'] : ['#FFFFFF', '#F8FAFC']}
            style={[StyleSheet.absoluteFill, { borderRadius: 16 }]}
          />
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Próximo Vehículo Asignado</Text>
              <Text style={styles.cardVehiculo}>{vehiculoNombre(upcomingReserva)}</Text>
            </View>
          </View>
          <Text style={styles.cardInfo}>📍 {upcomingReserva.destino}</Text>
          <Text style={styles.cardInfo}>🕒 Inicio: {formatFecha(upcomingReserva.fechaInicio)}</Text>
          <Text style={styles.cardInfo}>📝 {upcomingReserva.motivo}</Text>

          {new Date().getTime() - new Date(upcomingReserva.fechaInicio).getTime() > 15 * 60000 && (
            <View style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: 10, borderRadius: 8, marginTop: 10 }}>
              <Text style={{ color: colors.danger, fontSize: 13, fontWeight: '600' }}>
                ⚠️ Tu reserva empezó hace {Math.floor((new Date().getTime() - new Date(upcomingReserva.fechaInicio).getTime()) / 60000)} minutos. Podrás iniciarla, pero se registrará una advertencia de demora.
              </Text>
            </View>
          )}

          <TouchableOpacity style={styles.btnPrimary} onPress={handleStartTrip}>
            <Text style={styles.btnText}>🚀 Iniciar Viaje y Activar GPS</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.btnOutline, { marginTop: 10 }]} onPress={() => navigation.navigate('ScanQR')}>
            <Text style={[styles.btnOutlineText, { color: colors.primary }]}>🔍 Verificar Vehículo con QR</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.btnPrimary, { marginTop: 10, backgroundColor: colors.danger }]} 
            onPress={() => setShowCancelModal(true)}
          >
            <Text style={styles.btnText}>Cancelar Reserva</Text>
          </TouchableOpacity>
        </Animated.View>
      ) : (
        <Animated.View style={[styles.centered, { opacity: fadeAnim }]}>
          <Text style={styles.emptyIcon}>🏖️</Text>
          <Text style={styles.emptyText}>No tienes reservas activas ni próximas.</Text>
          <TouchableOpacity 
            style={styles.btnCrearReservaContainer} 
            onPress={() => navigation.navigate('CreateReservation')}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={GRADIENTS.primary}
              style={styles.btnCrearReservaGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="add-circle" size={28} color="#FFF" style={{ marginRight: 10 }} />
              <Text style={styles.btnCrearReservaText}>Nueva Reserva</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.btnCrearReservaContainer, { marginTop: 15 }]} 
            onPress={() => navigation.navigate('ScanQR')}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#10b981', '#059669']}
              style={styles.btnCrearReservaGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.btnCrearReservaIcon}>📷</Text>
              <View style={styles.btnCrearReservaTextContainer}>
                <Text style={styles.btnCrearReservaTitle}>Escanear Código QR</Text>
                <Text style={styles.btnCrearReservaSubtitle}>Crea tu reserva apuntando al vehículo</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Indicador GPS en segundo plano */}
      {isTracking && !isPendingHandoverSender && (
        <View style={styles.gpsStatusBar}>
          <Text style={styles.gpsStatusText}>📍 GPS enviando posición cada 1 minuto • segundo plano activo</Text>
        </View>
      )}

      {/* Indicador de Traspaso Pendiente (Remitente) */}
      {isPendingHandoverSender && (
        <View style={[styles.gpsStatusBar, { backgroundColor: '#fff3cd', borderBottomColor: '#ffeeba' }]}>
          <Text style={[styles.gpsStatusText, { color: '#856404' }]}>⏳ Esperando que el nuevo conductor acepte el mando...</Text>
        </View>
      )}

      {/* ─── Modal DEV Time Machine ─── */}
      <Modal visible={devModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.bottomSheetIndicator} />
            <Text style={styles.modalTitle}>🛠 Máquina del Tiempo</Text>
            <Text style={{ marginBottom: 15, textAlign: 'center', color: colors.textMuted }}>Solo para pruebas. Afecta al backend.</Text>

            <TouchableOpacity style={styles.btnPrimary} onPress={() => changeDevTime(1, 0)}>
              <Text style={styles.btnText}>Adelantar 1 Hora</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.btnPrimary, { marginTop: 10 }]} onPress={() => changeDevTime(3, 0)}>
              <Text style={styles.btnText}>Adelantar 3 Horas</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.btnPrimary, { marginTop: 10 }]} onPress={() => changeDevTime(0, 1)}>
              <Text style={styles.btnText}>Adelantar 1 Día</Text>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 20, marginBottom: 10 }}>
              <TextInput
                style={[styles.kmInput, { flex: 1, marginVertical: 0, marginRight: 10 }]}
                value={manualMinutes}
                onChangeText={setManualMinutes}
                placeholder="Minutos..."
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
              />
              <TouchableOpacity
                style={[styles.btnPrimary, { paddingVertical: 12 }]}
                onPress={() => {
                  const mins = parseInt(manualMinutes, 10);
                  if (!isNaN(mins) && mins > 0) {
                    changeDevTime(0, 0, mins);
                    setManualMinutes('');
                  }
                }}
              >
                <Text style={styles.btnText}>Adelantar</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={[styles.btnDanger, { marginTop: 10 }]} onPress={resetDevTime}>
              <Text style={styles.btnText}>Reiniciar Tiempo Real</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.btnPrimary, { marginTop: 15, backgroundColor: colors.textMuted }]} onPress={() => setDevModalVisible(false)}>
              <Text style={styles.btnText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Modal Rechazo Traspaso ── */}
      <Modal visible={showHandoverRejectModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.bottomSheetIndicator} />
            <Text style={styles.modalTitle}>Rechazar Traspaso</Text>
            <Text style={styles.modalSubtitle}>Indica el motivo por el cual rechazas recibir el vehículo:</Text>
            
            <TextInput
              style={[styles.kmInput, { minHeight: 80, textAlignVertical: 'top', marginTop: 10 }]}
              multiline
              placeholder="Ej: No me encuentro en la oficina..."
              placeholderTextColor={colors.textMuted}
              value={handoverReason}
              onChangeText={setHandoverReason}
            />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
              <TouchableOpacity 
                style={[styles.btnOutline, { flex: 1, marginRight: 10 }]} 
                onPress={() => setShowHandoverRejectModal(false)}
                disabled={respondingHandover}
              >
                <Text style={[styles.btnOutlineText, { color: colors.primary }]}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.btnDangerHalf, { flex: 1 }]} 
                onPress={handleRejectHandover}
                disabled={respondingHandover}
              >
                {respondingHandover ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>Rechazar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Modal Aceptar Traspaso (Continuar o Regresar) ── */}
      <Modal visible={showHandoverAcceptModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.bottomSheetIndicator} />
            <Text style={styles.modalTitle}>Aceptar Vehículo</Text>
            <Text style={styles.modalSubtitle}>Has aceptado recibir el vehículo. ¿Cómo continuarás el trayecto?</Text>
            
            <TouchableOpacity 
              style={[styles.btnPrimary, { marginTop: 20 }]} 
              onPress={() => handleAcceptHandover('continuar')}
              disabled={respondingHandover}
            >
              <Text style={styles.btnText}>Continuar Mismo Trayecto</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.btnPrimary, { marginTop: 15, backgroundColor: colors.secondary }]} 
              onPress={() => handleAcceptHandover('regreso')}
              disabled={respondingHandover}
            >
              <Text style={styles.btnText}>Viaje de Regreso (Fotos IA)</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.btnOutline, { marginTop: 20 }]} 
              onPress={() => setShowHandoverAcceptModal(false)}
              disabled={respondingHandover}
            >
              <Text style={[styles.btnOutlineText, { color: colors.primary }]}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── Modal Pasar el Mando ─── */}
      <Modal visible={showDriverModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.bottomSheetIndicator} />
            <Text style={styles.modalTitle}>Seleccionar Conductor</Text>
            {loadingDrivers ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 20 }} />
            ) : (
              <ScrollView style={{ maxHeight: 300, width: '100%' }}>
                {drivers.length === 0 && (
                  <Text style={{ textAlign: 'center', marginTop: 20, color: colors.textMuted }}>No hay conductores disponibles</Text>
                )}
                {drivers.map(d => (
                  <TouchableOpacity
                    key={d.id}
                    style={{ padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee', width: '100%' }}
                    onPress={() => handleConfirmPasarMando(d)}
                  >
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.text }}>{d.nombre} {d.apellido}</Text>
                    <Text style={{ fontSize: 13, color: colors.textMuted }}>{d.departamento || 'Sin departamento'}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            <TouchableOpacity 
              style={[styles.btnPrimary, { marginTop: 15, backgroundColor: colors.textMuted, width: '100%' }]} 
              onPress={() => setShowDriverModal(false)}
            >
              <Text style={styles.btnText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── Modal Inspección Aleatoria ─── */}
      <Modal visible={!!activeInspection && !isInspectionMinimized} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { paddingHorizontal: 25, paddingBottom: Platform.OS === 'ios' ? 40 : 25 }]}>
            <View style={styles.bottomSheetIndicator} />
            <Text style={[styles.modalTitle, { color: colors.primary, fontSize: 20 }]}>🚨 Inspección Aleatoria</Text>
            
            <View style={{ backgroundColor: colors.danger + '15', padding: 10, borderRadius: 8, marginBottom: 15, width: '100%', alignItems: 'center' }}>
              <Text style={{ fontSize: 14, color: colors.danger, fontWeight: 'bold' }}>
                Tiempo límite: {activeInspection ? new Date(activeInspection.fechaLimite).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : ''}
              </Text>
            </View>

            <Text style={{ textAlign: 'center', marginBottom: 20, fontSize: 16, color: colors.text, fontWeight: '500' }}>
              {activeInspection?.descripcion}
            </Text>

            <TextInput
              style={[styles.kmInput, { minHeight: 80, textAlignVertical: 'top', width: '100%', marginBottom: 15, backgroundColor: colors.background }]}
              placeholder="Añadir un comentario o reporte..."
              placeholderTextColor={colors.textMuted}
              multiline
              value={inspectionText}
              onChangeText={setInspectionText}
            />

            {inspectionPhotos.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15, width: '100%' }}>
                {inspectionPhotos.map((uri, idx) => (
                  <View key={idx} style={{ marginRight: 12, position: 'relative', marginTop: 8 }}>
                    <Image source={{ uri }} style={{ width: 75, height: 75, borderRadius: 10 }} />
                    <TouchableOpacity 
                      style={{ position: 'absolute', top: -8, right: -8, backgroundColor: colors.danger, borderRadius: 12, padding: 4 }}
                      onPress={() => setInspectionPhotos(prev => prev.filter((_, i) => i !== idx))}
                    >
                      <Ionicons name="close" size={14} color="white" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}

            <View style={{ flexDirection: 'row', width: '100%', gap: 15, marginBottom: 20 }}>
              <TouchableOpacity 
                style={[styles.btnPrimary, { flex: 1, backgroundColor: inspectionPhotos.length >= 5 ? colors.border : colors.secondary }]} 
                onPress={handleTakeInspectionPhoto}
                disabled={inspectionPhotos.length >= 5}
              >
                <Text style={styles.btnText}>📸 {inspectionPhotos.length}/5 Fotos</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.btnPrimary, { flex: 1 }]} 
                onPress={handleSubmitInspection}
                disabled={submittingInspection}
              >
                {submittingInspection ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.btnText}>Enviar</Text>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={{ width: '100%', alignItems: 'center', paddingVertical: 10 }}
              onPress={() => setIsInspectionMinimized(true)}
              disabled={submittingInspection}
            >
              <Text style={{ color: colors.textMuted, fontWeight: 'bold', fontSize: 15 }}>Minimizar para luego</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── Modal Cancelar Reserva ─── */}
      <Modal visible={showCancelModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.bottomSheetIndicator} />
            <Text style={styles.modalTitle}>Cancelar Reserva</Text>
            <Text style={{ textAlign: 'center', marginBottom: 15 }}>
              Por favor, ingresa el motivo por el cual deseas cancelar esta reserva.
            </Text>
            <TextInput
              style={[styles.kmInput, { minHeight: 60, textAlignVertical: 'top', width: '100%', marginBottom: 15 }]}
              placeholder="Escribe el motivo aquí..."
              placeholderTextColor={colors.textMuted}
              multiline
              value={cancelReason}
              onChangeText={setCancelReason}
            />
            <View style={{ flexDirection: 'row', width: '100%', gap: 10 }}>
              <TouchableOpacity 
                style={[styles.btnPrimary, { flex: 1, backgroundColor: colors.textMuted }]} 
                onPress={() => { setShowCancelModal(false); setCancelReason(''); }}
                disabled={canceling}
              >
                <Text style={styles.btnText}>Volver</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.btnPrimary, { flex: 1, backgroundColor: colors.danger }]} 
                onPress={handleCancelUpcoming}
                disabled={canceling}
              >
                {canceling ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Confirmar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

const getStyles = (colors: AppColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 2,
  },
  welcomeName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 2,
  },
  welcomeRole: {
    fontSize: 13,
    color: colors.textMuted,
    textTransform: 'capitalize',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  clockContainer: {
    alignItems: 'flex-end',
    backgroundColor: colors.background,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  clockTime: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    fontVariant: ['tabular-nums'],
  },
  clockDate: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  clockDevBadge: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#FFF',
    backgroundColor: '#FFA500',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
    overflow: 'hidden',
  },
  welcomeDept: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 20,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardActive: {
    borderLeftWidth: 5,
    borderLeftColor: colors.success,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  cardVehiculo: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  cardBody: {
    marginTop: 15,
  },
  infoLine: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 6,
  },
  bold: {
    fontWeight: '600',
    color: colors.text,
  },
  cardVehicle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  cardInfo: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
    marginBottom: 16,
  },
  gpsIndicator: {
    backgroundColor: colors.success + '20',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  gpsIndicatorText: {
    fontSize: 11,
    color: colors.success,
  },
  btnPrimary: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    marginTop: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activeActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 15,
  },
  btnNav: {
    flex: 1,
    backgroundColor: colors.primaryDark,
    paddingVertical: 14,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  btnDangerHalf: {
    flex: 1,
    backgroundColor: colors.danger,
    paddingVertical: 14,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  btnSuccessHalf: {
    flex: 1,
    backgroundColor: colors.success,
    paddingVertical: 14,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  btnDanger: {
    backgroundColor: colors.danger,
    borderRadius: BORDER_RADIUS.md,
    padding: 14,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  btnText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 15,
  },
  gpsStatusBar: {
    backgroundColor: colors.success + '20',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  gpsStatusText: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '600',
  },
  // Modal de km retorno
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.white,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    padding: 28,
    paddingTop: 16,
    paddingBottom: 40,
    ...SHADOWS.elegant,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 10,
    lineHeight: 20,
  },
  modalHint: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: 12,
    backgroundColor: colors.primary + '20',
    padding: 8,
    borderRadius: 6,
  },
  kmInput: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 10,
    padding: 14,
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  kmCalculated: {
    fontSize: 14,
    color: colors.success,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
    backgroundColor: colors.success + '20',
    padding: 8,
    borderRadius: 6,
  },
  modalBtns: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  modalBtnCancel: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  modalBtnCancelText: {
    color: colors.textMuted,
    fontWeight: '600',
    fontSize: 15,
  },
  modalBtnConfirm: {
    flex: 2,
    backgroundColor: colors.danger,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  modalBtnConfirmText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 15,
  },
  btnOutline: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnOutlineText: {
    fontWeight: 'bold',
    fontSize: 15,
  },
  btnCrearReservaContainer: {
    width: '100%',
    marginTop: 15,
    borderRadius: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  btnCrearReservaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
  },
  btnCrearReservaText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  btnCrearReservaIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  btnCrearReservaTextContainer: {
    flexDirection: 'column',
  },
  btnCrearReservaTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  btnCrearReservaSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  handoverBanner: {
    backgroundColor: colors.secondary,
    borderRadius: BORDER_RADIUS.lg,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  handoverBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  handoverBannerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bottomSheetIndicator: {
    width: 40,
    height: 5,
    backgroundColor: colors.border,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 20,
  }
});
