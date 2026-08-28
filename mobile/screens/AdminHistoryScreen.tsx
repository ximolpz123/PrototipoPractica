import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Modal, Image, ScrollView, RefreshControl, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '../constants';
import { useTheme } from '../context/ThemeContext';
import { useAlert } from '../context/AlertContext';
import { reservationService, IReservation } from '../services/reservation.service';
import { vehicleService, IVehicle } from '../services/vehicle.service';

const getEstadoColor = (estado: string, colors: AppColors) => {
  const map: Record<string, string> = {
    pendiente: colors.warning,
    aprobada: colors.primary,
    en_curso: colors.success,
    en_transicion: colors.info || colors.warning,
    completada: colors.textMuted,
    cancelada: colors.danger,
    rechazada: colors.danger,
  };
  return map[estado] ?? colors.textMuted;
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
  colors,
  styles,
}: {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (val: string) => void;
  colors: AppColors;
  styles: any;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value)?.label ?? label;

  return (
    <View style={{ flex: 1 }}>
      <TouchableOpacity 
        style={styles.pickerTrigger} 
        onPress={() => setOpen(true)}
      >
        <Text 
          style={[
            styles.pickerTriggerText, 
            value !== '' && { color: colors.text, fontWeight: '600' }
          ]} 
          numberOfLines={1}
        >
          {selected}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textMuted} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade">
        <TouchableOpacity 
          style={styles.dropdownOverlay} 
          onPress={() => setOpen(false)} 
          activeOpacity={1}
        >
          <View style={styles.dropdownContainer}>
            <Text style={styles.dropdownTitle}>{label}</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {options.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.dropdownOption,
                    value === opt.value && { backgroundColor: colors.primary + '20' },
                  ]}
                  onPress={() => { onChange(opt.value); setOpen(false); }}
                >
                  {value === opt.value && <Ionicons name="checkmark" size={16} color={colors.primary} style={{ marginRight: 8 }} />}
                  <Text style={[
                    styles.dropdownOptionText,
                    value === opt.value && { color: colors.primary, fontWeight: '600' }
                  ]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ─── Pantalla principal ────────────────────────────────────────────────────────
export default function AdminHistoryScreen() {
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);

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
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selectedDate) {
      setFiltroFecha(selectedDate);
    }
  };

  const getFotosArray = (fotos: any): string[] => {
    if (!fotos) return [];
    if (Array.isArray(fotos)) return fotos;
    return Object.values(fotos).filter(val => typeof val === 'string') as string[];
  };

  // ─── Render de tarjeta ────────────────────────────────────────────────────────
  const renderReserva = ({ item }: { item: IReservation }) => {
    const color = getEstadoColor(item.estado, colors);
    const vehiculo = item.vehiculo
      ? `${item.vehiculo.marca} ${item.vehiculo.modelo} · ${item.vehiculo.placa}`
      : 'Vehículo desconocido';
    let conductor = item.usuario
      ? `${item.usuario.nombre || ''} ${item.usuario.apellido || ''}`.trim()
      : 'Usuario desconocido';
      
    if (item.tramos && item.tramos.length > 0) {
      const conductoresList = [conductor];
      item.tramos.forEach((t: any) => {
        if (t.conductor && typeof t.conductor === 'object' && t.conductor.nombre) {
          const nombreCompleto = `${t.conductor.nombre} ${t.conductor.apellido || ''}`.trim();
          if (nombreCompleto && nombreCompleto !== conductoresList[conductoresList.length - 1]) {
            conductoresList.push(nombreCompleto);
          }
        }
      });
      conductor = conductoresList.join(' + ');
    }
    let totalFotos = getFotosArray(item.fotosSalida).length + getFotosArray(item.fotosRetorno).length;
    
    // Sumar fotos de los nuevos carruseles de relevo
    if (item.fotosRelevo && Array.isArray(item.fotosRelevo)) {
      item.fotosRelevo.forEach((f: any) => {
        totalFotos += getFotosArray(f).length;
      });
    }

    // Sumar fotos de relevos legacy
    if (item.tramos && Array.isArray(item.tramos)) {
      item.tramos.forEach((t: any) => {
        if (t.fotosInicio) {
          totalFotos += getFotosArray(t.fotosInicio).length;
        }
      });
    }

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
            <Ionicons name="camera-outline" size={12} color={totalFotos > 0 ? colors.success : colors.textMuted} />
            <Text style={[styles.photoChipText, totalFotos > 0 && { color: colors.success }]}>
              {totalFotos} foto{totalFotos !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ─── Render de fotos en modal ─────────────────────────────────────────────────
  const renderFotos = (fotosData: any, tipo: string) => {
    const fotos = getFotosArray(fotosData);
    if (fotos.length === 0) {
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
            colors={colors}
            styles={styles}
          />
        </View>
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.pickerTrigger, { flex: 1 }]}
            onPress={() => setShowDatePicker(true)}
          >
            <Text 
              style={[
                styles.pickerTriggerText, 
                filtroFecha ? { color: colors.text, fontWeight: '600' } : { color: colors.textMuted }
              ]} 
              numberOfLines={1}
            >
              {filtroFecha ? filtroFecha.toLocaleDateString('es-CL') : 'Cualquier fecha'}
            </Text>
            <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={filtroFecha || new Date()}
            mode="date"
            display="default"
            onChange={handleDateChange}
            onValueChange={handleDateChange}
            onDismiss={() => setShowDatePicker(false)}
          />
        )}

        {hayFiltros && (
          <TouchableOpacity style={styles.clearBtn} onPress={limpiarFiltros}>
            <Ionicons name="close-circle" size={14} color={colors.danger} />
            <Text style={styles.clearBtnText}>Limpiar filtros</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ─── Conteo de resultados ──────────────────────────────────────── */}
      <Text style={styles.resultCount}>{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</Text>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        />
      )}

      {/* ─── Modal de Detalle + Evidencia ─────────────────────────────── */}
      <Modal visible={!!selectedReserva} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Detalle del Viaje</Text>
            <TouchableOpacity onPress={() => setSelectedReserva(null)}>
              <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
          </View>

          {selectedReserva && (
            <ScrollView style={styles.modalScroll}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Conductor(es)</Text>
                <Text style={styles.sectionText}>
                  {(() => {
                    let conductorPrincipal = selectedReserva.usuario 
                      ? `${selectedReserva.usuario.nombre || ''} ${selectedReserva.usuario.apellido || ''}`.trim() 
                      : 'N/A';
                    if (selectedReserva.tramos && selectedReserva.tramos.length > 0) {
                      const conductoresList = [conductorPrincipal];
                      selectedReserva.tramos.forEach((t: any) => {
                        if (t.conductor && typeof t.conductor === 'object' && t.conductor.nombre) {
                          const nombreCompleto = `${t.conductor.nombre} ${t.conductor.apellido || ''}`.trim();
                          if (nombreCompleto && nombreCompleto !== conductoresList[conductoresList.length - 1]) {
                            conductoresList.push(nombreCompleto);
                          }
                        }
                      });
                      return conductoresList.join(', ');
                    }
                    return conductorPrincipal;
                  })()}
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

              {(selectedReserva.estado === 'cancelada' || selectedReserva.estado === 'rechazada') && selectedReserva.motivoRechazo ? (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.danger }]}>Motivo de Rechazo</Text>
                  <Text style={styles.sectionText}>{selectedReserva.motivoRechazo}</Text>
                </View>
              ) : null}

              <View style={styles.section}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons name="camera" size={16} color={colors.primary} />
                  <Text style={[styles.sectionTitle, { marginLeft: 6 }]}>
                    📸 Fotos de Salida — {selectedReserva.usuario?.nombre} {selectedReserva.usuario?.apellido} ({getFotosArray(selectedReserva.fotosSalida).length})
                  </Text>
                </View>
                {renderFotos(selectedReserva.fotosSalida, 'salida')}
              </View>

              {/* Renderizar nuevos carruseles de fotos de relevo (Array) */}
              {selectedReserva.fotosRelevo && selectedReserva.fotosRelevo.length > 0 && selectedReserva.fotosRelevo.map((fotosObj: any, index: number) => {
                const numFotos = getFotosArray(fotosObj).length;
                if (numFotos === 0) return null;
                
                // Intentar encontrar el conductor correspondiente (tramos[1] corresponde a fotosRelevo[0])
                const tramoRelacionado = selectedReserva.tramos && selectedReserva.tramos[index + 1];
                const conductorName = (tramoRelacionado?.conductor && typeof tramoRelacionado.conductor === 'object' && tramoRelacionado.conductor.nombre)
                  ? `${tramoRelacionado.conductor.nombre} ${tramoRelacionado.conductor.apellido || ''}`.trim()
                  : `Conductor de Relevo ${index + 1}`;

                return (
                  <View key={`relevo-new-${index}`} style={styles.section}>
                    <View style={styles.sectionTitleRow}>
                      <Ionicons name="camera" size={16} color={colors.primary} />
                      <Text style={[styles.sectionTitle, { marginLeft: 6 }]}>
                        📸 Fotos de Relevo {index + 1} — {conductorName} ({numFotos})
                      </Text>
                    </View>
                    {renderFotos(fotosObj, `relevo ${index + 1}`)}
                  </View>
                );
              })}

              {/* Renderizar legacy tramo.fotosInicio por compatibilidad hacia atrás */}
              {selectedReserva.tramos && selectedReserva.tramos.length > 0 && selectedReserva.tramos.map((tramo: any, index: number) => {
                const numFotos = getFotosArray(tramo.fotosInicio).length;
                if (numFotos === 0) return null;
                const conductorName = (tramo.conductor && typeof tramo.conductor === 'object' && tramo.conductor.nombre)
                  ? `${tramo.conductor.nombre} ${tramo.conductor.apellido || ''}`.trim()
                  : `Conductor ${index + 1}`;
                return (
                  <View key={`relevo-legacy-${index}`} style={styles.section}>
                    <View style={styles.sectionTitleRow}>
                      <Ionicons name="camera" size={16} color={colors.primary} />
                      <Text style={[styles.sectionTitle, { marginLeft: 6 }]}>
                        📸 Fotos de Relevo {index + 1} (Legacy) — {conductorName} ({numFotos})
                      </Text>
                    </View>
                    {renderFotos(tramo.fotosInicio, `relevo ${index + 1}`)}
                  </View>
                );
              })}

              <View style={styles.section}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons name="camera" size={16} color={colors.success} />
                  <Text style={[styles.sectionTitle, { marginLeft: 6 }]}>
                    📸 Fotos de Retorno — {
                      selectedReserva.tramos && selectedReserva.tramos.length > 0 && selectedReserva.tramos[selectedReserva.tramos.length - 1].conductor?.nombre
                      ? `${selectedReserva.tramos[selectedReserva.tramos.length - 1].conductor?.nombre} ${selectedReserva.tramos[selectedReserva.tramos.length - 1].conductor?.apellido || ''}`.trim()
                      : `${selectedReserva.usuario?.nombre || ''} ${selectedReserva.usuario?.apellido || ''}`.trim()
                    } ({getFotosArray(selectedReserva.fotosRetorno).length})
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

const getStyles = (colors: AppColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 10, color: colors.textMuted, fontSize: 14 },
  emptyIcon: { fontSize: 44, marginBottom: 10 },
  emptyText: { fontSize: 15, color: colors.textMuted, textAlign: 'center' },

  // Filters
  filtersPanel: { backgroundColor: colors.white, padding: 14, borderBottomWidth: 1, borderColor: colors.border, gap: 10 },
  filterRow: { flexDirection: 'row' },
  clearBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start' },
  clearBtnText: { fontSize: 12, color: colors.danger, fontWeight: '600' },
  clearBtnLarge: {
    marginTop: 16, paddingHorizontal: 20, paddingVertical: 10,
    backgroundColor: colors.danger + '15', borderRadius: 8,
  },
  clearBtnLargeText: { color: colors.danger, fontWeight: 'bold', fontSize: 14 },

  pickerTrigger: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.white, borderRadius: 8, paddingHorizontal: 12,
    paddingVertical: 10, borderWidth: 1, borderColor: colors.border,
  },
  pickerTriggerText: { fontSize: 13, color: colors.textMuted, flex: 1 },

  dropdownOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 30 },
  dropdownContainer: {
    backgroundColor: colors.white, borderRadius: 14,
    padding: 10, shadowColor: '#000', shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 8,
    borderWidth: 1, borderColor: colors.border,
  },
  dropdownTitle: {
    fontSize: 12, fontWeight: 'bold', color: colors.textMuted,
    textTransform: 'uppercase', paddingHorizontal: 8, paddingVertical: 6,
    borderBottomWidth: 1, borderColor: colors.border, marginBottom: 6,
  },
  dropdownOption: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 12, borderRadius: 8,
  },
  dropdownOptionText: { fontSize: 15, color: colors.text },

  resultCount: { fontSize: 12, color: colors.textMuted, paddingHorizontal: 16, paddingVertical: 8 },

  // List
  list: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 30 },
  card: {
    backgroundColor: colors.white, borderRadius: 12, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: colors.border,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  cardConductor: { fontSize: 15, fontWeight: 'bold', color: colors.text },
  cardVehiculo: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  estadoBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginLeft: 8 },
  estadoText: { fontSize: 9, fontWeight: 'bold' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardDate: { fontSize: 12, color: colors.textMuted },
  photoChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  photoChipText: { fontSize: 12, color: colors.textMuted },

  // Modal
  modalContainer: { flex: 1, backgroundColor: colors.background },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, backgroundColor: colors.white, borderBottomWidth: 1, borderColor: colors.border,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text },
  modalScroll: { flex: 1, padding: 20 },
  section: { marginBottom: 20 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  halfSection: { flex: 1, marginRight: 10 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { fontSize: 11, fontWeight: 'bold', color: colors.textMuted, textTransform: 'uppercase', marginBottom: 4 },
  sectionText: { fontSize: 16, color: colors.text },
  photo: { width: 150, height: 200, borderRadius: 10, marginRight: 10, backgroundColor: colors.border },
  noPhotos: { fontSize: 14, color: colors.textMuted, fontStyle: 'italic', marginTop: 5 },

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

