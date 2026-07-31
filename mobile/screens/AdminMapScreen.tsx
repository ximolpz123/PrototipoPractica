import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { COLORS } from '../constants';
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
  const { showAlert } = useAlert();
  const [vehicles, setVehicles] = useState<IVehicleLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [myLocation, setMyLocation] = useState<{ latitude: number; longitude: number } | null>(null);

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

  const fetchMyLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    setMyLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
  };

  useFocusEffect(
    useCallback(() => {
      fetchLocations();
      fetchMyLocation();
      // Polling cada 30 segundos mientras la pantalla esté activa
      const interval = setInterval(fetchLocations, 30000);
      return () => clearInterval(interval);
    }, [])
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando mapa...</Text>
      </View>
    );
  }

  // Centrar el mapa en la última ubicación conocida de los vehículos, o en Santiago por defecto
  const santiago = { latitude: -33.4489, longitude: -70.6693, latitudeDelta: 0.1, longitudeDelta: 0.1 };
  
  const activeVehicles = vehicles.filter(v => v.ubicacionActual);
  const initialRegion = activeVehicles.length > 0
    ? {
        latitude: activeVehicles[0].ubicacionActual!.latitud,
        longitude: activeVehicles[0].ubicacionActual!.longitud,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      }
    : santiago;

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation={true}
      >
        {activeVehicles.map(v => (
          <Marker
            key={v._id}
            coordinate={{
              latitude: v.ubicacionActual!.latitud,
              longitude: v.ubicacionActual!.longitud,
            }}
          >
            <View style={styles.markerContainer}>
              <Ionicons name="car-sport" size={24} color={COLORS.white} />
            </View>
            <Callout tooltip>
              <View style={styles.callout}>
                <Text style={styles.calloutTitle}>{v.marca} {v.modelo}</Text>
                <Text style={styles.calloutText}>Placa: {v.placa}</Text>
                {v.conductor && (
                  <View style={styles.driverInfo}>
                    <Ionicons name="person" size={12} color={COLORS.textMuted} />
                    <Text style={styles.calloutDriver}>{v.conductor.nombre} {v.conductor.apellido}</Text>
                  </View>
                )}
                <Text style={styles.calloutTime}>
                  Actualizado: {new Date(v.ubicacionActual!.timestamp).toLocaleTimeString()}
                </Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      <TouchableOpacity style={styles.refreshBtn} onPress={fetchLocations} disabled={refreshing}>
        {refreshing ? (
          <ActivityIndicator size="small" color={COLORS.white} />
        ) : (
          <Ionicons name="refresh" size={24} color={COLORS.white} />
        )}
      </TouchableOpacity>

      <View style={styles.legend}>
        <Text style={styles.legendText}>🚗 Vehículos en ruta: {activeVehicles.length}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: COLORS.textMuted },
  map: { width: '100%', height: '100%' },
  markerContainer: {
    backgroundColor: COLORS.primary,
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  callout: {
    backgroundColor: COLORS.white,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 140,
  },
  calloutTitle: { fontWeight: 'bold', fontSize: 14, color: COLORS.text },
  calloutText: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  driverInfo: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  calloutDriver: { fontSize: 12, color: COLORS.text, marginLeft: 4, fontWeight: '600' },
  calloutTime: { fontSize: 10, color: COLORS.primary, marginTop: 6, fontStyle: 'italic' },
  refreshBtn: {
    position: 'absolute',
    top: 20,
    left: 20,
    backgroundColor: COLORS.primary,
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
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  legendText: { fontSize: 14, fontWeight: 'bold', color: COLORS.text },
});
