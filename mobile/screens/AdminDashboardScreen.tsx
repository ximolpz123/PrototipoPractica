import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, ScrollView, Modal, TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants';
import { useAlert } from '../context/AlertContext';
import { reservationService, IReservation } from '../services/reservation.service';

const ESTADO_COLOR: Record<string, string> = {
  pendiente: COLORS.warning,
  aprobada: COLORS.primary,
  en_curso: COLORS.success,
  completada: COLORS.textMuted,
  cancelada: COLORS.danger,
  rechazada: COLORS.danger,
};

function formatFecha(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-CL', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function AdminDashboardScreen({ navigation }: any) {
  const { showAlert } = useAlert();
  const [reservas, setReservas] = useState<IReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<'pendiente' | 'todas'>('pendiente');

  // Estado modal de rechazo
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectMotivo, setRejectMotivo] = useState('');
  const [pendingRejectId, setPendingRejectId] = useState<string | null>(null);

  const cargarReservas = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const todas = await reservationService.getAllReservations();
      setReservas(todas);
    } catch (err) {
      showAlert('Error', 'No se pudieron cargar las reservas.');
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

  // Aprobar: confirmación directa
  const handleApprove = async (id: string) => {
    showAlert(
      '¿Aprobar reserva?',
      '¿Seguro que deseas aprobar esta solicitud?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aprobar',
          style: 'default',
          onPress: async () => {
            setActionLoading(id);
            try {
              await reservationService.updateStatus(id, 'aprobada');
              await cargarReservas(true);
            } catch (err: any) {
              showAlert('Error', err.response?.data?.message ?? 'No se pudo aprobar la reserva.');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  // Rechazar: abrir modal para ingresar motivo
  const handleReject = (id: string) => {
    setPendingRejectId(id);
    setRejectMotivo('');
    setRejectModalVisible(true);
  };

  // Confirmar rechazo con motivo
    const handleConfirmReject = async () => {
    if (!pendingRejectId) return;
    if (!rejectMotivo.trim()) {
      showAlert('Motivo requerido', 'Por favor escribe el motivo del rechazo antes de confirmar.');
      return;
    }
    setRejectModalVisible(false);
    setActionLoading(pendingRejectId);
    try {
      // Usamos el mismo endpoint updateStatus pasando estado rechazada y el motivo
      await reservationService.updateStatus(pendingRejectId, 'rechazada', rejectMotivo.trim());
      await cargarReservas(true);
    } catch (err: any) {
      showAlert('Error', err.response?.data?.message ?? 'No se pudo rechazar la reserva.');
    } finally {
      setActionLoading(null);
      setPendingRejectId(null);
    }
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
          {/* Motivo de rechazo visible para el admin */}
          {item.motivoRechazo ? (
            <View style={styles.rejectReasonBox}>
              <Ionicons name="alert-circle-outline" size={14} color={COLORS.danger} />
              <Text style={styles.rejectReasonText}>
                Motivo de rechazo: {item.motivoRechazo}
              </Text>
            </View>
          ) : null}
        </View>

        {item.estado === 'pendiente' && (
          <View style={styles.actionRow}>
            {actionLoading === item._id ? (
              <ActivityIndicator color={COLORS.primary} />
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.approveBtn]}
                  onPress={() => handleApprove(item._id)}
                >
                  <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                  <Text style={styles.actionBtnText}>Aprobar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.rejectBtn]}
                  onPress={() => handleReject(item._id)}
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
      {/* Modal de motivo de rechazo */}
      <Modal
        visible={rejectModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRejectModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Ionicons name="close-circle" size={28} color={COLORS.danger} />
              <Text style={styles.modalTitle}>Motivo de Rechazo</Text>
            </View>
            <Text style={styles.modalSubtitle}>
              Por favor indica el motivo por el que se rechaza esta solicitud. El conductor podrá verlo.
            </Text>
            <TextInput
              style={styles.motivoInput}
              value={rejectMotivo}
              onChangeText={setRejectMotivo}
              placeholder="Ej: El vehículo ya está reservado para esa fecha..."
              placeholderTextColor={COLORS.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelModalBtn]}
                onPress={() => setRejectModalVisible(false)}
              >
                <Text style={styles.cancelModalBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.confirmRejectBtn]}
                onPress={handleConfirmReject}
              >
                <Text style={styles.confirmRejectBtnText}>Confirmar Rechazo</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
            Pendientes
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

  rejectReasonBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 6,
    backgroundColor: '#FFF0F0',
    borderRadius: 6,
    padding: 8,
    gap: 6,
  },
  rejectReasonText: { fontSize: 12, color: COLORS.danger, flex: 1 },

  actionRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 9, borderRadius: 8, gap: 5,
  },
  approveBtn: { backgroundColor: COLORS.success },
  rejectBtn: { backgroundColor: COLORS.danger },
  actionBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },

  // Modal de rechazo
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  modalSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 16,
    lineHeight: 20,
  },
  motivoInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: '#F8FAFC',
    minHeight: 110,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelModalBtn: {
    backgroundColor: '#F1F5F9',
  },
  cancelModalBtnText: {
    color: COLORS.textMuted,
    fontWeight: '700',
    fontSize: 14,
  },
  confirmRejectBtn: {
    backgroundColor: COLORS.danger,
  },
  confirmRejectBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
