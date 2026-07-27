import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl, ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants';
import { reservationService, IReservation } from '../services/reservation.service';

const ESTADO_COLOR: Record<string, string> = {
  pendiente: COLORS.warning,
  aprobada: COLORS.primary,
  en_curso: COLORS.success,
  completada: COLORS.textMuted,
  cancelada: COLORS.danger,
};

function formatFecha(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-CL', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function AdminDashboardScreen({ navigation }: any) {
  const [reservas, setReservas] = useState<IReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<'pendiente' | 'todas'>('pendiente');

  const cargarReservas = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const todas = await reservationService.getAllReservations();
      setReservas(todas);
    } catch (err) {
      Alert.alert('Error', 'No se pudieron cargar las reservas.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      cargarReservas();
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    cargarReservas(true);
  }, []);

  const handleUpdateEstado = async (id: string, nuevoEstado: 'aprobada' | 'cancelada') => {
    const accion = nuevoEstado === 'aprobada' ? 'aprobar' : 'rechazar';
    Alert.alert(
      `¿${nuevoEstado === 'aprobada' ? 'Aprobar' : 'Rechazar'} reserva?`,
      `¿Seguro que deseas ${accion} esta solicitud?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          style: nuevoEstado === 'cancelada' ? 'destructive' : 'default',
          onPress: async () => {
            setActionLoading(id);
            try {
              await reservationService.updateStatus(id, nuevoEstado);
              await cargarReservas(true);
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.message ?? 'No se pudo actualizar el estado.');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  // KPIs
  const pendientes = reservas.filter((r) => r.estado === 'pendiente');
  const enCurso = reservas.filter((r) => r.estado === 'en_curso');
  const hoy = new Date().toDateString();
  const hoyCompletadas = reservas.filter(
    (r) => r.estado === 'completada' && new Date(r.createdAt).toDateString() === hoy
  );

  const listaFiltrada = filtro === 'pendiente' ? pendientes : reservas;

  const renderReserva = ({ item }: { item: IReservation }) => {
    const color = ESTADO_COLOR[item.estado] ?? COLORS.textMuted;
    const vehiculo = item.vehiculo
      ? `${item.vehiculo.marca} ${item.vehiculo.modelo} · ${item.vehiculo.placa}`
      : 'Vehículo desconocido';
    const conductor = item.usuario
      ? `${item.usuario.nombre} ${item.usuario.apellido}`
      : 'Usuario desconocido';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardConductor}>{conductor}</Text>
            <Text style={styles.cardVehiculo}>{vehiculo}</Text>
          </View>
          <View style={[styles.estadoBadge, { backgroundColor: color + '20' }]}>
            <Text style={[styles.estadoText, { color }]}>
              {item.estado.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.infoLine}>📅 {formatFecha(item.fechaInicio)} → {formatFecha(item.fechaFin)}</Text>
          <Text style={styles.infoLine}>📍 {item.destino}</Text>
          {item.motivo ? <Text style={styles.infoLine}>📝 {item.motivo}</Text> : null}
        </View>

        {item.estado === 'pendiente' && (
          <View style={styles.actionRow}>
            {actionLoading === item._id ? (
              <ActivityIndicator color={COLORS.primary} />
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.approveBtn]}
                  onPress={() => handleUpdateEstado(item._id, 'aprobada')}
                >
                  <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                  <Text style={styles.actionBtnText}>Aprobar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.rejectBtn]}
                  onPress={() => handleUpdateEstado(item._id, 'cancelada')}
                >
                  <Ionicons name="close-circle-outline" size={16} color="#fff" />
                  <Text style={styles.actionBtnText}>Rechazar</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* KPIs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.kpiScroll}
        contentContainerStyle={styles.kpiContainer}
      >
        <View style={[styles.kpiCard, { borderLeftColor: COLORS.warning }]}>
          <Text style={styles.kpiNum}>{pendientes.length}</Text>
          <Text style={styles.kpiLabel}>Pendientes</Text>
        </View>
        <View style={[styles.kpiCard, { borderLeftColor: COLORS.success }]}>
          <Text style={styles.kpiNum}>{enCurso.length}</Text>
          <Text style={styles.kpiLabel}>En Ruta</Text>
        </View>
        <View style={[styles.kpiCard, { borderLeftColor: COLORS.primary }]}>
          <Text style={styles.kpiNum}>{hoyCompletadas.length}</Text>
          <Text style={styles.kpiLabel}>Finalizadas Hoy</Text>
        </View>
        <View style={[styles.kpiCard, { borderLeftColor: COLORS.textMuted }]}>
          <Text style={styles.kpiNum}>{reservas.length}</Text>
          <Text style={styles.kpiLabel}>Total</Text>
        </View>
      </ScrollView>

      {/* Filtros */}
      <View style={styles.filtroRow}>
        <TouchableOpacity
          style={[styles.filtroBtn, filtro === 'pendiente' && styles.filtroBtnActive]}
          onPress={() => setFiltro('pendiente')}
        >
          <Text style={[styles.filtroBtnText, filtro === 'pendiente' && styles.filtroBtnTextActive]}>
            Pendientes ({pendientes.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filtroBtn, filtro === 'todas' && styles.filtroBtnActive]}
          onPress={() => setFiltro('todas')}
        >
          <Text style={[styles.filtroBtnText, filtro === 'todas' && styles.filtroBtnTextActive]}>
            Todas
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Cargando reservas...</Text>
        </View>
      ) : listaFiltrada.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyText}>
            {filtro === 'pendiente' ? 'No hay solicitudes pendientes' : 'No hay reservas registradas'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={listaFiltrada}
          keyExtractor={(item) => item._id}
          renderItem={renderReserva}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 10, color: COLORS.textMuted, fontSize: 14 },
  emptyIcon: { fontSize: 44, marginBottom: 10 },
  emptyText: { fontSize: 15, color: COLORS.textMuted, textAlign: 'center' },

  kpiScroll: { flexGrow: 0 },
  kpiContainer: { paddingHorizontal: 16, paddingVertical: 14, gap: 10 },
  kpiCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderLeftWidth: 4,
    minWidth: 100,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  kpiNum: { fontSize: 28, fontWeight: 'bold', color: COLORS.text },
  kpiLabel: { fontSize: 11, color: COLORS.textMuted, marginTop: 2, textAlign: 'center' },

  filtroRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 10, gap: 8 },
  filtroBtn: {
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  filtroBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filtroBtnText: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },
  filtroBtnTextActive: { color: COLORS.white },

  list: { paddingHorizontal: 16, paddingBottom: 30 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  cardConductor: { fontSize: 15, fontWeight: 'bold', color: COLORS.text },
  cardVehiculo: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  estadoBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginLeft: 8 },
  estadoText: { fontSize: 10, fontWeight: 'bold' },
  cardBody: { backgroundColor: '#F8FAFC', borderRadius: 8, padding: 10, gap: 4 },
  infoLine: { fontSize: 13, color: COLORS.textMuted },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 9, borderRadius: 8, gap: 5,
  },
  approveBtn: { backgroundColor: COLORS.success },
  rejectBtn: { backgroundColor: COLORS.danger },
  actionBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
});
