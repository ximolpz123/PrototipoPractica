import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, ActivityIndicator, TextInput, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../constants';
import { useAlert } from '../context/AlertContext';
import { userService } from '../services/user.service';
import api from '../services/api';

const FLAG_COLORS: Record<string, string> = {
  verde: '#10B981',
  amarilla: '#F59E0B',
  naranja: '#F97316',
  roja: '#EF4444',
  ninguna: '#6B7280'
};
const FLAG_ICONS: Record<string, string> = {
  verde: '🟢',
  amarilla: '🟡',
  naranja: '🟠',
  roja: '🔴',
  ninguna: '⚪'
};

export default function PerfilScreen({ route }: any) {
  const { showAlert } = useAlert();
  const handleLogout = route.params?.handleLogout || (() => {});
  const user = route.params?.user || {
    nombre: 'Joaquín',
    apellido: 'López',
    email: 'joaquin@bitnets.cl',
    rol: 'operario',
    licenciaAlDia: true,
    fechaVencimientoLicencia: '2026-08-15T00:00:00.000Z',
  };

  const defaultAvatar = `https://ui-avatars.com/api/?name=${user.nombre}+${user.apellido}&background=3D9FD3&color=fff&size=256`;
  const [avatarUri, setAvatarUri] = useState<string>(defaultAvatar);
  const [uploading, setUploading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [scanningLicense, setScanningLicense] = useState(false);

  // Edit states
  const [departamento, setDepartamento] = useState(user.departamento || '');
  const [telefono, setTelefono] = useState(user.telefono || '');
  
  // Real license validation based on v2 model
  const [licenciaEstado, setLicenciaEstado] = useState(user.licenciaEstado || (user.licenciaAlDia ? 'vigente' : 'vencida'));
  const [fechaVencimiento, setFechaVencimiento] = useState(user.licenciaVencimiento || user.fechaVencimientoLicencia);
  const [licenciaFotoUrl, setLicenciaFotoUrl] = useState(user.licenciaFotoUrl || null);
  const [showLicenciaModal, setShowLicenciaModal] = useState(false);
  const isLicenciaValida = licenciaEstado === 'vigente' && fechaVencimiento && new Date(fechaVencimiento) > new Date();
  const [flags, setFlags] = useState<any[]>([]);
  const banderaActual = user.banderaActual || 'ninguna';

  useEffect(() => {
    const userId = user.id || user._id;
    if (userId) {
      userService.getUserFlags(userId)
        .then(res => setFlags(res))
        .catch(err => console.error('Error cargando banderas', err));
    }
  }, [user.id, user._id]);

  const handleChangePhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Permiso denegado', 'Necesitamos acceso a tu galería para cambiar la foto.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      setUploading(true);
      setAvatarUri(result.assets[0].uri);
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    const userId = user.id || user._id;
    if (!userId) return;
    setSavingProfile(true);
    try {
      // Usarían import api from '../services/api'
      // await api.patch(`/users/${userId}/perfil`, { departamento, telefono });
      showAlert('Éxito', 'Perfil actualizado correctamente.');
    } catch (error) {
      showAlert('Error', 'No se pudo actualizar el perfil.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleScanLicense = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Permiso denegado', 'Necesitamos acceso a la cámara para escanear tu licencia.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      setScanningLicense(true);
      try {
        const formData = new FormData();
        formData.append('imagen', {
          uri: result.assets[0].uri,
          name: 'licencia.jpg',
          type: 'image/jpeg'
        } as any);
        const userId = user.id || user._id;
        const res = await api.patch(`/users/${userId}/licencia`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setLicenciaEstado(res.data.user.licenciaEstado);
        setFechaVencimiento(res.data.user.licenciaVencimiento);
        setLicenciaFotoUrl(res.data.user.licenciaFotoUrl);
        showAlert('Éxito', res.data.message);
        setScanningLicense(false);
      } catch (error: any) {
        setScanningLicense(false);
        const msg = error.response?.data?.message ?? 'No se pudo procesar la licencia.';
        showAlert('Error', msg);
      }
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* HEADER SECTION */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleChangePhoto} style={styles.avatarContainer}>
          {uploading ? (
            <View style={styles.avatarLoading}>
              <ActivityIndicator color={COLORS.white} />
            </View>
          ) : (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          )}
          <View style={styles.cameraOverlay}>
            <Ionicons name="camera" size={16} color="#fff" />
          </View>
        </TouchableOpacity>
        <Text style={styles.name}>{user.nombre} {user.apellido}</Text>
        <Text style={styles.email}>{user.email}</Text>
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{user.rol.toUpperCase()}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: FLAG_COLORS[banderaActual] + '20' }]}>
            <Text style={[styles.badgeText, { color: FLAG_COLORS[banderaActual] }]}>
              {FLAG_ICONS[banderaActual]} {banderaActual.toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      {/* MODAL PARA VER LICENCIA */}
      <Modal visible={showLicenciaModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Licencia Subida</Text>
              <TouchableOpacity onPress={() => setShowLicenciaModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            {licenciaFotoUrl ? (
              <Image source={{ uri: licenciaFotoUrl }} style={{ width: '100%', height: 200, resizeMode: 'contain', borderRadius: 10, marginTop: 10 }} />
            ) : (
              <Text style={{ textAlign: 'center', marginTop: 20, color: COLORS.textMuted }}>No hay foto disponible</Text>
            )}
          </View>
        </View>
      </Modal>

      {/* USER DATA SECTION */}
      <View style={styles.dataCard}>
        <Text style={styles.sectionTitle}>Datos Personales</Text>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Departamento:</Text>
          <Text style={styles.infoValue}>{user.departamento || 'No asignado'}</Text>
        </View>

        <View style={[styles.infoRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
          <Text style={styles.infoLabel}>Teléfono:</Text>
          <Text style={styles.infoValue}>{user.telefono || 'No asignado'}</Text>
        </View>
      </View>

      {/* LICENSE STATUS SECTION */}
      <View style={[styles.licenseCard, isLicenciaValida ? styles.licenseValid : styles.licenseInvalid]}>
        <View style={styles.licenseHeader}>
          <Ionicons name="card" size={24} color={isLicenciaValida ? COLORS.success : COLORS.danger} />
          <Text style={[styles.licenseTitle, { color: isLicenciaValida ? COLORS.success : COLORS.danger }]}>
            Estado de Licencia
          </Text>
        </View>
        
        {isLicenciaValida ? (
          <View>
            <Text style={styles.licenseStatus}>✅ VIGENTE</Text>
            <Text style={styles.licenseDate}>
              Vence el: {fechaVencimiento ? new Date(fechaVencimiento).toLocaleDateString() : 'N/A'}
            </Text>
          </View>
        ) : (
          <View>
            <Text style={[styles.licenseStatus, { color: COLORS.danger }]}>❌ VENCIDA O INVÁLIDA</Text>
            <Text style={[styles.licenseDate, { color: COLORS.danger }]}>No puedes solicitar nuevas reservas de vehículos.</Text>
          </View>
        )}
        
        {licenciaFotoUrl ? (
          <TouchableOpacity 
            style={[styles.scanBtn, { backgroundColor: COLORS.textMuted, marginBottom: 10 }]} 
            onPress={() => setShowLicenciaModal(true)}
          >
            <Ionicons name="eye-outline" size={20} color={COLORS.white} />
            <Text style={styles.scanBtnText}>Ver Licencia Subida</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity 
          style={styles.scanBtn} 
          onPress={handleScanLicense}
          disabled={scanningLicense}
        >
          {scanningLicense ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <Ionicons name="scan-outline" size={20} color={COLORS.white} />
              <Text style={styles.scanBtnText}>{licenciaFotoUrl ? 'Renovar Licencia (IA)' : 'Escanear Licencia (IA)'}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* ACTIONS SECTION */}
      <TouchableOpacity style={styles.actionBtn} onPress={handleChangePhoto}>
        <Ionicons name="image-outline" size={20} color={COLORS.text} />
        <Text style={styles.actionBtnText}>Cambiar foto de perfil</Text>
        <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} style={styles.actionIconRight} />
      </TouchableOpacity>

      <View style={styles.sectionHeader}>
        <Ionicons name="flag" size={24} color={COLORS.primary} style={{ marginRight: 10 }} />
        <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Historial de Banderas</Text>
      </View>
      <View style={styles.dataCard}>
        {flags.length === 0 ? (
          <Text style={styles.emptyText}>No tienes banderas registradas en tu historial.</Text>
        ) : (
          flags.map((flag, idx) => (
            <View key={flag._id || idx} style={[styles.flagItem, idx !== flags.length - 1 && styles.borderBottom]}>
              <Text style={styles.flagIcon}>{FLAG_ICONS[flag.tipo]}</Text>
              <View style={styles.flagInfo}>
                <Text style={styles.flagType}>
                  Bandera {flag.tipo.toUpperCase()}
                  {flag.asignadoPor === 'admin' ? ' (Manual)' : ' (Auto)'}
                </Text>
                <Text style={styles.flagReason}>{flag.motivo}</Text>
                <Text style={styles.flagDate}>
                  {new Date(flag.createdAt).toLocaleDateString()} - {new Date(flag.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#fff" />
        <Text style={styles.logoutBtnText}>Cerrar Sesión</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    padding: 20,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
  },
  avatarContainer: {
    marginBottom: 12,
    position: 'relative',
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  avatarLoading: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  cameraOverlay: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  email: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 8,
  },
  badge: {
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 5,
  },
  badgeText: {
    color: COLORS.primary,
    fontWeight: 'bold',
    fontSize: 12,
  },
  licenseCard: {
    width: '100%',
    backgroundColor: COLORS.white,
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  licenseValid: {
    borderColor: COLORS.success,
  },
  licenseInvalid: {
    borderColor: COLORS.danger,
  },
  licenseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  licenseTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  licenseStatus: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: COLORS.text,
  },
  licenseDate: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: COLORS.white,
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  actionBtnText: {
    marginLeft: 15,
    fontSize: 16,
    color: COLORS.text,
    flex: 1,
  },
  actionIconRight: {
    marginLeft: 'auto',
  },
  logoutBtn: {
    flexDirection: 'row',
    marginTop: 15,
    backgroundColor: COLORS.danger,
    padding: 15,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 10,
  },
  dataCard: {
    width: '100%',
    backgroundColor: COLORS.white,
    marginTop: 15,
    marginBottom: 20,
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginTop: 10,
    marginBottom: -5,
  },
  flagItem: {
    flexDirection: 'row',
    padding: 15,
  },
  flagIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  flagInfo: {
    flex: 1,
  },
  flagType: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  flagReason: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 4,
  },
  flagDate: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  emptyText: {
    color: COLORS.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
    padding: 15,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  infoValue: {
    fontSize: 16,
    color: COLORS.textMuted,
  },
  label: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 5,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
    color: COLORS.text,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveBtnText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryDark,
    padding: 12,
    borderRadius: 8,
    marginTop: 15,
  },
  scanBtnText: {
    color: COLORS.white,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 20,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  }
});
