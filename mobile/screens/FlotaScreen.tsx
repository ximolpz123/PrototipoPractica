import React from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity } from 'react-native';
import { COLORS } from '../constants';

const VEHICLES = [
  { id: '1', nombre: 'Camioneta Roja', patente: 'AB-CD-12', estado: 'Disponible', icon: '🚙' },
  { id: '2', nombre: 'Camioneta Blanca', patente: 'EF-GH-34', estado: 'En Uso', icon: '🚐' },
  { id: '3', nombre: 'Camioneta Azul', patente: 'IJ-KL-56', estado: 'Mantenimiento', icon: '🚙' },
  { id: '4', nombre: 'Auto Café', patente: 'MN-OP-78', estado: 'Disponible', icon: '🚗' },
];

export default function FlotaScreen() {
  const renderItem = ({ item }: any) => (
    <View style={styles.card}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{item.icon}</Text>
      </View>
      <View style={styles.infoContainer}>
        <Text style={styles.vehicleName}>{item.nombre}</Text>
        <Text style={styles.vehiclePatente}>Patente: {item.patente}</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{item.estado}</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.reserveBtn}>
        <Text style={styles.reserveBtnText}>Ver</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Catálogo de Flota</Text>
      <Text style={styles.subtitle}>Vehículos asignados a Bitnets</Text>
      
      <FlatList
        data={VEHICLES}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    paddingHorizontal: 20,
    marginBottom: 20,
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
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F0F4F8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  icon: {
    fontSize: 24,
  },
  infoContainer: {
    flex: 1,
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  vehiclePatente: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 8,
  },
  statusBadge: {
    backgroundColor: '#E1F5FE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '600',
  },
  reserveBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  reserveBtnText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
});
