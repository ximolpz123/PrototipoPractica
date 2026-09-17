import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
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
  
  const [activeTab, setActiveTab] = useState<'en_vivo' | 'historico'>('en_vivo');
  
  // Estado para "En Vivo"
  const [vehicles, setVehicles] = useState<IVehicleLocation[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<IVehicleLocation | null>(null);
  
  // Estado para "Histórico"
  const [todayRoutes, setTodayRoutes] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLiveLocations = async () => {
    try {
      setRefreshing(true);
      const response = await api.get('/tracking/active');
      setVehicles(response.data);
    } catch (err) {
      showAlert('Error', 'No se pudieron cargar las ubicaciones en vivo.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchTodayRoutes = async () => {
    try {
      setRefreshing(true);
      const response = await api.get('/tracking/routes/today');
      setTodayRoutes(response.data);
    } catch (err) {
      showAlert('Error', 'No se pudieron cargar las rutas de hoy.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadData = () => {
    if (activeTab === 'en_vivo') {
      fetchLiveLocations();
    } else {
      fetchTodayRoutes();
    }
  };

  useFocusEffect(
    useCallback(() => {
      // Solicitar permisos para poder mostrar la ubicación del Admin
      (async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.log('Permiso de ubicación denegado para el Admin');
        }
      })();

      loadData();
      
      let interval: any;
      if (activeTab === 'en_vivo') {
        interval = setInterval(fetchLiveLocations, 30000);
      }
      return () => {
        if (interval) clearInterval(interval);
      };
    }, [activeTab])
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando mapa...</Text>
      </View>
    );
  }

  const santiago = { latitude: -33.4489, longitude: -70.6693, latitudeDelta: 0.1, longitudeDelta: 0.1 };
  const activeVehicles = vehicles.filter(v => v.ubicacionActual);
  
  let initialRegion = santiago;
  if (activeTab === 'en_vivo' && activeVehicles.length > 0) {
    initialRegion = {
      latitude: activeVehicles[0].ubicacionActual!.latitud,
      longitude: activeVehicles[0].ubicacionActual!.longitud,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };
  } else if (activeTab === 'historico' && todayRoutes.length > 0 && todayRoutes[0].ruta.length > 0) {
    initialRegion = {
      latitude: todayRoutes[0].ruta[0].latitud,
      longitude: todayRoutes[0].ruta[0].longitud,
      latitudeDelta: 0.1,
      longitudeDelta: 0.1,
    };
  }

  const formatTimestamp = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // Colores para trazar diferentes vehículos en el mapa histórico
  const routeColors = ['#3498DB', '#E74C3C', '#9B59B6', '#F39C12', '#1ABC9C', '#34495E'];

  return (
    <View style={styles.container}>
      {/* ─── Pestañas Selectoras ─── */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'en_vivo' && styles.activeTab]}
          onPress={() => {
            setActiveTab('en_vivo');
            setSelectedVehicle(null);
            setLoading(true);
          }}
        >
          <Ionicons name="radio" size={16} color={activeTab === 'en_vivo' ? '#fff' : colors.textMuted} style={{marginRight: 6}} />
          <Text style={[styles.tabText, activeTab === 'en_vivo' && styles.activeTabText]}>En Vivo</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'historico' && styles.activeTab]}
          onPress={() => {
            setActiveTab('historico');
            setSelectedVehicle(null);
            setLoading(true);
          }}
        >
          <Ionicons name="map" size={16} color={activeTab === 'historico' ? '#fff' : colors.textMuted} style={{marginRight: 6}} />
          <Text style={[styles.tabText, activeTab === 'historico' && styles.activeTabText]}>Histórico Hoy</Text>
        </TouchableOpacity>
      </View>

      <MapView
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation={true}
        showsMyLocationButton={true}
        onPress={() => setSelectedVehicle(null)}
      >
        {/* ─── Render: En Vivo ─── */}
        {activeTab === 'en_vivo' && activeVehicles.map(v => (
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

        {/* ─── Render: Histórico Hoy (Líneas) ─── */}
        {activeTab === 'historico' && todayRoutes.map((routeObj, index) => {
          const color = routeColors[index % routeColors.length];
          const coordinates = routeObj.ruta.map((p: any) => ({
            latitude: p.latitud,
            longitude: p.longitud,
          }));

          if (coordinates.length === 0) return null;

          return (
            <React.Fragment key={routeObj.vehiculo._id}>
              <Polyline
                coordinates={coordinates}
                strokeColor={color}
                strokeWidth={4}
              />
              <Marker
                coordinate={coordinates[0]}
                title={`${routeObj.vehiculo.marca} - Inicio`}
              >
                <Ionicons name="location" size={25} color={color} />
              </Marker>
              <Marker
                coordinate={coordinates[coordinates.length - 1]}
                title={`${routeObj.vehiculo.marca} - Actual`}
              >
                <Ionicons name="flag" size={25} color={color} />
              </Marker>
            </React.Fragment>
          );
        })}
      </MapView>

      {/* Botón de refresco */}
      <TouchableOpacity style={styles.refreshBtn} onPress={loadData} disabled={refreshing}>
        {refreshing ? (
          <ActivityIndicator size="small" color={colors.white} />
        ) : (
          <Ionicons name="refresh" size={22} color={colors.white} />
        )}
      </TouchableOpacity>

      {/* Indicador de items activos/mostrados */}
      <View style={styles.legend}>
        <Ionicons name="analytics" size={14} color={colors.primary} />
        <Text style={styles.legendText}>
          {activeTab === 'en_vivo' 
            ? `  ${activeVehicles.length} vehículo(s) en ruta` 
            : `  ${todayRoutes.length} ruta(s) trazada(s) hoy`}
        </Text>
      </View>

      {/* Panel de detalles del vehículo seleccionado (Solo En Vivo) */}
      {activeTab === 'en_vivo' && selectedVehicle && (
        <View style={styles.detailPanel}>
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

  // Tabs
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    padding: 10,
    paddingTop: 50, // SafeArea approximation
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 4,
    zIndex: 10,
  },
  tab: {
    flexDirection: 'row',
    flex: 1,
    paddingVertical: 10,
    marginHorizontal: 5,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  activeTabText: {
    color: colors.white,
  },

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
    top: 130, // debajo de las pestañas
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
    top: 130,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
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
