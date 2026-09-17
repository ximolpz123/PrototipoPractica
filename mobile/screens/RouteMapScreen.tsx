import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { AppColors } from '../constants';

export default function RouteMapScreen({ route, navigation }: any) {
  const { reservaId } = route.params;
  const { colors } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);

  const [routePoints, setRoutePoints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRoute = async () => {
      try {
        const response = await api.get(`/tracking/${reservaId}/history`);
        setRoutePoints(response.data);
      } catch (err) {
        console.error('Error fetching route history', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRoute();
  }, [reservaId]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando trazado de ruta...</Text>
      </View>
    );
  }

  if (routePoints.length === 0) {
    return (
      <View style={styles.centered}>
        <Ionicons name="map-outline" size={50} color={colors.textMuted} />
        <Text style={styles.loadingText}>No hay datos GPS para esta reserva.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={{color: 'white', fontWeight: 'bold'}}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Parsear puntos para Polyline
  const coordinates = routePoints.map(p => ({
    latitude: p.latitud,
    longitude: p.longitud,
  }));

  const startPoint = coordinates[0];
  const endPoint = coordinates[coordinates.length - 1];

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: startPoint.latitude,
          longitude: startPoint.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        <Polyline
          coordinates={coordinates}
          strokeColor={colors.primary}
          strokeWidth={4}
        />
        
        {/* Pin de Inicio */}
        <Marker coordinate={startPoint} title="Inicio del viaje">
          <Ionicons name="location" size={30} color="#27AE60" />
        </Marker>

        {/* Pin de Fin */}
        <Marker coordinate={endPoint} title="Fin del viaje">
          <Ionicons name="flag" size={30} color="#E74C3C" />
        </Marker>
      </MapView>

      <View style={styles.infoPanel}>
        <Text style={styles.infoTitle}>Detalles del Trazado</Text>
        <Text style={styles.infoText}>Puntos de GPS registrados: {routePoints.length}</Text>
      </View>
    </View>
  );
}

const getStyles = (colors: AppColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: colors.textMuted },
  map: { flex: 1 },
  infoPanel: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    backgroundColor: colors.white,
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  infoTitle: { fontWeight: 'bold', fontSize: 15, color: colors.text, marginBottom: 5 },
  infoText: { fontSize: 13, color: colors.textMuted },
  backBtn: { marginTop: 20, backgroundColor: colors.primary, padding: 12, borderRadius: 8 }
});
