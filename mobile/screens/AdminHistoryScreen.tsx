import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Modal, Image, ScrollView, RefreshControl, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants';
import { useAlert } from '../context/AlertContext';
import { reservationService, IReservation } from '../services/reservation.service';
import { vehicleService, IVehicle } from '../services/vehicle.service';

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

function isSameDay(date1: Date, date2: Date) {
  return date1.getFullYear() === date2.getFullYear()
    && date1.getMonth() === date2.getMonth()
    && date1.getDate() === date2.getDate();
}


// ─── Componente de Picker personalizado (Combobox) ────────────────────────────
function Picker({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (val: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value)?.label ?? label;

  return (
    <View style={pickerStyles.wrapper}>
      <TouchableOpacity style={pickerStyles.trigger} onPress={() => setOpen(true)}>
        <Text style={[pickerStyles.triggerText, value !== '' && pickerStyles.triggerTextActive]} numberOfLines={1}>
          {selected}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={COLORS.textMuted} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade">
        <TouchableOpacity style={pickerStyles.overlay} onPress={() => setOpen(false)} activeOpacity={1}>
          <View style={pickerStyles.dropdown}>
            <Text style={pickerStyles.dropdownTitle}>{label}</Text>
            {options.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  pickerStyles.option,
                  value === opt.value && pickerStyles.optionActive,
                ]}
                onPress={() => { onChange(opt.value); setOpen(false); }}
              >
                {value === opt.value && <Ionicons name="checkmark" size={16} color={COLORS.primary} style={{ marginRight: 8 }} />}
                <Text style={[pickerStyles.optionText, value === opt.value && pickerStyles.optionTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const pickerStyles = StyleSheet.create({
  wrapper: { flex: 1 },
  trigger: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.white, borderRadius: 8, paddingHorizontal: 12,
    paddingVertical: 10, borderWidth: 1, borderColor: COLORS.border,
  },
  triggerText: { fontSize: 13, color: COLORS.textMuted, flex: 1 },
  triggerTextActive: { color: COLORS.text, fontWeight: '600' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', padding: 30 },
  dropdown: {
    backgroundColor: COLORS.white, borderRadius: 14,
    padding: 10, shadowColor: '#000', shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 8,
  },
  dropdownTitle: {
    fontSize: 12, fontWeight: 'bold', color: COLORS.textMuted,
    textTransform: 'uppercase', paddingHorizontal: 8, paddingVertical: 6,
    borderBottomWidth: 1, borderColor: COLORS.border, marginBottom: 6,
  },
  option: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 12, borderRadius: 8,
  },
  optionActive: { backgroundColor: COLORS.primary + '15' },
  optionText: { fontSize: 15, color: COLORS.text },
  optionTextActive: { color: COLORS.primary, fontWeight: '600' },
});

// ─── Pantalla principal ────────────────────────────────────────────────────────
export default function AdminHistoryScreen() {
  const { showAlert } = useAlert();
  const [reservas, setReservas] = useState<IReservation[]>([]);
  const [vehiculos, setVehiculos] = useState<IVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  // Filtros
  const [filtroVehiculo, setFiltroVehiculo] = useState('');
  const [filtroFecha, setFiltroFecha] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Modal detalle
  const [selectedReserva, setSelectedReserva] = useState<IReservation | null>(null);

  const cargarDatos = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const [todas, flota] = await Promise.all([
        reservationService.getAllReservations(),
        vehicleService.getAll()
      ]);
      todas.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setReservas(todas);
      setVehiculos(flota);
    } catch {
      showAlert('Error', 'No se pudo cargar el historial.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { cargarDatos(); }, []));

  const onRefresh = () => { setRefreshing(true); cargarDatos(true); };

  // ─── Opciones dinámicas para los filtros ─────────────────────────────────────
  const vehiculoOptions = useMemo(() => {
    const opts: { label: string; value: string }[] = [{ label: 'Todos los vehículos', value: '' }];
    vehiculos.forEach(v => {
      opts.push({ label: `${v.marca} ${v.modelo} · ${v.placa}`, value: v.placa });
    });
    return opts;
  }, [vehiculos]);


  // ─── Aplicar filtros ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return reservas.filter(r => {
      // Filtro vehículo
      if (filtroVehiculo && r.vehiculo?.placa !== filtroVehiculo) return false;

      // Filtro fecha (basado en fechaInicio)
      if (filtroFecha) {
        const fechaViaje = new Date(r.fechaInicio);
        if (!isSameDay(fechaViaje, filtroFecha)) return false;
      }

      return true;
    });
  }, [reservas, filtroVehiculo, filtroFecha]);

  const hayFiltros = filtroVehiculo !== '' || filtroFecha !== null;

  const limpiarFiltros = () => {
    setFiltroVehiculo('');
    setFiltroFecha(null);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setFiltroFecha(selectedDate);
    }
  };

  // ─── Render de tarjeta ────────────────────────────────────────────────────────
  const renderReserva = ({ item }: { item: IReservation }) => {
    const color = ESTADO_COLOR[item.estado] ?? COLORS.textMuted;
    const vehiculo = item.vehiculo
      ? `${item.vehiculo.marca} ${item.vehiculo.modelo} · ${item.vehiculo.placa}`
      : 'Vehículo desconocido';
    const conductor = item.usuario
      ? `${item.usuario.nombre} ${item.usuario.apellido}`
      : 'Usuario desconocido';
    const totalFotos = (item.fotosSalida?.length || 0) + (item.fotosRetorno?.length || 0);

    return (
      <TouchableOpacity style={styles.card} onPress={() => setSelectedReserva(item)}>
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

        <View style={styles.cardFooter}>
          <Text style={styles.cardDate}>📅 {formatFecha(item.fechaInicio)}</Text>
          <View style={styles.photoChip}>
            <Ionicons name="camera-outline" size={12} color={totalFotos > 0 ? COLORS.success : COLORS.textMuted} />
            <Text style={[styles.photoChipText, totalFotos > 0 && { color: COLORS.success }]}>
              {totalFotos} foto{totalFotos !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ─── Render de fotos en modal ─────────────────────────────────────────────────
  const renderFotos = (fotos: string[] | undefined, tipo: string) => {
    if (!fotos || fotos.length === 0) {
      return <Text style={styles.noPhotos}>Sin fotos de {tipo}.</Text>;
    }
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {fotos.map((url, i) => (
          <TouchableOpacity key={i} onPress={() => setExpandedImage(url)}>
            <Image source={{ uri: url }} style={styles.photo} resizeMode="cover" />
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      {/* ─── Panel de Filtros ─────────────────────────────────────────── */}
      <View style={styles.filtersPanel}>
        <View style={styles.filterRow}>
          <Picker
            label="Vehículo"
            value={filtroVehiculo}
            options={vehiculoOptions}
            onChange={setFiltroVehiculo}
          />
        </View>
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[pickerStyles.trigger, { flex: 1 }]}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={[pickerStyles.triggerText, filtroFecha && pickerStyles.triggerTextActive]} numberOfLines={1}>
              {filtroFecha ? filtroFecha.toLocaleDateString('es-CL') : 'Cualquier fecha'}
            </Text>
            <Ionicons name="calendar-outline" size={14} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={filtroFecha || new Date()}
            mode="date"
            display="default"
            onChange={handleDateChange}
          />
        )}

        {hayFiltros && (
          <TouchableOpacity style={styles.clearBtn} onPress={limpiarFiltros}>
            <Ionicons name="close-circle" size={14} color={COLORS.danger} />
            <Text style={styles.clearBtnText}>Limpiar filtros</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ─── Conteo de resultados ──────────────────────────────────────── */}
      <Text style={styles.resultCount}>{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</Text>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Cargando historial...</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyText}>No se encontraron resultados con los filtros aplicados.</Text>
          {hayFiltros && (
            <TouchableOpacity onPress={limpiarFiltros} style={styles.clearBtnLarge}>
              <Text style={styles.clearBtnLargeText}>Limpiar filtros</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          renderItem={renderReserva}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
        />
      )}

      {/* ─── Modal de Detalle + Evidencia ─────────────────────────────── */}
      <Modal visible={!!selectedReserva} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Detalle del Viaje</Text>
            <TouchableOpacity onPress={() => setSelectedReserva(null)}>
              <Ionicons name="close" size={28} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          {selectedReserva && (
            <ScrollView style={styles.modalScroll}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Conductor</Text>
                <Text style={styles.sectionText}>
                  {selectedReserva.usuario ? `${selectedReserva.usuario.nombre} ${selectedReserva.usuario.apellido}` : 'N/A'}
                </Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Vehículo</Text>
                <Text style={styles.sectionText}>
                  {selectedReserva.vehiculo
                    ? `${selectedReserva.vehiculo.marca} ${selectedReserva.vehiculo.modelo} (${selectedReserva.vehiculo.placa})`
                    : 'N/A'}
                </Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Destino</Text>
                <Text style={styles.sectionText}>{selectedReserva.destino}</Text>
              </View>

              <View style={styles.sectionRow}>
                <View style={styles.halfSection}>
                  <Text style={styles.sectionTitle}>Km Salida</Text>
                  <Text style={styles.sectionText}>{selectedReserva.kmSalida ? `${selectedReserva.kmSalida} km` : '-'}</Text>
                </View>
                <View style={styles.halfSection}>
                  <Text style={styles.sectionTitle}>Km Retorno</Text>
                  <Text style={styles.sectionText}>{selectedReserva.kmRetorno ? `${selectedReserva.kmRetorno} km` : '-'}</Text>
                </View>
              </View>

              {selectedReserva.observaciones && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Observaciones</Text>
                  <Text style={styles.sectionText}>{selectedReserva.observaciones}</Text>
                </View>
              )}

              <View style={styles.section}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons name="camera" size={16} color={COLORS.primary} />
                  <Text style={[styles.sectionTitle, { marginLeft: 6 }]}>
                    Evidencia al Salir ({selectedReserva.fotosSalida?.length || 0})
                  </Text>
                </View>
                {renderFotos(selectedReserva.fotosSalida, 'salida')}
              </View>

              <View style={styles.section}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons name="camera" size={16} color={COLORS.success} />
                  <Text style={[styles.sectionTitle, { marginLeft: 6 }]}>
                    Evidencia al Retornar ({selectedReserva.fotosRetorno?.length || 0})
                  </Text>
                </View>
                {renderFotos(selectedReserva.fotosRetorno, 'retorno')}
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* ─── Modal para ver imagen en pantalla completa ───────────────── */}
      <Modal visible={!!expandedImage} transparent={true} animationType="fade">
        <View style={styles.fullscreenModal}>
          <TouchableOpacity style={styles.closeFullscreenBtn} onPress={() => setExpandedImage(null)}>
            <Ionicons name="close" size={36} color="#fff" />
          </TouchableOpacity>
          {expandedImage && (
            <Image source={{ uri: expandedImage }} style={styles.fullscreenImage} resizeMode="contain" />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 10, color: COLORS.textMuted, fontSize: 14 },
  emptyIcon: { fontSize: 44, marginBottom: 10 },
  emptyText: { fontSize: 15, color: COLORS.textMuted, textAlign: 'center' },

  // Filters
  filtersPanel: { backgroundColor: COLORS.white, padding: 14, borderBottomWidth: 1, borderColor: COLORS.border, gap: 10 },
  filterRow: { flexDirection: 'row' },
  clearBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start' },
  clearBtnText: { fontSize: 12, color: COLORS.danger, fontWeight: '600' },
  clearBtnLarge: {
    marginTop: 16, paddingHorizontal: 20, paddingVertical: 10,
    backgroundColor: COLORS.danger + '15', borderRadius: 8,
  },
  clearBtnLargeText: { color: COLORS.danger, fontWeight: 'bold', fontSize: 14 },

  resultCount: { fontSize: 12, color: COLORS.textMuted, paddingHorizontal: 16, paddingVertical: 8 },

  // List
  list: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 30 },
  card: {
    backgroundColor: COLORS.white, borderRadius: 12, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: COLORS.border,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  cardConductor: { fontSize: 15, fontWeight: 'bold', color: COLORS.text },
  cardVehiculo: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  estadoBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginLeft: 8 },
  estadoText: { fontSize: 9, fontWeight: 'bold' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardDate: { fontSize: 12, color: COLORS.textMuted },
  photoChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  photoChipText: { fontSize: 12, color: COLORS.textMuted },

  // Modal
  modalContainer: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, backgroundColor: COLORS.white, borderBottomWidth: 1, borderColor: COLORS.border,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  modalScroll: { flex: 1, padding: 20 },
  section: { marginBottom: 20 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  halfSection: { flex: 1, marginRight: 10 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { fontSize: 11, fontWeight: 'bold', color: COLORS.textMuted, textTransform: 'uppercase', marginBottom: 4 },
  sectionText: { fontSize: 16, color: COLORS.text },
  photo: { width: 150, height: 200, borderRadius: 10, marginRight: 10, backgroundColor: '#eee' },
  noPhotos: { fontSize: 14, color: COLORS.textMuted, fontStyle: 'italic', marginTop: 5 },

  // Fullscreen Image
  fullscreenModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeFullscreenBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  fullscreenImage: {
    width: '100%',
    height: '100%',
  },
});
