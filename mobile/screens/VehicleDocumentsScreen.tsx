import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Modal, ActivityIndicator, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../context/ThemeContext';
import { useAlert } from '../context/AlertContext';
import { AppColors, BORDER_RADIUS, SHADOWS, API_URL } from '../constants';
import { authService } from '../services/auth.service';
import axios from 'axios';

// ── Tipos ──────────────────────────────────────────────────────────────────────
type DocKey = 'permisoCirculacion' | 'soap' | 'revisionTecnica' | 'seguro';
interface DocEntry { url: string; vencimiento?: string; }
interface DocumentosVehiculo {
  permisoCirculacion?: DocEntry;
  soap?: DocEntry;
  revisionTecnica?: DocEntry;
  seguro?: DocEntry;
}

const DOC_META: { key: DocKey; label: string; icon: string; color: string }[] = [
  { key: 'permisoCirculacion', label: 'Permiso de Circulación', icon: '📋', color: '#3D9FD3' },
  { key: 'soap',               label: 'SOAP',                   icon: '🛡️', color: '#22C55E' },
  { key: 'revisionTecnica',    label: 'Revisión Técnica',       icon: '🔧', color: '#F59E0B' },
  { key: 'seguro',             label: 'Seguro del Vehículo',    icon: '📄', color: '#8B5CF6' },
];

function getVencimientoStatus(vencimiento?: string): 'vigente' | 'proximo' | 'vencido' | 'sin_fecha' {
  if (!vencimiento) return 'sin_fecha';
  const venc = new Date(vencimiento);
  const diffDays = (venc.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (diffDays < 0) return 'vencido';
  if (diffDays <= 30) return 'proximo';
  return 'vigente';
}

const STATUS_BADGE = {
  vigente:   { bg: '#E8F5E9', text: '#2E7D32', label: '✅ Vigente' },
  proximo:   { bg: '#FFF8E1', text: '#F57F17', label: '⚠️ Por vencer' },
  vencido:   { bg: '#FFEBEE', text: '#C62828', label: '🔴 Vencido' },
  sin_fecha: { bg: '#F5F5F5', text: '#757575', label: '📅 Sin fecha' },
};

// ── Pantalla Principal ────────────────────────────────────────────────────────
export default function VehicleDocumentsScreen({ route, navigation }: any) {
  const { vehicleId, vehicleName, isAdmin, documentosIniciales } = route.params as {
    vehicleId: string; vehicleName: string; isAdmin: boolean; documentosIniciales: DocumentosVehiculo;
  };

  const { colors } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);
  const { showAlert } = useAlert();

  const [documentos, setDocumentos] = useState<DocumentosVehiculo>(documentosIniciales || {});
  const [uploading, setUploading] = useState<DocKey | null>(null);
  const [fullscreenDoc, setFullscreenDoc] = useState<DocEntry | null>(null);
  const [editingDoc, setEditingDoc] = useState<DocKey | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);

  // ── Visor pantalla completa ───────────────────────────────────────────────
  const renderFullscreenViewer = () => (
    <Modal visible={!!fullscreenDoc} transparent animationType="fade">
      <View style={styles.fullscreenOverlay}>
        <TouchableOpacity style={styles.fullscreenClose} onPress={() => setFullscreenDoc(null)}>
          <Ionicons name="close-circle" size={44} color="#fff" />
        </TouchableOpacity>
        {fullscreenDoc && (
          <ScrollView
            maximumZoomScale={4}
            minimumZoomScale={1}
            centerContent
            contentContainerStyle={styles.fullscreenScrollContent}
          >
            <Image
              source={{ uri: fullscreenDoc.url }}
              style={styles.fullscreenImage}
              resizeMode="contain"
            />
          </ScrollView>
        )}
        {fullscreenDoc?.vencimiento && (
          <View style={styles.fullscreenBadge}>
            <Ionicons name="calendar-outline" size={14} color="#fff" style={{ marginRight: 4 }} />
            <Text style={styles.fullscreenBadgeText}>
              Vence: {new Date(fullscreenDoc.vencimiento).toLocaleDateString('es-CL')}
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );

  // ── Flujo de selección imagen (Admin) ────────────────────────────────────
  const pickAndEdit = async (docKey: DocKey, fromCamera: boolean) => {
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.85 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.85 });

    if (!result.canceled && result.assets.length > 0) {
      setSelectedImageUri(result.assets[0].uri);
      setEditingDoc(docKey);
      setSelectedDate(documentos[docKey]?.vencimiento ? new Date(documentos[docKey]!.vencimiento!) : new Date());
      setShowDatePicker(true);
    }
  };

  const handleDateConfirm = async (_: any, date?: Date) => {
    setShowDatePicker(false);
    if (!date || !editingDoc || !selectedImageUri) return;
    await uploadDocumento(editingDoc, selectedImageUri, date);
    setEditingDoc(null);
    setSelectedImageUri(null);
  };

  // ── Subida al backend ─────────────────────────────────────────────────────
  const uploadDocumento = async (docKey: DocKey, imageUri: string, vencimientoDate: Date) => {
    setUploading(docKey);
    try {
      const token = await authService.getToken();
      const formData = new FormData();
      formData.append('tipo', docKey);
      formData.append('vencimiento', vencimientoDate.toISOString());
      formData.append('imagen', { uri: imageUri, name: `${docKey}.jpg`, type: 'image/jpeg' } as any);

      const res = await axios.patch(`${API_URL}/vehicles/${vehicleId}/documento`, formData, {
        headers: { 'Content-Type': 'multipart/form-data', 'Authorization': `Bearer ${token}` },
      });
      setDocumentos(prev => ({ ...prev, [docKey]: res.data.documento }));
      showAlert('✅ Éxito', 'Documento actualizado correctamente.');
    } catch (err: any) {
      console.error(err?.response?.data || err);
      showAlert('Error', 'No se pudo subir el documento.');
    } finally {
      setUploading(null);
    }
  };

  // ── Tarjeta de documento ──────────────────────────────────────────────────
  const renderDocCard = (meta: typeof DOC_META[0]) => {
    const doc = documentos[meta.key];
    const status = getVencimientoStatus(doc?.vencimiento);
    const badge = STATUS_BADGE[status];
    const isUploading = uploading === meta.key;

    return (
      <View key={meta.key} style={[styles.docCard, { borderLeftColor: meta.color }]}>
        {/* Cabecera */}
        <View style={styles.docCardHeader}>
          <View style={[styles.docIconCircle, { backgroundColor: meta.color + '22' }]}>
            <Text style={styles.docIcon}>{meta.icon}</Text>
          </View>
          <View style={styles.docInfo}>
            <Text style={styles.docLabel}>{meta.label}</Text>
            <View style={[styles.badge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
            </View>
            {doc?.vencimiento && (
              <Text style={styles.docFecha}>
                Vence: {new Date(doc.vencimiento).toLocaleDateString('es-CL')}
              </Text>
            )}
          </View>
        </View>

        {/* Imagen / Placeholder */}
        {doc?.url ? (
          <TouchableOpacity activeOpacity={0.9} onPress={() => setFullscreenDoc(doc)} style={styles.docImageContainer}>
            <Image source={{ uri: doc.url }} style={styles.docThumbnail} resizeMode="cover" />
            <View style={styles.zoomHint}>
              <Ionicons name="expand-outline" size={14} color="#fff" />
              <Text style={styles.zoomHintText}>Toca para ampliar</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.docPlaceholder}>
            <Ionicons name="document-outline" size={38} color={colors.grayMedium ?? '#9E9E9E'} />
            <Text style={styles.docPlaceholderText}>Sin documento cargado</Text>
          </View>
        )}

        {/* Botones Admin */}
        {isAdmin && (
          <View style={styles.adminBtnsRow}>
            {isUploading ? (
              <ActivityIndicator color={meta.color} size="small" style={{ marginTop: 12 }} />
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.adminBtn, { borderColor: meta.color, backgroundColor: meta.color + '12' }]}
                  onPress={() => pickAndEdit(meta.key, false)}
                >
                  <Ionicons name="image-outline" size={15} color={meta.color} />
                  <Text style={[styles.adminBtnText, { color: meta.color }]}>Galería</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.adminBtn, { borderColor: meta.color, backgroundColor: meta.color + '12' }]}
                  onPress={() => pickAndEdit(meta.key, true)}
                >
                  <Ionicons name="camera-outline" size={15} color={meta.color} />
                  <Text style={[styles.adminBtnText, { color: meta.color }]}>Cámara</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header con gradiente visual */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Documentos del Vehículo</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>{vehicleName}</Text>
        </View>
        {isAdmin && (
          <View style={styles.adminBadge}>
            <Ionicons name="shield-checkmark-outline" size={13} color="#fff" />
            <Text style={styles.adminBadgeText}> Admin</Text>
          </View>
        )}
      </View>

      {/* Banner informativo para conductores */}
      {!isAdmin && (
        <View style={styles.readonlyBanner}>
          <Ionicons name="information-circle" size={18} color="#1565C0" />
          <Text style={styles.readonlyText}>Solo lectura — Toca para ampliar cualquier documento.</Text>
        </View>
      )}

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {DOC_META.map(renderDocCard)}
      </ScrollView>

      {/* Date picker (luego de elegir imagen) */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          minimumDate={new Date()}
          onChange={handleDateConfirm}
          onValueChange={(date?: Date) => { if (date) setSelectedDate(date); }}
          onDismiss={() => setShowDatePicker(false)}
        />
      )}

      {renderFullscreenViewer()}
    </View>
  );
}

const getStyles = (colors: AppColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    backgroundColor: colors.primary,
    paddingTop: 50,
    paddingBottom: 22,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    ...SHADOWS.elegant,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  headerTextContainer: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.82)', marginTop: 2 },
  adminBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12,
  },
  adminBadgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },

  readonlyBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 16, paddingVertical: 10, gap: 8,
  },
  readonlyText: { color: '#1565C0', fontSize: 13, flex: 1 },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 48 },

  docCard: {
    backgroundColor: colors.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    ...SHADOWS.elegant,
  },
  docCardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  docIconCircle: {
    width: 50, height: 50, borderRadius: 25,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  docIcon: { fontSize: 24 },
  docInfo: { flex: 1 },
  docLabel: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 6 },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 20, marginBottom: 4,
  },
  badgeText: { fontSize: 12, fontWeight: '600' },
  docFecha: { fontSize: 12, color: colors.textMuted, marginTop: 2 },

  docImageContainer: {
    borderRadius: BORDER_RADIUS.md, overflow: 'hidden',
  },
  docThumbnail: { width: '100%', height: 190, borderRadius: BORDER_RADIUS.md },
  zoomHint: {
    position: 'absolute', bottom: 10, right: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 12, gap: 4,
  },
  zoomHintText: { color: '#fff', fontSize: 11 },
  docPlaceholder: {
    height: 120,
    backgroundColor: colors.background,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  docPlaceholderText: { color: colors.textMuted, fontSize: 13 },

  adminBtnsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  adminBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderRadius: BORDER_RADIUS.md, borderWidth: 1.5, gap: 5,
  },
  adminBtnText: { fontSize: 13, fontWeight: '600' },

  fullscreenOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.96)',
    justifyContent: 'center', alignItems: 'center',
  },
  fullscreenClose: { position: 'absolute', top: 52, right: 20, zIndex: 10 },
  fullscreenScrollContent: {
    flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center',
  },
  fullscreenImage: { width: '100%', height: undefined, aspectRatio: 3 / 4 },
  fullscreenBadge: {
    position: 'absolute', bottom: 40, flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 18, paddingVertical: 9, borderRadius: 22,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  fullscreenBadgeText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
