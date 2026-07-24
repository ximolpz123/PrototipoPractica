import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../constants';
import { reservationService, IReservation } from '../services/reservation.service';

const ESTADO_MAP: Record<string, { label: string; color: string }> = {
  pendiente: { label: 'Pendiente', color: '#F57F17' },
  aprobada: { label: 'Aprobada', color: COLORS.primary },
  en_curso: { label: 'En Curso', color: '#2E7D32' },
  completada: { label: 'Completada', color: COLORS.textMuted },
  cancelada: { label: 'Cancelada', color: COLORS.danger },
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
}

export default function MisReservasScreen({ navigation }: any) {
  const [reservations, setReservations] = useState<IReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReservations = async () => {
    try {
      setError(null);
      const data = await reservationService.getMyReservations();
      setReservations(data);
    } catch (err: any) {
      setError('No se pudo cargar las reservas. Revisa tu conexión.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Recarga al volver a esta pantalla (ej: después de crear una reserva)
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchReservations();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchReservations();
  };

  const renderItem = ({ item }: { item: IReservation }) => {
    const estado = ESTADO_MAP[item.estado] ?? { label: item.estado, color: COLORS.textMuted };
    const vehiculo = item.vehiculo
      ? `${item.vehiculo.marca} ${item.vehiculo.modelo}`
      : 'Vehículo desconocido';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.vehicleTitle}>{vehiculo}</Text>
          <Text style={[styles.statusBadge, { color: estado.color }]}>{estado.label}</Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.infoText}>📅 {formatDate(item.fechaInicio)} → {formatDate(item.fechaFin)}</Text>
          <Text style={styles.infoText}>⏱ {formatTime(item.fechaInicio)} - {formatTime(item.fechaFin)}</Text>
          <Text style={styles.infoText}>📍 {item.destino}</Text>
          {item.motivo ? <Text style={styles.infoText} numberOfLines={1}>📝 {item.motivo}</Text> : null}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando reservas...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchReservations}>
          <Text style={styles.retryBtnText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Mis Reservas</Text>
          <Text style={styles.subtitle}>{reservations.length} reserva(s) registrada(s)</Text>
        </View>
        <TouchableOpacity style={styles.newBtn} onPress={() => navigation.navigate('CreateReservation')}>
          <Text style={styles.newBtnText}>+ Nueva</Text>
        </TouchableOpacity>
      </View>

      {reservations.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyText}>No tienes reservas aún</Text>
          <TouchableOpacity style={styles.newBtn} onPress={() => navigation.navigate('CreateReservation')}>
            <Text style={styles.newBtnText}>Crear mi primera reserva</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={reservations}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 20,
  },
  centered: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textMuted,
    fontSize: 14,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  retryBtnText: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textMuted,
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  newBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  newBtnText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  vehicleTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
  },
  statusBadge: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 8,
  },
  cardBody: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    gap: 4,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
});


const RESERVATIONS = [
  { id: '1', vehiculo: 'SUV Nissan', fecha: '21 Jul, 2026', hora: '10:00 - 12:00', estado: 'Activa' },
  { id: '2', vehiculo: 'Camioneta Blanca', fecha: '19 Jul, 2026', hora: '08:30 - 14:00', estado: 'Completada' },
  { id: '3', vehiculo: 'Auto Café', fecha: '15 Jul, 2026', hora: '15:00 - 17:00', estado: 'Cancelada' },
];

export default function MisReservasScreen({ navigation }: any) {
  const renderItem = ({ item }: any) => {
    let statusColor = COLORS.textMuted;
    if (item.estado === 'Activa') statusColor = COLORS.success || '#4CD964';
    if (item.estado === 'Cancelada') statusColor = COLORS.error || '#FF3B30';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.vehicleTitle}>{item.vehiculo}</Text>
          <Text style={[styles.statusBadge, { color: statusColor }]}>{item.estado}</Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.infoText}>📅 {item.fecha}</Text>
          <Text style={styles.infoText}>⏱ {item.hora}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Mis Reservas</Text>
          <Text style={styles.subtitle}>Tu historial de viajes</Text>
        </View>
        <TouchableOpacity style={styles.newBtn} onPress={() => navigation.navigate('CreateReservation')}>
          <Text style={styles.newBtnText}>+ Nueva</Text>
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={RESERVATIONS}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  newBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  newBtnText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  vehicleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  statusBadge: {
    fontSize: 13,
    fontWeight: '600',
  },
  cardBody: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
});
