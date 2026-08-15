import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Modal, ScrollView, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, AppColors } from '../constants';
import { useTheme } from '../context/ThemeContext';
import { reservationService, IReservation } from '../services/reservation.service';

const ESTADO_MAP: Record<string, { label: string; color: string }> = {
  pendiente: { label: 'Pendiente', color: COLORS.warning },
  aprobada: { label: 'Aprobada', color: COLORS.primary },
  en_curso: { label: 'En Curso', color: COLORS.success },
  completada: { label: 'Completada', color: COLORS.textMuted },
  cancelada: { label: 'Cancelada', color: COLORS.danger },
  rechazada: { label: 'Rechazada', color: COLORS.danger },
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
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);
  

  const [reservations, setReservations] = useState<IReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedReserva, setSelectedReserva] = useState<IReservation | null>(null);

  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [canceling, setCanceling] = useState(false);

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

  const handleCancelReservation = async () => {
    if (!selectedReserva) return;
    if (!cancelReason.trim()) {
      Alert.alert('Error', 'El motivo de cancelación es obligatorio.');
      return;
    }
    
    setCanceling(true);
    try {
      await reservationService.cancel(selectedReserva._id, cancelReason.trim());
      Alert.alert('Éxito', 'La reserva ha sido cancelada.');
      setCancelModalVisible(false);
      setSelectedReserva(null);
      setCancelReason('');
      fetchReservations();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'No se pudo cancelar la reserva.');
    } finally {
      setCanceling(false);
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
    const estado = ESTADO_MAP[item.estado] ?? { label: item.estado, color: colors.textMuted };
    const vehiculo = item.vehiculo
      ? `${item.vehiculo.marca} ${item.vehiculo.modelo}`
      : 'Vehículo desconocido';

    return (
      <TouchableOpacity style={styles.card} onPress={() => setSelectedReserva(item)}>
        <View style={styles.cardHeader}>
          <Text style={styles.vehicleTitle}>{vehiculo}</Text>
          <Text style={[styles.statusBadge, { color: estado.color }]}>{estado.label}</Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.infoText}>📅 {formatDate(item.fechaInicio)} → {formatDate(item.fechaFin)}</Text>
          <Text style={styles.infoText}>⏱ {formatTime(item.fechaInicio)} - {formatTime(item.fechaFin)}</Text>
          <Text style={styles.infoText}>📍 {item.destino}</Text>
          {item.motivo ? <Text style={styles.infoText} numberOfLines={1}>📝 {item.motivo}</Text> : null}
          {(item.estado === 'cancelada' || item.estado === 'rechazada') && item.motivoRechazo ? (
            <View style={styles.rejectBox}>
              <Text style={styles.rejectLabel}>❌ Motivo de rechazo (Toca para ver más):</Text>
              <Text style={styles.rejectText} numberOfLines={2}>{item.motivoRechazo}</Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        />
      )}

      {/* Modal de Detalle */}
      <Modal visible={!!selectedReserva} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detalle de Reserva</Text>
              <TouchableOpacity onPress={() => setSelectedReserva(null)}>
                <Ionicons name="close" size={28} color={colors.text} />
              </TouchableOpacity>
            </View>

            {selectedReserva && (
              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Vehículo</Text>
                  <Text style={styles.modalSectionText}>
                    {selectedReserva.vehiculo ? `${selectedReserva.vehiculo.marca} ${selectedReserva.vehiculo.modelo}` : 'Vehículo desconocido'}
                  </Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Destino</Text>
                  <Text style={styles.modalSectionText}>{selectedReserva.destino}</Text>
                </View>

                {selectedReserva.motivo ? (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Motivo del viaje</Text>
                    <Text style={styles.modalSectionText}>{selectedReserva.motivo}</Text>
                  </View>
                ) : null}

                {(selectedReserva.estado === 'cancelada' || selectedReserva.estado === 'rechazada') && selectedReserva.motivoRechazo ? (
                  <View style={styles.modalSection}>
                    <Text style={[styles.modalSectionTitle, { color: colors.danger }]}>Motivo de Rechazo</Text>
                    <Text style={styles.modalSectionText}>{selectedReserva.motivoRechazo}</Text>
                  </View>
                ) : null}

                {selectedReserva.estado === 'cancelada' && selectedReserva.motivoCancelacion ? (
                  <View style={styles.modalSection}>
                    <Text style={[styles.modalSectionTitle, { color: colors.danger }]}>Motivo de Cancelación</Text>
                    <Text style={styles.modalSectionText}>{selectedReserva.motivoCancelacion}</Text>
                  </View>
                ) : null}

                {selectedReserva.observaciones && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Observaciones (Retorno)</Text>
                    <Text style={styles.modalSectionText}>{selectedReserva.observaciones}</Text>
                  </View>
                )}
              </ScrollView>
            )}

            {selectedReserva && (selectedReserva.estado === 'pendiente' || selectedReserva.estado === 'aprobada') && (
              <TouchableOpacity 
                style={[styles.modalBtn, { backgroundColor: colors.danger, marginTop: 15 }]} 
                onPress={() => setCancelModalVisible(true)}
              >
                <Text style={styles.modalBtnText}>Cancelar Reserva</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal de Cancelación */}
      <Modal visible={cancelModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.cancelModalContainer}>
            <Text style={styles.modalTitle}>Cancelar Reserva</Text>
            <Text style={{ color: colors.text, marginBottom: 12 }}>Por favor ingresa el motivo de la cancelación:</Text>
            
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              placeholder="Motivo (obligatorio)"
              placeholderTextColor={colors.textMuted}
              multiline
              value={cancelReason}
              onChangeText={setCancelReason}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.modalCancelBtn} 
                onPress={() => { setCancelModalVisible(false); setCancelReason(''); }} 
                disabled={canceling}
              >
                <Text style={styles.modalCancelBtnText}>Atrás</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalConfirmBtn} 
                onPress={handleCancelReservation} 
                disabled={canceling}
              >
                {canceling ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.modalConfirmBtnText}>Confirmar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getStyles = (colors: AppColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 20,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    color: colors.textMuted,
    fontSize: 14,
  },
  errorText: {
    color: colors.danger,
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  retryBtnText: {
    color: colors.white,
    fontWeight: 'bold',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textMuted,
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
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
  },
  newBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  newBtnText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: colors.white,
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
    color: colors.text,
    flex: 1,
  },
  statusBadge: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 8,
  },
  cardBody: {
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 8,
    gap: 4,
  },
  infoText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  rejectBox: {
    marginTop: 8,
    backgroundColor: colors.danger + '20',
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: colors.danger,
  },
  rejectLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.danger,
    marginBottom: 3,
  },
  rejectText: {
    fontSize: 13,
    color: colors.danger,
    lineHeight: 18,
  },
  // Modal de Detalles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  modalScroll: {
    paddingBottom: 20,
  },
  modalSection: {
    marginBottom: 16,
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textMuted,
    marginBottom: 4,
  },
  modalSectionText: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 22,
  },
  modalBtn: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalBtnText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelModalContainer: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 20,
    marginBottom: 'auto',
    marginTop: 'auto',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.background,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalCancelBtnText: {
    color: colors.text,
    fontWeight: 'bold',
  },
  modalConfirmBtn: {
    backgroundColor: colors.danger,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  modalConfirmBtnText: {
    color: colors.white,
    fontWeight: 'bold',
  },
});
