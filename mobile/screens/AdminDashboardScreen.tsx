import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, ScrollView, Modal, TextInput, Animated
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, AppColors, GRADIENTS, SHADOWS, BORDER_RADIUS } from '../constants';
import { useTheme } from '../context/ThemeContext';
import { useAlert } from '../context/AlertContext';
import { reservationService, IReservation } from '../services/reservation.service';
import { userService } from '../services/user.service';
import { inspectionService, IInspeccion } from '../services/inspection.service';

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

export default function AdminDashboardScreen() {
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);
  

  const { showAlert } = useAlert();
  const navigation = useNavigation<any>();
  const [reservas, setReservas] = useState<IReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<'pendiente' | 'todas' | 'inspecciones'>('pendiente');
  const [inspecciones, setInspecciones] = useState<IInspeccion[]>([]);

  // Animaciones
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(20));

  // Estado modal de rechazo
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectMotivo, setRejectMotivo] = useState('');
  const [pendingRejectId, setPendingRejectId] = useState<string | null>(null);

  // Estado modal de bandera
  const [flagModalVisible, setFlagModalVisible] = useState(false);
  const [flagUser, setFlagUser] = useState<{ id: string, name: string } | null>(null);
  const [flagType, setFlagType] = useState<'verde' | 'amarilla' | 'naranja' | 'roja'>('verde');
  const [flagMotivo, setFlagMotivo] = useState('');
  const [flagLoading, setFlagLoading] = useState(false);

  const cargarReservas = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const todas = await reservationService.getAllReservations();
      setReservas(todas);
      const insp = await inspectionService.getTodayInspections();
      setInspecciones(insp);
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
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true })
      ]).start();
    }, [fadeAnim, slideAnim])
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

  const handleOpenFlagModal = (userId: string, userName: string) => {
    setFlagUser({ id: userId, name: userName });
    setFlagType('verde');
    setFlagMotivo('');
    setFlagModalVisible(true);
  };

  const handleAssignFlag = async () => {
    if (!flagUser) return;
    if (!flagMotivo.trim()) {
      showAlert('Motivo requerido', 'Por favor ingresa un motivo para asignar la bandera.');
      return;
    }
    setFlagLoading(true);
    try {
      await userService.assignFlag(flagUser.id, flagType, flagMotivo.trim());
      showAlert('Éxito', `Bandera ${flagType.toUpperCase()} asignada a ${flagUser.name}.`);
      setFlagModalVisible(false);
    } catch (err: any) {
      showAlert('Error', err.response?.data?.message ?? 'No se pudo asignar la bandera.');
    } finally {
      setFlagLoading(false);
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

  const renderInspeccion = ({ item }: { item: IInspeccion }) => {
    const color = item.estado === 'pendiente' ? colors.warning : item.estado === 'respondida' ? colors.success : colors.danger;
    const vehiculo = item.reserva?.vehiculo ? `${item.reserva.vehiculo.marca} ${item.reserva.vehiculo.modelo}` : 'Vehículo';
    
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardConductor}>
            {item.usuario ? `${item.usuario.nombre} ${item.usuario.apellido}` : 'Desconocido'}
          </Text>
          <View style={[styles.estadoBadge, { backgroundColor: color + '20' }]}>
            <Text style={[styles.estadoText, { color }]}>
              {item.estado.toUpperCase()}
            </Text>
          </View>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardVehiculo}>{vehiculo}</Text>
          <Text style={[styles.infoLine, { marginTop: 5 }]}>📋 {item.descripcion}</Text>
          <Text style={styles.infoLine}>🕒 Creada: {formatFecha(item.fechaActivacion)}</Text>
          {item.respuestaTexto ? <Text style={styles.infoLine}>🗣️ {item.respuestaTexto}</Text> : null}
          {item.respuestaFotosUrls && item.respuestaFotosUrls.length > 0 ? <Text style={[styles.infoLine, {color: colors.primary}]}>🖼️ Contiene {item.respuestaFotosUrls.length} foto(s) adjunta(s)</Text> : null}
        </View>
      </View>
    );
  };

  const renderReserva = ({ item }: { item: IReservation }) => {
    const color = ESTADO_COLOR[item.estado] ?? colors.textMuted;
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
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.cardConductor}>{conductor}</Text>
              {item.usuario && (
                <TouchableOpacity 
                  style={{ marginLeft: 8 }}
                  onPress={() => handleOpenFlagModal(item.usuario._id, item.usuario.nombre)}
                >
                  <Ionicons name="flag" size={16} color={colors.primary} />
                </TouchableOpacity>
              )}
            </View>
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
              <Ionicons name="alert-circle-outline" size={14} color={colors.danger} />
              <Text style={styles.rejectReasonText}>
                Motivo de rechazo: {item.motivoRechazo}
              </Text>
            </View>
          ) : null}
        </View>

        {item.estado === 'pendiente' && (
          <View style={styles.actionRow}>
            {actionLoading === item._id ? (
              <ActivityIndicator color={colors.primary} />
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
              <Ionicons name="close-circle" size={28} color={colors.danger} />
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
              placeholderTextColor={colors.textMuted}
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

      {/* Modal de Asignación de Bandera */}
      <Modal
        visible={flagModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFlagModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Ionicons name="flag" size={28} color={colors.primary} />
              <Text style={styles.modalTitle}>Asignar Bandera Manual</Text>
            </View>
            <Text style={styles.modalSubtitle}>
              Asignar bandera al conductor {flagUser?.name}
            </Text>

            <View style={styles.flagSelectorRow}>
              {['verde', 'amarilla', 'naranja', 'roja'].map((color) => {
                const colorsMap: any = { verde: '#10B981', amarilla: '#F59E0B', naranja: '#F97316', roja: '#EF4444' };
                const isSelected = flagType === color;
                return (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.flagOption,
                      isSelected && { borderColor: colorsMap[color], backgroundColor: colorsMap[color] + '20' }
                    ]}
                    onPress={() => setFlagType(color as any)}
                  >
                    <Ionicons name="flag" size={20} color={colorsMap[color]} />
                    <Text style={[styles.flagOptionText, isSelected && { color: colorsMap[color], fontWeight: 'bold' }]}>
                      {color.charAt(0).toUpperCase() + color.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TextInput
              style={styles.motivoInput}
              value={flagMotivo}
              onChangeText={setFlagMotivo}
              placeholder="Escribe el motivo..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelModalBtn]}
                onPress={() => setFlagModalVisible(false)}
              >
                <Text style={styles.cancelModalBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                onPress={handleAssignFlag}
                disabled={flagLoading}
              >
                {flagLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>Guardar</Text>
                )}
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
        <LinearGradient colors={GRADIENTS.warning} style={[styles.kpiCard, { padding: 0 }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={{ padding: 15, width: '100%' }}>
            <Text style={[styles.kpiNum, { color: colors.white }]}>{pendientes.length}</Text>
            <Text style={[styles.kpiLabel, { color: 'rgba(255,255,255,0.8)' }]}>Pendientes</Text>
          </View>
        </LinearGradient>
        
        <LinearGradient colors={GRADIENTS.success} style={[styles.kpiCard, { padding: 0 }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={{ padding: 15, width: '100%' }}>
            <Text style={[styles.kpiNum, { color: colors.white }]}>{enCurso.length}</Text>
            <Text style={[styles.kpiLabel, { color: 'rgba(255,255,255,0.8)' }]}>En Ruta</Text>
          </View>
        </LinearGradient>

        <LinearGradient colors={GRADIENTS.primary} style={[styles.kpiCard, { padding: 0 }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={{ padding: 15, width: '100%' }}>
            <Text style={[styles.kpiNum, { color: colors.white }]}>{hoyCompletadas.length}</Text>
            <Text style={[styles.kpiLabel, { color: 'rgba(255,255,255,0.8)' }]}>Finalizadas Hoy</Text>
          </View>
        </LinearGradient>

        <LinearGradient colors={GRADIENTS.cardBackground} style={[styles.kpiCard, { padding: 0, borderWidth: 1, borderColor: colors.border }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={{ padding: 15, width: '100%' }}>
            <Text style={[styles.kpiNum, { color: colors.text }]}>{reservas.length}</Text>
            <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>Total</Text>
          </View>
        </LinearGradient>
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
        <TouchableOpacity
          style={[styles.filtroBtn, filtro === 'inspecciones' && styles.filtroBtnActive]}
          onPress={() => setFiltro('inspecciones')}
        >
          <Text style={[styles.filtroBtnText, filtro === 'inspecciones' && styles.filtroBtnTextActive]}>
            Inspecciones
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando reservas...</Text>
        </View>
      ) : (filtro === 'inspecciones' && inspecciones.length === 0) || (filtro !== 'inspecciones' && listaFiltrada.length === 0) ? (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyText}>
            {filtro === 'pendiente' ? 'No hay solicitudes pendientes' : filtro === 'inspecciones' ? 'No hay inspecciones hoy' : 'No hay reservas registradas'}
          </Text>
        </View>
      ) : (
        <Animated.FlatList
          style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
          data={filtro === 'inspecciones' ? inspecciones as any : listaFiltrada as any}
          keyExtractor={(item: any) => item._id}
          renderItem={filtro === 'inspecciones' ? renderInspeccion as any : renderReserva}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        />
      )}

      {/* FAB para Asignar Vehículo */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => navigation.navigate('AdminCreateReservation')}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const getStyles = (colors: AppColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 10, color: colors.textMuted, fontSize: 14 },
  emptyIcon: { fontSize: 44, marginBottom: 10 },
  emptyText: { fontSize: 15, color: colors.textMuted, textAlign: 'center' },

  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: colors.primary,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
  },

  kpiScroll: { flexGrow: 0 },
  kpiContainer: { paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  kpiCard: {
    backgroundColor: colors.white,
    borderRadius: BORDER_RADIUS.lg,
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
  kpiNum: { fontSize: 28, fontWeight: 'bold', color: colors.text },
  kpiLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2, textAlign: 'center' },

  filtroRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 10, gap: 8 },
  filtroBtn: {
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  filtroBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filtroBtnText: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  filtroBtnTextActive: { color: colors.white },

  list: { paddingHorizontal: 16, paddingBottom: 30 },
  card: {
    backgroundColor: colors.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: 18,
    marginBottom: 16,
    ...SHADOWS.subtleMauve,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  cardConductor: { fontSize: 16, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
  cardVehiculo: { fontSize: 14, color: colors.textMuted, marginTop: 4, fontWeight: '500' },
  estadoBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: BORDER_RADIUS.round, marginLeft: 8 },
  estadoText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  cardBody: { backgroundColor: colors.background, borderRadius: BORDER_RADIUS.md, padding: 12, gap: 6 },
  infoLine: { fontSize: 13, color: colors.textMuted, fontWeight: '500' },

  rejectReasonBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 6,
    backgroundColor: colors.danger + '15',
    borderRadius: 6,
    padding: 8,
    gap: 6,
  },
  rejectReasonText: { fontSize: 12, color: colors.danger, flex: 1 },

  actionRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 9, borderRadius: 8, gap: 5,
  },
  approveBtn: { backgroundColor: colors.success },
  rejectBtn: { backgroundColor: colors.danger },
  actionBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },

  // Modal de rechazo
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.white,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    ...SHADOWS.subtleMauve,
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
    color: colors.text,
  },
  modalSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 16,
    lineHeight: 20,
  },
  motivoInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.background,
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
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelModalBtnText: {
    color: colors.textMuted,
    fontWeight: '700',
    fontSize: 14,
  },
  confirmRejectBtn: {
    backgroundColor: colors.danger,
  },
  confirmRejectBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  flagSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  flagOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
  },
  flagOptionText: {
    fontSize: 13,
    color: colors.text,
  }
});
