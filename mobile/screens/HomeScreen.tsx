import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, TextInput, Modal, ScrollView, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../constants';
import { locationService } from '../services/location.service';
import { reservationService, IReservation } from '../services/reservation.service';

export default function HomeScreen({ route, navigation }: any) {
  const { user } = route.params;

  const [activeReserva, setActiveReserva] = useState<IReservation | null>(null);
  const [upcomingReserva, setUpcomingReserva] = useState<IReservation | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Estado para el modal de kilometraje de retorno
  const [showKmModal, setShowKmModal] = useState(false);
  const [kmRetornoInput, setKmRetornoInput] = useState('');
  const [completingTrip, setCompletingTrip] = useState(false);

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
      Alert.alert('Sin reserva', 'No tienes una reserva aprobada para iniciar.');
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
        navigation.navigate('Camera', { reservaId: reserva._id, tipo: 'salida' });
      } else {
        Alert.alert(
          'Permiso requerido',
          'Necesitas dar permiso de ubicación "Todo el tiempo" (Always) para que el GPS funcione en segundo plano.\n\nVe a Ajustes > Aplicaciones > Expo Go > Permisos > Ubicación > Siempre.'
        );
      }
    } catch (err: any) {
      const msg = err.response?.data?.message ?? 'Error al iniciar el viaje.';
      Alert.alert('Error', msg);
    }
  };

  const handleEndTrip = () => {
    // Abrir modal para ingresar kmRetorno
    setKmRetornoInput('');
    setShowKmModal(true);
  };

  const handleConfirmEndTrip = async () => {
    const reserva = activeReserva;
    if (!reserva) return;

    const km = parseInt(kmRetornoInput, 10);
    if (isNaN(km) || km < 0) {
      Alert.alert('Kilometraje inválido', 'Ingresa un número válido de kilómetros.');
      return;
    }
    if (reserva.kmSalida !== undefined && km < reserva.kmSalida) {
      Alert.alert(
        'Kilometraje inválido',
        `El odómetro de retorno (${km} km) no puede ser menor al de salida (${reserva.kmSalida} km).`
      );
      return;
    }

    try {
      setCompletingTrip(true);
      // 1. Completar la reserva en el backend (guarda kmRetorno y actualiza km del vehículo)
      await reservationService.completeReservation(reserva._id, km);
      // 2. Detener GPS
      await locationService.stopTracking();
      setIsTracking(false);
      setShowKmModal(false);
      // 3. Navegar a la cámara para fotos de retorno
      navigation.navigate('Camera', { reservaId: reserva._id, tipo: 'retorno' });
      // 4. Recargar la pantalla
      loadReservas();
    } catch (err: any) {
      const msg = err.response?.data?.message ?? 'Error al finalizar el viaje.';
      Alert.alert('Error', msg);
    } finally {
      setCompletingTrip(false);
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
      <Text style={styles.welcomeTitle}>¡Bienvenido! 👋</Text>
      <Text style={styles.welcomeName}>{user.nombre} {user.apellido}</Text>
      <Text style={styles.welcomeRole}>Rol: {user.rol}</Text>
      <Text style={styles.welcomeDept}>Departamento: {user.departamento}</Text>

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
              <Text style={styles.btnText}>▶ Reanudar GPS</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.btnDanger} onPress={handleEndTrip}>
            <Text style={styles.btnText}>⏹ Finalizar Viaje</Text>
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

      {/* Modal: Ingresar km de retorno al finalizar viaje */}
      <Modal visible={showKmModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>🛞 Odómetro de Retorno</Text>
            <Text style={styles.modalSubtitle}>
              Ingresa los kilómetros que marca el vehículo en este momento.
            </Text>
            {activeReserva?.kmSalida !== undefined && (
              <Text style={styles.modalHint}>
                📤 Al salir: {activeReserva.kmSalida.toLocaleString()} km
              </Text>
            )}
            <TextInput
              style={styles.kmInput}
              value={kmRetornoInput}
              onChangeText={setKmRetornoInput}
              placeholder="Ej: 12450"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              autoFocus
            />
            {kmRetornoInput && activeReserva?.kmSalida !== undefined && (
              <Text style={styles.kmCalculated}>
                📏 Km recorridos: {Math.max(0, parseInt(kmRetornoInput || '0', 10) - activeReserva.kmSalida).toLocaleString()} km
              </Text>
            )}
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.modalBtnCancel}
                onPress={() => setShowKmModal(false)}
                disabled={completingTrip}
              >
                <Text style={styles.modalBtnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtnConfirm, completingTrip && { opacity: 0.6 }]}
                onPress={handleConfirmEndTrip}
                disabled={completingTrip}
              >
                {completingTrip
                  ? <ActivityIndicator color={COLORS.white} />
                  : <Text style={styles.modalBtnConfirmText}>Finalizar Viaje</Text>
                }
              </TouchableOpacity>
            </View>
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
    fontWeight: '700',
  },
  btnPrimary: {
    backgroundColor: COLORS.primary,
    borderRadius: 9,
    padding: 13,
    alignItems: 'center',
    marginTop: 12,
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
