import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
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

  const loadReservas = async () => {
    try {
      setLoading(true);
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
    }
  };

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

  const handleEndTrip = async () => {
    const reserva = activeReserva;
    if (!reserva) return;

    Alert.alert(
      'Finalizar Viaje',
      '¿Estás seguro que quieres terminar el viaje y apagar el GPS?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Finalizar',
          style: 'destructive',
          onPress: async () => {
            await locationService.stopTracking();
            setIsTracking(false);
            navigation.navigate('Camera', { reservaId: reserva._id, tipo: 'retorno' });
          },
        },
      ]
    );
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
    <View style={styles.container}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 20,
    paddingTop: 24,
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
});
