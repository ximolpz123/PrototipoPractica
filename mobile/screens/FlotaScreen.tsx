import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { COLORS } from '../constants';
import { vehicleService, IVehicle } from '../services/vehicle.service';

const TIPO_ICON: Record<string, string> = {
  pickup: '🛻',
  sedan: '🚗',
  suv: '🚙',
  van: '🚐',
};

const ESTADO_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  disponible: { bg: '#E8F5E9', text: '#2E7D32', label: 'Disponible' },
  reservado: { bg: '#FFF8E1', text: '#F57F17', label: 'En Uso' },
  mantenimiento: { bg: '#FFF3E0', text: '#E65100', label: 'Mantenimiento' },
  fuera_de_servicio: { bg: '#FFEBEE', text: '#C62828', label: 'Fuera de Servicio' },
};

export default function FlotaScreen() {
  const [vehicles, setVehicles] = useState<IVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVehicles = async () => {
    try {
      setError(null);
      const data = await vehicleService.getAll();
      setVehicles(data);
    } catch (err: any) {
      setError('No se pudo cargar la flota. Revisa tu conexión.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchVehicles();
  };

  const renderItem = ({ item }: { item: IVehicle }) => {
    const estado = ESTADO_COLORS[item.estado] ?? { bg: '#F5F5F5', text: '#757575', label: item.estado };
    const icon = TIPO_ICON[item.tipo] ?? '🚗';

    return (
      <View style={styles.card}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>{icon}</Text>
        </View>
        <View style={styles.infoContainer}>
          <Text style={styles.vehicleName}>
            {item.marca} {item.modelo} {item.anio}
          </Text>
          <Text style={styles.vehicleDetail}>🎨 {item.color}  •  🪪 {item.placa}</Text>
          <Text style={styles.vehicleDetail}>🛞 {item.kilometraje.toLocaleString()} km</Text>
          <View style={[styles.statusBadge, { backgroundColor: estado.bg }]}>
            <Text style={[styles.statusText, { color: estado.text }]}>{estado.label}</Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando flota...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchVehicles}>
          <Text style={styles.retryBtnText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Catálogo de Flota</Text>
      <Text style={styles.subtitle}>{vehicles.length} vehículos · Bitnets</Text>

      <FlatList
        data={vehicles}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 20,
  },
  centered: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textMuted,
    fontSize: 14,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryBtnText: {
    color: COLORS.white,
    fontWeight: 'bold',
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
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 3,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EFF4FB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  icon: {
    fontSize: 26,
  },
  infoContainer: {
    flex: 1,
    gap: 4,
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  vehicleDetail: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
});


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
