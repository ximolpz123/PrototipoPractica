import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Animated } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { COLORS, AppColors } from '../constants';
import { useTheme } from '../context/ThemeContext';
import { useAlert } from '../context/AlertContext';

interface IVehicleLocation {
  _id: string;
  placa: string;
  marca: string;
  modelo: string;
  ubicacionActual?: {
    latitud: number;
    longitud: number;
    timestamp: string;
  };
  conductor?: {
    nombre: string;
    apellido: string;
    email: string;
  };
}

export default function AdminMapScreen() {
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);
  

  const { showAlert } = useAlert();
  const [vehicles, setVehicles] = useState<IVehicleLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<IVehicleLocation | null>(null);

  const fetchLocations = async () => {
    try {
      setRefreshing(true);
      const response = await api.get('/tracking/active');
      setVehicles(response.data);
    } catch (err) {
      showAlert('Error', 'No se pudieron cargar las ubicaciones.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchLocations();
      const interval = setInterval(fetchLocations, 30000);
      return () => clearInterval(interval);
    }, [])
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando mapa...</Text>
      </View>
    );
  }

  const santiago = { latitude: -33.4489, longitude: -70.6693, latitudeDelta: 0.1, longitudeDelta: 0.1 };
  const activeVehicles = vehicles.filter(v => v.ubicacionActual);
  const initialRegion = activeVehicles.length > 0
    ? {
        latitude: activeVehicles[0].ubicacionActual!.latitud,
        longitude: activeVehicles[0].ubicacionActual!.longitud,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }
    : santiago;

  const formatTimestamp = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation={true}
        onPress={() => setSelectedVehicle(null)}
      >
        {activeVehicles.map(v => (
          <Marker
            key={v._id}
            coordinate={{
              latitude: v.ubicacionActual!.latitud,
              longitude: v.ubicacionActual!.longitud,
            }}
            onPress={() => setSelectedVehicle(v)}
          >
            <View style={[styles.markerContainer, selectedVehicle?._id === v._id && styles.markerSelected]}>
              <Ionicons name="car-sport" size={22} color={colors.white} />
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Botón de refresco */}
      <TouchableOpacity style={styles.refreshBtn} onPress={fetchLocations} disabled={refreshing}>
        {refreshing ? (
          <ActivityIndicator size="small" color={colors.white} />
        ) : (
          <Ionicons name="refresh" size={22} color={colors.white} />
        )}
      </TouchableOpacity>

      {/* Contador de vehículos activos */}
      <View style={styles.legend}>
        <Ionicons name="car-sport" size={14} color={colors.primary} />
        <Text style={styles.legendText}>  {activeVehicles.length} vehículo(s) en ruta</Text>
      </View>

      {/* Panel de detalles del vehículo seleccionado */}
      {selectedVehicle && (
        <View style={styles.detailPanel}>
          {/* Header */}
          <View style={styles.detailHeader}>
            <View style={styles.detailIconBox}>
              <Ionicons name="car-sport" size={26} color={colors.white} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.detailTitle}>{selectedVehicle.marca} {selectedVehicle.modelo}</Text>
              <View style={styles.statusBadge}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>En ruta</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setSelectedVehicle(null)} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Filas de info */}
          <View style={styles.detailRow}>
            <Ionicons name="card-outline" size={16} color={colors.primary} />
            <Text style={styles.detailLabel}>Placa</Text>
            <Text style={styles.detailValue}>{selectedVehicle.placa}</Text>
          </View>

          {selectedVehicle.conductor && (
            <View style={styles.detailRow}>
              <Ionicons name="person-outline" size={16} color={colors.primary} />
              <Text style={styles.detailLabel}>Conductor</Text>
              <Text style={styles.detailValue}>
                {selectedVehicle.conductor.nombre} {selectedVehicle.conductor.apellido}
              </Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={16} color={colors.primary} />
            <Text style={styles.detailLabel}>Última señal</Text>
            <Text style={styles.detailValue}>
              {formatTimestamp(selectedVehicle.ubicacionActual!.timestamp)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={16} color={colors.primary} />
            <Text style={styles.detailLabel}>Coordenadas</Text>
            <Text style={styles.detailValue}>
              {selectedVehicle.ubicacionActual!.latitud.toFixed(4)}, {selectedVehicle.ubicacionActual!.longitud.toFixed(4)}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const getStyles = (colors: AppColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: colors.textMuted },
  map: { flex: 1 },

  markerContainer: {
    backgroundColor: colors.primary,
    padding: 8,
    borderRadius: 24,
    borderWidth: 2.5,
    borderColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 6,
  },
  markerSelected: {
    backgroundColor: '#E67E22',
    borderColor: '#FFF',
    transform: [{ scale: 1.15 }],
  },

  refreshBtn: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: colors.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },

  legend: {
    position: 'absolute',
    top: 16,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
  },
  legendText: { fontSize: 13, fontWeight: '700', color: colors.text },

  // Panel de detalles inferior
  detailPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailIconBox: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    padding: 10,
  },
  detailTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: colors.text,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#27AE60',
    marginRight: 5,
  },
  statusText: {
    fontSize: 12,
    color: '#27AE60',
    fontWeight: '600',
  },
  closeBtn: {
    padding: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  detailLabel: {
    fontSize: 13,
    color: colors.textMuted,
    marginLeft: 8,
    flex: 1,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    flex: 2,
    textAlign: 'right',
  },
});
