import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, TextInput, Modal, Image, ScrollView
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

export default function AdminHistoryScreen() {
  const [reservas, setReservas] = useState<IReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal states
  const [selectedReserva, setSelectedReserva] = useState<IReservation | null>(null);

  const cargarReservas = async () => {
    try {
      setLoading(true);
      const todas = await reservationService.getAllReservations();
      // Ordenar por más recientes primero
      todas.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setReservas(todas);
    } catch (err) {
      Alert.alert('Error', 'No se pudo cargar el historial.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      cargarReservas();
    }, [])
  );

  const filteredReservas = reservas.filter((r) => {
    const q = search.toLowerCase();
    const vehiculoStr = r.vehiculo ? `${r.vehiculo.marca} ${r.vehiculo.modelo} ${r.vehiculo.placa}`.toLowerCase() : '';
    const conductorStr = r.usuario ? `${r.usuario.nombre} ${r.usuario.apellido}`.toLowerCase() : '';
    return vehiculoStr.includes(q) || conductorStr.includes(q) || r.estado.includes(q);
  });

  const renderReserva = ({ item }: { item: IReservation }) => {
    const color = ESTADO_COLOR[item.estado] ?? COLORS.textMuted;
    const vehiculo = item.vehiculo
      ? `${item.vehiculo.marca} ${item.vehiculo.modelo} · ${item.vehiculo.placa}`
      : 'Vehículo desconocido';
    const conductor = item.usuario
      ? `${item.usuario.nombre} ${item.usuario.apellido}`
      : 'Usuario desconocido';

    return (
      <TouchableOpacity 
        style={styles.card} 
        onPress={() => setSelectedReserva(item)}
      >
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
          <Text style={styles.infoLine}>📅 Inicio: {formatFecha(item.fechaInicio)}</Text>
          <Text style={styles.infoLine}>📍 Destino: {item.destino}</Text>
          
          <View style={styles.photosIndicator}>
            <Ionicons name="camera-outline" size={14} color={COLORS.textMuted} />
            <Text style={styles.photosText}>
              Evidencia: {(item.fotosSalida?.length || 0) + (item.fotosRetorno?.length || 0)} fotos
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por placa, conductor o estado..."
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Cargando historial...</Text>
        </View>
      ) : filteredReservas.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyText}>No se encontraron resultados.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredReservas}
          keyExtractor={(item) => item._id}
          renderItem={renderReserva}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Modal para ver detalles y fotos */}
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
                <Text style={styles.sectionText}>{selectedReserva.usuario ? `${selectedReserva.usuario.nombre} ${selectedReserva.usuario.apellido}` : 'N/A'}</Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Vehículo</Text>
                <Text style={styles.sectionText}>{selectedReserva.vehiculo ? `${selectedReserva.vehiculo.marca} ${selectedReserva.vehiculo.modelo} (${selectedReserva.vehiculo.placa})` : 'N/A'}</Text>
              </View>

              <View style={styles.sectionRow}>
                <View style={styles.halfSection}>
                  <Text style={styles.sectionTitle}>Odómetro Salida</Text>
                  <Text style={styles.sectionText}>{selectedReserva.kmSalida ? `${selectedReserva.kmSalida} km` : '-'}</Text>
                </View>
                <View style={styles.halfSection}>
                  <Text style={styles.sectionTitle}>Odómetro Retorno</Text>
                  <Text style={styles.sectionText}>{selectedReserva.kmRetorno ? `${selectedReserva.kmRetorno} km` : '-'}</Text>
                </View>
              </View>

              {selectedReserva.observaciones && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Observaciones del Conductor</Text>
                  <Text style={styles.sectionText}>{selectedReserva.observaciones}</Text>
                </View>
              )}

              {/* Fotos de Salida */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Evidencia Salida ({selectedReserva.fotosSalida?.length || 0})</Text>
                {selectedReserva.fotosSalida && selectedReserva.fotosSalida.length > 0 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
                    {selectedReserva.fotosSalida.map((url, index) => (
                      <Image key={index} source={{ uri: url }} style={styles.photo} />
                    ))}
                  </ScrollView>
                ) : (
                  <Text style={styles.noPhotos}>Sin fotos registradas al inicio del viaje.</Text>
                )}
              </View>

              {/* Fotos de Retorno */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Evidencia Retorno ({selectedReserva.fotosRetorno?.length || 0})</Text>
                {selectedReserva.fotosRetorno && selectedReserva.fotosRetorno.length > 0 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
                    {selectedReserva.fotosRetorno.map((url, index) => (
                      <Image key={index} source={{ uri: url }} style={styles.photo} />
                    ))}
                  </ScrollView>
                ) : (
                  <Text style={styles.noPhotos}>Sin fotos registradas al finalizar el viaje.</Text>
                )}
              </View>
            </ScrollView>
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
  
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.text },

  list: { paddingHorizontal: 16, paddingBottom: 30 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  cardConductor: { fontSize: 15, fontWeight: 'bold', color: COLORS.text },
  cardVehiculo: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  estadoBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginLeft: 8 },
  estadoText: { fontSize: 10, fontWeight: 'bold' },
  cardBody: { backgroundColor: '#F8FAFC', borderRadius: 8, padding: 10, gap: 4 },
  infoLine: { fontSize: 13, color: COLORS.text },
  photosIndicator: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 },
  photosText: { fontSize: 12, color: COLORS.textMuted },

  modalContainer: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, backgroundColor: COLORS.white, borderBottomWidth: 1, borderColor: COLORS.border
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  modalScroll: { flex: 1, padding: 20 },
  section: { marginBottom: 20 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  halfSection: { flex: 1 },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', color: COLORS.textMuted, textTransform: 'uppercase', marginBottom: 5 },
  sectionText: { fontSize: 16, color: COLORS.text },
  photoScroll: { flexDirection: 'row', marginTop: 10 },
  photo: { width: 140, height: 180, borderRadius: 10, marginRight: 10, backgroundColor: '#eee' },
  noPhotos: { fontSize: 14, color: COLORS.textMuted, fontStyle: 'italic', marginTop: 5 },
});
