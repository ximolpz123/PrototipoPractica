import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, ScrollView,
  Animated,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, GRADIENTS, SHADOWS, BORDER_RADIUS } from '../constants';
import { useAlert } from '../context/AlertContext';
import api from '../services/api';

// ─── Tipos ───────────────────────────────────────────────────────────────────
type TipoFlag = 'verde' | 'amarilla' | 'naranja' | 'roja' | 'todas';

interface IFlag {
  _id: string;
  tipo: 'verde' | 'amarilla' | 'naranja' | 'roja';
  motivo: string;
  asignadoPor: 'sistema' | 'admin';
  createdAt: string;
  usuario: {
    _id: string;
    nombre: string;
    apellido: string;
    departamento?: string;
  };
  adminId?: {
    nombre: string;
    apellido: string;
  };
  reserva?: {
    _id: string;
    fechaInicio: string;
    fechaFin: string;
  };
}

// ─── Constantes de Banderas ──────────────────────────────────────────────────
const FLAG_CONFIG = {
  verde:    { emoji: '🟢', label: 'Verde',    color: COLORS.success,  bg: '#F0FDF4', border: COLORS.success },
  amarilla: { emoji: '🟡', label: 'Amarilla', color: '#D97706',       bg: '#FFFBEB', border: '#FBBF24' },
  naranja:  { emoji: '🟠', label: 'Naranja',  color: '#EA580C',       bg: '#FFF7ED', border: '#FB923C' },
  roja:     { emoji: '🔴', label: 'Roja',     color: COLORS.danger,   bg: '#FEF2F2', border: COLORS.danger },
};

function formatFecha(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-CL', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ─── Componente de Tarjeta ───────────────────────────────────────────────────
function FlagCard({ flag, onPress }: { flag: IFlag; onPress: () => void }) {
  const cfg = FLAG_CONFIG[flag.tipo];
  return (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: cfg.border, borderLeftWidth: 4 }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.cardRow}>
        <View style={[styles.flagBadge, { backgroundColor: cfg.bg }]}>
          <Text style={styles.flagEmoji}>{cfg.emoji}</Text>
          <Text style={[styles.flagLabel, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
        <View style={[styles.origenBadge, { backgroundColor: flag.asignadoPor === 'admin' ? '#EFF6FF' : '#F0FDF4' }]}>
          <Ionicons
            name={flag.asignadoPor === 'admin' ? 'person' : 'hardware-chip'}
            size={11}
            color={flag.asignadoPor === 'admin' ? COLORS.info : COLORS.success}
          />
          <Text style={[styles.origenText, { color: flag.asignadoPor === 'admin' ? COLORS.info : COLORS.success }]}>
            {flag.asignadoPor === 'admin' ? 'Manual' : 'Sistema'}
          </Text>
        </View>
      </View>

      <View style={styles.cardUser}>
        <Ionicons name="person-circle-outline" size={18} color={COLORS.primary} />
        <Text style={styles.cardUserName}>
          {flag.usuario?.nombre} {flag.usuario?.apellido}
        </Text>
        {flag.usuario?.departamento && (
          <Text style={styles.cardDept}> · {flag.usuario.departamento}</Text>
        )}
      </View>

      <Text style={styles.cardMotivo} numberOfLines={2}>{flag.motivo}</Text>
      <Text style={styles.cardFecha}>{formatFecha(flag.createdAt)}</Text>

      <View style={styles.cardFooter}>
        <Text style={styles.verDetalle}>Ver detalle →</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Pantalla Principal ──────────────────────────────────────────────────────
export default function AdminBanderasScreen() {
  const { showAlert } = useAlert();
  const [banderas, setBanderas] = useState<IFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filtro, setFiltro] = useState<TipoFlag>('todas');
  const [detailFlag, setDetailFlag] = useState<IFlag | null>(null);
  const [fadeAnim] = useState(new Animated.Value(0));

  const cargarBanderas = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      // Obtenemos todos los usuarios y sus banderas
      const response = await api.get('/flags');
      setBanderas(response.data);
    } catch (err: any) {
      showAlert('Error', 'No se pudieron cargar las banderas.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      cargarBanderas();
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }, [])
  );

  const banderasFiltradas = filtro === 'todas'
    ? banderas
    : banderas.filter(b => b.tipo === filtro);

  const conteo = {
    todas: banderas.length,
    verde: banderas.filter(b => b.tipo === 'verde').length,
    amarilla: banderas.filter(b => b.tipo === 'amarilla').length,
    naranja: banderas.filter(b => b.tipo === 'naranja').length,
    roja: banderas.filter(b => b.tipo === 'roja').length,
  };

  const FILTROS: { key: TipoFlag; emoji: string; label: string }[] = [
    { key: 'todas',    emoji: '📋', label: 'Todas' },
    { key: 'roja',     emoji: '🔴', label: 'Rojas' },
    { key: 'naranja',  emoji: '🟠', label: 'Naranjas' },
    { key: 'amarilla', emoji: '🟡', label: 'Amarillas' },
    { key: 'verde',    emoji: '🟢', label: 'Verdes' },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={GRADIENTS.primaryDark} style={styles.header}>
        <Text style={styles.headerTitle}>🏴 Gestión de Banderas</Text>
        <Text style={styles.headerSub}>Solo lectura — {banderas.length} registros en total</Text>
      </LinearGradient>

      {/* Resumen por color */}
      <Animated.View style={[styles.statsRow, { opacity: fadeAnim }]}>
        {(['roja', 'naranja', 'amarilla', 'verde'] as const).map(tipo => {
          const cfg = FLAG_CONFIG[tipo];
          return (
            <TouchableOpacity key={tipo} style={[styles.statCard, { borderColor: cfg.border }]} onPress={() => setFiltro(tipo)}>
              <Text style={styles.statEmoji}>{cfg.emoji}</Text>
              <Text style={[styles.statCount, { color: cfg.color }]}>{conteo[tipo]}</Text>
              <Text style={styles.statLabel}>{cfg.label}</Text>
            </TouchableOpacity>
          );
        })}
      </Animated.View>

      {/* Filtros */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtrosRow}>
        {FILTROS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filtroBtn, filtro === f.key && styles.filtroBtnActive]}
            onPress={() => setFiltro(f.key)}
          >
            <Text style={[styles.filtroText, filtro === f.key && styles.filtroTextActive]}>
              {f.emoji} {f.label} ({conteo[f.key]})
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Lista */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Cargando banderas...</Text>
        </View>
      ) : banderasFiltradas.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyEmoji}>🎉</Text>
          <Text style={styles.emptyTitle}>Sin registros</Text>
          <Text style={styles.emptyText}>No hay banderas con este filtro.</Text>
        </View>
      ) : (
        <FlatList
          data={banderasFiltradas}
          keyExtractor={item => item._id}
          renderItem={({ item }) => (
            <FlagCard flag={item} onPress={() => setDetailFlag(item)} />
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); cargarBanderas(true); }}
              colors={[COLORS.primary]}
            />
          }
        />
      )}

      {/* Modal de Detalle */}
      <Modal
        visible={!!detailFlag}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailFlag(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {detailFlag && (() => {
              const cfg = FLAG_CONFIG[detailFlag.tipo];
              return (
                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* Encabezado del modal */}
                  <LinearGradient colors={GRADIENTS.primaryDark} style={styles.modalHeader}>
                    <Text style={styles.modalHeaderTitle}>Detalle de Bandera</Text>
                    <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setDetailFlag(null)}>
                      <Ionicons name="close" size={22} color="white" />
                    </TouchableOpacity>
                  </LinearGradient>

                  <View style={styles.modalBody}>
                    {/* Tipo de bandera */}
                    <View style={[styles.modalFlagBadge, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
                      <Text style={styles.modalFlagEmoji}>{cfg.emoji}</Text>
                      <Text style={[styles.modalFlagTipo, { color: cfg.color }]}>Bandera {cfg.label}</Text>
                    </View>

                    {/* Conductor */}
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>👤 Conductor</Text>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Nombre</Text>
                        <Text style={styles.detailValue}>
                          {detailFlag.usuario?.nombre} {detailFlag.usuario?.apellido}
                        </Text>
                      </View>
                      {detailFlag.usuario?.departamento && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Departamento</Text>
                          <Text style={styles.detailValue}>{detailFlag.usuario.departamento}</Text>
                        </View>
                      )}
                    </View>

                    {/* Motivo */}
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>📝 Motivo</Text>
                      <View style={[styles.motivoBox, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
                        <Text style={[styles.motivoText, { color: cfg.color }]}>{detailFlag.motivo}</Text>
                      </View>
                    </View>

                    {/* Origen */}
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>🔍 Origen</Text>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Asignado por</Text>
                        <View style={[styles.origenBadge, { backgroundColor: detailFlag.asignadoPor === 'admin' ? '#EFF6FF' : '#F0FDF4' }]}>
                          <Ionicons
                            name={detailFlag.asignadoPor === 'admin' ? 'person' : 'hardware-chip'}
                            size={12}
                            color={detailFlag.asignadoPor === 'admin' ? COLORS.info : COLORS.success}
                          />
                          <Text style={[styles.origenText, { color: detailFlag.asignadoPor === 'admin' ? COLORS.info : COLORS.success }]}>
                            {detailFlag.asignadoPor === 'admin' ? 'Admin Manual' : 'Sistema Automático'}
                          </Text>
                        </View>
                      </View>
                      {detailFlag.adminId && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Admin</Text>
                          <Text style={styles.detailValue}>
                            {detailFlag.adminId.nombre} {detailFlag.adminId.apellido}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Fecha */}
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>📅 Fecha</Text>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Registrada el</Text>
                        <Text style={styles.detailValue}>{formatFecha(detailFlag.createdAt)}</Text>
                      </View>
                    </View>

                    {/* Reserva vinculada */}
                    {detailFlag.reserva && (
                      <View style={styles.detailSection}>
                        <Text style={styles.detailSectionTitle}>🚗 Reserva Vinculada</Text>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Inicio</Text>
                          <Text style={styles.detailValue}>{formatFecha(detailFlag.reserva.fechaInicio)}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Fin</Text>
                          <Text style={styles.detailValue}>{formatFecha(detailFlag.reserva.fechaFin)}</Text>
                        </View>
                      </View>
                    )}

                    <TouchableOpacity style={styles.modalCloseButton} onPress={() => setDetailFlag(null)}>
                      <Text style={styles.modalCloseButtonText}>Cerrar</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              );
            })()}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Estilos ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: -14,
    marginBottom: 12,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.sm,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    ...SHADOWS.elegant,
  },
  statEmoji: {
    fontSize: 18,
    marginBottom: 2,
  },
  statCount: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  filtrosRow: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  filtroBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filtroBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filtroText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  filtroTextActive: {
    color: 'white',
    fontWeight: '700',
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 12,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.sm,
    padding: 14,
    ...SHADOWS.elegant,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  flagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.round,
    gap: 4,
  },
  flagEmoji: {
    fontSize: 13,
  },
  flagLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  origenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.round,
    gap: 3,
  },
  origenText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  cardUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  cardDept: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  cardMotivo: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
    marginBottom: 6,
  },
  cardFecha: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 6,
  },
  cardFooter: {
    alignItems: 'flex-end',
  },
  verDetalle: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '700',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  emptyEmoji: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  modalHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
    gap: 16,
  },
  modalFlagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1.5,
  },
  modalFlagEmoji: {
    fontSize: 28,
  },
  modalFlagTipo: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  detailSection: {
    gap: 8,
  },
  detailSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailLabel: {
    fontSize: 14,
    color: COLORS.textMuted,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    flex: 2,
    textAlign: 'right',
  },
  motivoBox: {
    padding: 14,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
  },
  motivoText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  modalCloseButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.sm,
    padding: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  modalCloseButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
