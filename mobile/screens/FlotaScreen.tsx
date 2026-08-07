import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { authService } from '../services/auth.service';
import { COLORS, AppColors } from '../constants';
import { useTheme } from '../context/ThemeContext';
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
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);
  

  const [vehicles, setVehicles] = useState<IVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigation = useNavigation<any>();

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
    authService.getCurrentUser().then(u => {
      if (u && u.rol === 'admin') setIsAdmin(true);
    });
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
          {item.estado === 'reservado' && item.conductorActual && (
            <View style={styles.conductorContainer}>
              <Text style={styles.conductorText}>👤 {item.conductorActual.nombre} {item.conductorActual.apellido}</Text>
              <Text style={styles.conductorDepto}>{item.conductorActual.departamento}</Text>
            </View>
          )}
          <View style={[styles.statusBadge, { backgroundColor: estado.bg }]}>
            <Text style={[styles.statusText, { color: estado.text }]}>{estado.label}</Text>
          </View>
          
          {item.historialHoy && item.historialHoy.length > 0 && (
            <View style={styles.historyContainer}>
              <Text style={styles.historyTitle}>Historial de Hoy:</Text>
              {item.historialHoy.map((res, index) => {
                const horaIni = new Date(res.fechaInicio).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
                const horaFin = new Date(res.fechaFin).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
                return (
                  <View key={index} style={styles.historyItem}>
                    <Text style={styles.historyTime}>{horaIni} - {horaFin}</Text>
                    <Text style={styles.historyUser} numberOfLines={1}>
                      {res.usuario?.nombre} {res.usuario?.apellido}
                    </Text>
                    <Text style={styles.historyState}>({res.estado})</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No hay vehículos registrados en la flota.</Text>
          </View>
        }
      />
      {isAdmin && (
        <TouchableOpacity 
          style={styles.fab} 
          onPress={() => navigation.navigate('AddVehicleAI')}
        >
          <Text style={styles.fabIcon}>🤖</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const getStyles = (colors: AppColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 20,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    color: colors.textMuted,
    fontSize: 14,
  },
  errorText: {
    color: colors.danger,
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryBtnText: {
    color: colors.white,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#8B5CF6',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  fabIcon: { fontSize: 24 },
  emptyContainer: {
    padding: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 16,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.white,
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
    color: colors.text,
  },
  vehicleDetail: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 4,
  },
  conductorContainer: {
    backgroundColor: '#F1F5F9',
    padding: 8,
    borderRadius: 8,
    marginTop: 6,
    marginBottom: 6,
  },
  conductorText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  conductorDepto: {
    fontSize: 11,
    color: colors.textMuted,
    marginLeft: 18,
    marginTop: 2,
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
  historyContainer: {
    marginTop: 15,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  historyTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#555',
    marginBottom: 5,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  historyTime: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    width: 90,
  },
  historyUser: {
    fontSize: 12,
    color: '#333',
    flex: 1,
  },
  historyState: {
    fontSize: 10,
    color: '#888',
    textTransform: 'capitalize',
  },
});
