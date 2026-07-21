import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { COLORS } from '../constants';

const RESERVATIONS = [
  { id: '1', vehiculo: 'SUV Nissan', fecha: '21 Jul, 2026', hora: '10:00 - 12:00', estado: 'Activa' },
  { id: '2', vehiculo: 'Camioneta Blanca', fecha: '19 Jul, 2026', hora: '08:30 - 14:00', estado: 'Completada' },
  { id: '3', vehiculo: 'Auto Café', fecha: '15 Jul, 2026', hora: '15:00 - 17:00', estado: 'Cancelada' },
];

export default function MisReservasScreen() {
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
        <TouchableOpacity style={styles.newBtn}>
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
