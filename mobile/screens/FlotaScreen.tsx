import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Image, ScrollView, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { authService } from '../services/auth.service';
import { COLORS, AppColors, BORDER_RADIUS, SHADOWS } from '../constants';
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

  // Modals
  const [selectedVehicleDetails, setSelectedVehicleDetails] = useState<IVehicle | null>(null);
  const [selectedQR, setSelectedQR] = useState<string | null>(null);

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
      <TouchableOpacity 
        style={styles.card} 
        activeOpacity={0.7} 
        onPress={() => setSelectedVehicleDetails(item)}
      >
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>{icon}</Text>
        </View>
        <View style={styles.infoContainer}>
          <View style={styles.cardHeader}>
            <Text style={styles.vehicleName}>
              {item.marca} {item.modelo} {item.anio}
            </Text>
            {isAdmin && (
              <TouchableOpacity 
                style={styles.qrBtnCard} 
                onPress={(e) => {
                  e.stopPropagation();
                  setSelectedQR(item._id);
                }}
              >
                <Ionicons name="qr-code-outline" size={20} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.vehicleDetail}>🎨 {item.color}  •  🪪 {item.placa}</Text>
          <Text style={styles.vehicleDetail}>🛞 {item.kilometraje.toLocaleString()} km</Text>
          {item.estado === 'reservado' && (item.conductoresActivos || item.conductorActual) && (
            <View style={styles.conductorContainer}>
              {item.conductoresActivos && item.conductoresActivos.length > 0 ? (
                item.conductoresActivos.map((conductor: any, index: number) => (
                  <View key={conductor._id || index} style={{ marginBottom: index !== item.conductoresActivos!.length - 1 ? 6 : 0 }}>
                    <Text style={styles.conductorText}>
                      {index === 0 ? '🟢 Inicio:' : '🔄 Relevó:'} {conductor.nombre} {conductor.apellido}
                    </Text>
                    <Text style={styles.conductorDepto}>{conductor.departamento}</Text>
                  </View>
                ))
              ) : item.conductorActual ? (
                <View>
                  <Text style={styles.conductorText}>👨‍✈️ {item.conductorActual.nombre} {item.conductorActual.apellido}</Text>
                  <Text style={styles.conductorDepto}>{item.conductorActual.departamento}</Text>
                </View>
              ) : null}
            </View>
          )}
          <View style={[styles.statusBadge, { backgroundColor: estado.bg }]}>
            <Text style={[styles.statusText, { color: estado.text }]}>{estado.label}</Text>
          </View>
        </View>
      </TouchableOpacity>
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

      {/* Modal Detalles Vehículo */}
      <Modal visible={!!selectedVehicleDetails} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.bottomSheetIndicator} />
            {selectedVehicleDetails && (
              <>
                <Text style={styles.modalTitle}>
                  {selectedVehicleDetails.marca} {selectedVehicleDetails.modelo}
                </Text>
                
                {selectedVehicleDetails.historialHoy && selectedVehicleDetails.historialHoy.length > 0 && (
                  <View style={styles.historyContainer}>
                    <Text style={styles.historyTitle}>Historial de Hoy:</Text>
                    {selectedVehicleDetails.historialHoy.map((res, index) => {
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

                {selectedVehicleDetails.fotosVehiculo && selectedVehicleDetails.fotosVehiculo.length > 0 && (
                  <View style={styles.fotosWrapper}>
                    <Text style={styles.historyTitle}>Fotos del Vehículo:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.fotosScroll}>
                      {selectedVehicleDetails.fotosVehiculo.map((foto, index) => (
                        <Image key={index} source={{ uri: foto }} style={styles.galeriaFoto} />
                      ))}
                    </ScrollView>
                  </View>
                )}

                <TouchableOpacity 
                  style={styles.closeBtn} 
                  onPress={() => setSelectedVehicleDetails(null)}
                >
                  <Text style={styles.closeBtnText}>Cerrar Detalles</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal QR */}
      <Modal visible={!!selectedQR} transparent animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View style={styles.modalCardCenter}>
            <Text style={styles.modalTitle}>Código QR de Vehículo</Text>
            <Text style={{ textAlign: 'center', marginBottom: 20, color: colors.textMuted }}>
              Muestra este código para que el conductor lo escanee al iniciar.
            </Text>
            {selectedQR && (
              <View style={{ alignItems: 'center', marginVertical: 20 }}>
                <QRCode
                  value={selectedQR}
                  size={200}
                  color={colors.primaryDark}
                  backgroundColor={colors.white}
                />
              </View>
            )}
            <TouchableOpacity 
              style={styles.closeBtn} 
              onPress={() => setSelectedQR(null)}
            >
              <Text style={styles.closeBtnText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  qrBtnCard: {
    padding: 6,
    backgroundColor: colors.primary + '15',
    borderRadius: 8,
  },
  vehicleDetail: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 4,
  },
  conductorContainer: {
    backgroundColor: colors.background,
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
  fotosWrapper: {
    marginTop: 15,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  fotosScroll: {
    marginTop: 8,
    flexDirection: 'row',
  },
  galeriaFoto: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: '#E0E0E0',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.white,
    borderTopLeftRadius: BORDER_RADIUS?.xl || 32,
    borderTopRightRadius: BORDER_RADIUS?.xl || 32,
    padding: 28,
    paddingTop: 16,
    paddingBottom: 40,
    ...SHADOWS?.elegant,
  },
  bottomSheetIndicator: {
    width: 40,
    height: 5,
    backgroundColor: colors.border,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 15,
  },
  closeBtn: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  closeBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCardCenter: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 25,
    width: '100%',
    alignItems: 'center',
    ...SHADOWS?.elegant,
  },
});
