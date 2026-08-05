import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, Modal, ScrollView, RefreshControl, Linking } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../constants';
import { useAlert } from '../context/AlertContext';
import { locationService } from '../services/location.service';
import { reservationService, IReservation } from '../services/reservation.service';
import { userService } from '../services/user.service';
import { inspectionService, IInspeccion } from '../services/inspection.service';
import { IUser } from '../types';
import api from '../services/api';
import * as ImagePicker from 'expo-image-picker';

export default function HomeScreen({ route, navigation }: any) {
  const { showAlert } = useAlert();
  const { user } = route.params;

  const [activeReserva, setActiveReserva] = useState<IReservation | null>(null);
  const [upcomingReserva, setUpcomingReserva] = useState<IReservation | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [activeInspection, setActiveInspection] = useState<IInspeccion | null>(null);
  const [inspectionPhoto, setInspectionPhoto] = useState<string | null>(null);
  const [inspectionText, setInspectionText] = useState('');
  const [submittingInspection, setSubmittingInspection] = useState(false);

  // Modal DEV para Máquina del Tiempo
  const [devModalVisible, setDevModalVisible] = useState(false);
  const [manualMinutes, setManualMinutes] = useState('');
  const [serverOffset, setServerOffset] = useState(0);
  const [simulatedTime, setSimulatedTime] = useState(new Date());

  const [showDriverModal, setShowDriverModal] = useState(false);
  const [drivers, setDrivers] = useState<IUser[]>([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);

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

      // Buscar reserva en_curso (viaje activo)
      const enCurso = all.find((r) => r.estado === 'en_curso') ?? null;
      setActiveReserva(enCurso);

      // Si no hay una en curso, buscar la próxima aprobada
      if (!enCurso) {
        const now = new Date();
        const proxima = all
          .filter((r) => r.estado === 'aprobada' && new Date(r.fechaInicio) >= now)
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
    const reserva = activeReserva ?? upcomingReserva;
    if (!reserva) {
      showAlert('Sin reserva', 'No tienes una reserva aprobada para iniciar.');
      return;
    }

    try {
      // 1. Cambiar la reserva a 'en_curso' en el backend ANTES de activar el GPS
      if (reserva.estado === 'aprobada') {
        await reservationService.startReservation(reserva._id);
      }

      // 2. Activar el GPS en segundo plano con el ID de la reserva activa
      const started = await locationService.startTracking(reserva._id);
      if (started) {
        setIsTracking(true);
        navigation.navigate('Camera', { reservaId: reserva._id, tipo: 'salida', tipoIndicador: reserva.vehiculo?.tipoIndicador });
      } else {
        showAlert(
          'GPS Requerido',
          'Debes activar el GPS y dar permiso de ubicación "Todo el tiempo" (Always) para iniciar el viaje.\n\nPor favor, enciende el GPS de tu teléfono.'
        );
      }
    } catch (err: any) {
      const msg = err.response?.data?.message ?? 'Error al iniciar el viaje.';
      showAlert('Error', msg);
    }
  };

  const handleOpenPasarMando = async () => {
    try {
      setLoadingDrivers(true);
      setShowDriverModal(true);
      const allUsers = await userService.getAll();
      setDrivers(allUsers.filter(u => u.id !== user.id && u.rol !== 'admin'));
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
    navigation.navigate('Camera', { reservaId: reserva._id, tipo: 'retorno', tipoIndicador: reserva.vehiculo?.tipoIndicador });
  };

  const handleTakeInspectionPhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Permisos denegados', 'Necesitas dar acceso a la cámara para tomar la foto.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
    });

    if (!result.canceled) {
      setInspectionPhoto(result.assets[0].uri);
    }
  };

  const handleSubmitInspection = async () => {
    if (!activeInspection) return;
    if (!inspectionText && !inspectionPhoto) {
      showAlert('Faltan datos', 'Debes enviar al menos un texto o una foto.');
      return;
    }

    try {
      setSubmittingInspection(true);
      await inspectionService.respondInspection(activeInspection._id, inspectionText, inspectionPhoto || undefined);
      showAlert('¡Gracias!', 'Inspección enviada correctamente.');
      setActiveInspection(null);
      setInspectionPhoto(null);
      setInspectionText('');
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
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
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

      {/* Tarjeta de Viaje Activo */}
      {activeReserva ? (
        <View style={[styles.card, styles.cardActive]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardLabel}>🚗 VIAJE EN CURSO</Text>
            {isTracking && (
              <View style={styles.gpsIndicator}>
                <Text style={styles.gpsIndicatorText}>📡 GPS Activo</Text>
              </View>
            )}
          </View>
          <Text style={styles.cardVehicle}>{vehiculoNombre(activeReserva)}</Text>
          <Text style={styles.cardInfo}>📍 {activeReserva.destino}</Text>
          <Text style={styles.cardInfo}>⏱ Hasta: {formatFecha(activeReserva.fechaFin)}</Text>

          {!isTracking && (
            <TouchableOpacity style={styles.btnPrimary} onPress={handleStartTrip}>
              <Text style={styles.btnText}>Reanudar GPS</Text>
            </TouchableOpacity>
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
            style={[styles.btnPrimary, { marginTop: 10, backgroundColor: COLORS.warning }]} 
            onPress={handleOpenPasarMando}
          >
            <Text style={styles.btnText}>Pasar el Mando 🔑</Text>
          </TouchableOpacity>
        </View>
      ) : upcomingReserva ? (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>📅 PRÓXIMA RESERVA</Text>
          <Text style={styles.cardVehicle}>{vehiculoNombre(upcomingReserva)}</Text>
          <Text style={styles.cardInfo}>📍 {upcomingReserva.destino}</Text>
          <Text style={styles.cardInfo}>🕐 Inicio: {formatFecha(upcomingReserva.fechaInicio)}</Text>
          <Text style={styles.cardInfo}>📝 {upcomingReserva.motivo}</Text>

          <TouchableOpacity style={styles.btnPrimary} onPress={handleStartTrip}>
            <Text style={styles.btnText}>▶ Iniciar Viaje y Activar GPS</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>📋 SIN RESERVAS PRÓXIMAS</Text>
          <Text style={styles.cardSub}>No tienes viajes programados. Puedes crear una nueva reserva desde la pestaña "Reservas".</Text>
          <TouchableOpacity style={styles.btnPrimary} onPress={() => navigation.navigate('CreateReservation')}>
            <Text style={styles.btnText}>+ Crear Reserva</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Indicador GPS en segundo plano */}
      {isTracking && (
        <View style={styles.gpsStatusBar}>
          <Text style={styles.gpsStatusText}>📡 GPS enviando posición cada 3 min • segundo plano activo</Text>
        </View>
      )}

      {/* ─── Modal DEV Time Machine ─── */}
      <Modal visible={devModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>🕒 Máquina del Tiempo</Text>
            <Text style={{ marginBottom: 15, textAlign: 'center', color: COLORS.textMuted }}>Solo para pruebas. Afecta al backend.</Text>

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
                placeholderTextColor={COLORS.textMuted}
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

            <TouchableOpacity style={[styles.btnPrimary, { marginTop: 15, backgroundColor: COLORS.textMuted }]} onPress={() => setDevModalVisible(false)}>
              <Text style={styles.btnText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── Modal Pasar el Mando ─── */}
      <Modal visible={showDriverModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Seleccionar Conductor</Text>
            {loadingDrivers ? (
              <ActivityIndicator size="large" color={COLORS.primary} style={{ marginVertical: 20 }} />
            ) : (
              <ScrollView style={{ maxHeight: 300, width: '100%' }}>
                {drivers.length === 0 && (
                  <Text style={{ textAlign: 'center', marginTop: 20, color: COLORS.textMuted }}>No hay conductores disponibles</Text>
                )}
                {drivers.map(d => (
                  <TouchableOpacity
                    key={d.id}
                    style={{ padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee', width: '100%' }}
                    onPress={() => handleConfirmPasarMando(d)}
                  >
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: COLORS.text }}>{d.nombre} {d.apellido}</Text>
                    <Text style={{ fontSize: 13, color: COLORS.textMuted }}>{d.departamento || 'Sin departamento'}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            <TouchableOpacity 
              style={[styles.btnPrimary, { marginTop: 15, backgroundColor: COLORS.textMuted, width: '100%' }]} 
              onPress={() => setShowDriverModal(false)}
            >
              <Text style={styles.btnText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── Modal Inspección Aleatoria ─── */}
      <Modal visible={!!activeInspection} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>🚨 Inspección Aleatoria</Text>
            <Text style={{ fontSize: 16, color: COLORS.danger, fontWeight: 'bold', marginBottom: 5 }}>
              Tiempo límite: {activeInspection ? new Date(activeInspection.fechaLimite).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : ''}
            </Text>
            <Text style={{ textAlign: 'center', marginBottom: 20, fontSize: 15 }}>
              {activeInspection?.descripcion}
            </Text>

            <TextInput
              style={[styles.kmInput, { minHeight: 60, textAlignVertical: 'top', width: '100%', marginBottom: 15 }]}
              placeholder="Escribe un comentario o reporte..."
              placeholderTextColor={COLORS.textMuted}
              multiline
              value={inspectionText}
              onChangeText={setInspectionText}
            />

            <View style={{ flexDirection: 'row', width: '100%', gap: 10, marginBottom: 15 }}>
              <TouchableOpacity style={[styles.btnPrimary, { flex: 1, backgroundColor: inspectionPhoto ? COLORS.success : COLORS.primaryDark }]} onPress={handleTakeInspectionPhoto}>
                <Text style={styles.btnText}>{inspectionPhoto ? '📸 Foto Lista (Reemplazar)' : '📸 Tomar Foto'}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={[styles.btnPrimary, { width: '100%' }]} 
              onPress={handleSubmitInspection}
              disabled={submittingInspection}
            >
              {submittingInspection ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.btnText}>Enviar Reporte</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
    backgroundColor: COLORS.background,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 2,
  },
  welcomeName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 2,
  },
  welcomeRole: {
    fontSize: 13,
    color: COLORS.textMuted,
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
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  clockTime: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    fontVariant: ['tabular-nums'],
  },
  clockDate: {
    fontSize: 12,
    color: COLORS.textMuted,
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
    color: COLORS.textMuted,
    marginBottom: 20,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 4,
  },
  cardActive: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.success,
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
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  cardVehicle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  cardInfo: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 14,
    color: COLORS.textMuted,
    lineHeight: 20,
    marginBottom: 16,
  },
  gpsIndicator: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  gpsIndicatorText: {
    fontSize: 11,
    color: COLORS.success,
    marginTop: 15,
  },
  btnPrimary: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
  },
  activeActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 15,
  },
  btnNav: {
    flex: 1,
    backgroundColor: COLORS.primaryDark,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnDangerHalf: {
    flex: 1,
    backgroundColor: COLORS.danger,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnDanger: {
    backgroundColor: COLORS.danger,
    borderRadius: 9,
    padding: 13,
    alignItems: 'center',
    marginTop: 8,
  },
  btnText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 15,
  },
  gpsStatusBar: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  gpsStatusText: {
    fontSize: 12,
    color: COLORS.success,
    fontWeight: '600',
  },
  // Modal de km retorno
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 36,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 10,
    lineHeight: 20,
  },
  modalHint: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
    marginBottom: 12,
    backgroundColor: '#EBF5FB',
    padding: 8,
    borderRadius: 6,
  },
  kmInput: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: 10,
    padding: 14,
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  kmCalculated: {
    fontSize: 14,
    color: COLORS.success,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
    backgroundColor: '#E8F5E9',
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
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  modalBtnCancelText: {
    color: COLORS.textMuted,
    fontWeight: '600',
    fontSize: 15,
  },
  modalBtnConfirm: {
    flex: 2,
    backgroundColor: COLORS.danger,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  modalBtnConfirmText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 15,
  },
});
